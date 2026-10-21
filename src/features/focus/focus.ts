import type { StudySession } from '../study/learning';
import { addDays, dateKey } from '../../shared/utils/dates';

export const focusDurations = [1500, 300, 900] as const;
export const defaultFocusGoal = 4;
export const maxFocusGoal = 12;

// Names are snapshots: renaming/deleting a course or task does not rewrite history.
export type FocusContext = {
  courseId: string;
  courseName: string;
  taskId?: string;
  taskTitle?: string;
  studySessionId?: string;
  studyTitle?: string;
};
export type FocusRecord = FocusContext & {
  id: string;
  startedAt: number;
  endedAt: number;
  studySeconds: number;
  pausedSeconds: number;
  source: 'timer' | 'sample';
};
type Timer = {
  mode: number;
  remainingMs: number;
  endsAt: number | null;
  id?: string;
  startedAt?: number;
  context?: FocusContext;
};
export type FocusState = {
  timer: Timer;
  records: FocusRecord[];
  goal: number;
  lastCompletion?: { id: string; mode: number };
};
type Action =
  | { type: 'tick'; now: number }
  | { type: 'toggle'; now: number; id: string; context: FocusContext }
  | { type: 'reset'; now: number }
  | { type: 'mode'; now: number; mode: number }
  | { type: 'goal'; goal: number };

function idleTimer(mode = 0): Timer {
  return { mode, remainingMs: focusDurations[mode]! * 1000, endsAt: null };
}
export function createFocusState(records: FocusRecord[] = []): FocusState {
  return { timer: idleTimer(), records, goal: defaultFocusGoal };
}

// Completion uses the deadline, even if the foreground callback arrives much later.
// A finished timer has no deadline, so repeated ticks cannot complete it twice.
function settle(state: FocusState, now: number): FocusState {
  const timer = state.timer;
  if (timer.endsAt === null) return state;
  const remainingMs = Math.max(0, timer.endsAt - now);
  if (remainingMs) return remainingMs === timer.remainingMs ? state : { ...state, timer: { ...timer, remainingMs } };
  const records = [...state.records];
  if (timer.mode === 0 && timer.id && timer.context && timer.startedAt !== undefined && !records.some(r => r.id === timer.id)) {
    const studySeconds = focusDurations[0];
    records.unshift({ ...timer.context, id: timer.id, startedAt: timer.startedAt, endedAt: timer.endsAt,
      studySeconds, pausedSeconds: Math.max(0, Math.round((timer.endsAt - timer.startedAt) / 1000 - studySeconds)), source: 'timer' });
  }
  return { ...state, records, timer: { ...timer, remainingMs: 0, endsAt: null }, lastCompletion: { id: timer.id!, mode: timer.mode } };
}

export function focusReducer(state: FocusState, action: Action): FocusState {
  if (action.type === 'goal') return Number.isInteger(action.goal) && action.goal >= 1 && action.goal <= maxFocusGoal ? { ...state, goal: action.goal } : state;
  if (action.type === 'mode' && ![0, 1, 2].includes(action.mode)) return state;
  const next = settle(state, action.now);
  if (action.type === 'tick') return next;
  if (action.type === 'reset' || action.type === 'mode') return { ...next, timer: idleTimer(action.type === 'mode' ? action.mode : next.timer.mode) };
  const timer = next.timer;
  if (state.timer.endsAt !== null && timer.endsAt === null) return next; // expired while pressing Pause
  if (timer.endsAt !== null) return { ...next, timer: { ...timer, endsAt: null } };
  if (!timer.id || timer.remainingMs === 0) {
    const fresh = idleTimer(timer.mode);
    return { ...next, timer: { ...fresh, id: action.id, context: { ...action.context }, startedAt: action.now, endsAt: action.now + fresh.remainingMs } };
  }
  // Resume the same run and its original context; paused wall time is excluded.
  return { ...next, timer: { ...timer, endsAt: action.now + timer.remainingMs } };
}

export function uniqueFocusRecords(records: FocusRecord[], now: Date): FocusRecord[] {
  const ids = new Set<string>();
  return records.filter(r => {
    if (ids.has(r.id) || r.endedAt > now.getTime()) return false;
    ids.add(r.id); return true;
  }).sort((a, b) => b.endedAt - a.endedAt);
}
export function groupFocusRecords(records: FocusRecord[], now: Date) {
  const groups = new Map<string, FocusRecord[]>();
  for (const record of uniqueFocusRecords(records, now)) {
    const day = dateKey(new Date(record.endedAt));
    groups.set(day, [...(groups.get(day) ?? []), record]);
  }
  return [...groups].map(([day, entries]) => ({ day, entries, seconds: entries.reduce((sum, r) => sum + r.studySeconds, 0) }));
}
export function focusSummary(records: FocusRecord[], goal: number, now: Date) {
  const entries = uniqueFocusRecords(records, now), today = dateKey(now);
  const days = new Set(entries.map(r => dateKey(new Date(r.endedAt))));
  const todayRecords = entries.filter(r => dateKey(new Date(r.endedAt)) === today);
  const weekStart = dateKey(addDays(now, -6));
  let cursor = days.has(today) ? now : addDays(now, -1), streak = 0;
  while (days.has(dateKey(cursor))) { streak++; cursor = addDays(cursor, -1); }
  return {
    completed: todayRecords.length,
    todayMinutes: Math.floor(todayRecords.reduce((sum, r) => sum + r.studySeconds, 0) / 60),
    weekMinutes: Math.floor(entries.filter(r => dateKey(new Date(r.endedAt)) >= weekStart).reduce((sum, r) => sum + r.studySeconds, 0) / 60),
    progress: Math.min(100, todayRecords.length / goal * 100),
    remaining: Math.max(0, goal - todayRecords.length),
    streak,
    studiedToday: days.has(today),
    days: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(now, index - 6);
      return { key: dateKey(date), date, studied: days.has(dateKey(date)), today: dateKey(date) === today };
    }),
  };
}
export function focusClock(timestamp: number) {
  const date = new Date(timestamp);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function creditFocusRecords(sessions: StudySession[], records: FocusRecord[]): StudySession[] {
  return sessions.map(session => {
    const seconds = records.filter(r => r.source === 'timer' && r.studySessionId === session.id).reduce((sum, r) => sum + r.studySeconds, 0);
    if (!seconds) return session;
    const focusedSeconds = session.focusedSeconds + seconds;
    return { ...session, focusedSeconds, status: session.status === 'Hoàn thành' || focusedSeconds >= session.duration * 60 ? 'Hoàn thành' : 'Đang học' };
  });
}
export function sampleFocusRecords(context: FocusContext, now: Date): FocusRecord[] {
  return [1, 2, 3].map(offset => {
    const date = addDays(now, -offset); date.setHours(19, 0, 0, 0);
    return { ...context, id: `sample-focus-${offset}`, startedAt: date.getTime(), endedAt: date.getTime() + 1500000, studySeconds: 1500, pausedSeconds: 0, source: 'sample' };
  });
}
