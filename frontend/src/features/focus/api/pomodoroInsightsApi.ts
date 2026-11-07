import { ApiError, createHttpClient } from '../../../shared/api/http';
import { parsePomodoro, terminal, uuid, type Authorized, type PomodoroSession } from './pomodoroApi';

export type PomodoroGoal = { dailySessions: number; version: number; persisted: boolean };
export type PomodoroDayQuery = { date: string; timeZone: string };
export type PomodoroDaily = PomodoroDayQuery & { from: string; to: string; goal: PomodoroGoal;
  completedSessions: number; studyMillis: number; studySeconds: number; remainingSessions: number; progressPercent: number; goalReached: boolean };
export type PomodoroHistoryQuery = { page: number; size: number; status?: 'COMPLETED' | 'CANCELLED';
  courseId?: string; semesterId?: string; assignmentId?: string; studySessionId?: string;
  fromDate?: string; toDate?: string; timeZone: string };
export type PomodoroHistory = { items: PomodoroSession[]; page: number; size: number; totalElements: number; totalPages: number };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const invalid = () => new ApiError('Phản hồi mục tiêu hoặc lịch sử chưa hợp lệ. Hãy tải lại dữ liệu đã lưu.', 'INVALID_RESPONSE');
const inputError = () => new ApiError('Kiểm tra khoảng ngày, múi giờ và bộ lọc lịch sử.', 'INVALID_POMODORO_HISTORY_FILTER');
export function validPomodoroDate(v: unknown): v is string {
  return typeof v === 'string' && /^(19|20)\d\d-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
}
function validZone(zone: unknown): zone is string {
  if (typeof zone !== 'string' || !zone || zone.length > 100 || zone.trim() !== zone || /^[+-]/.test(zone)) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(0); return true; } catch { return false; }
}
export function pomodoroDay(date: Date | number, timeZone: string) {
  try {
    const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const part = (type: string) => parts.find(p => p.type === type)?.value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  } catch { return ''; }
}
export function shiftPomodoroDay(date: string, days: number) {
  if (!validPomodoroDate(date) || !Number.isSafeInteger(days)) throw inputError();
  return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10);
}
export function dailyKey(q: PomodoroDayQuery) {
  if (!q || !validPomodoroDate(q.date) || !validZone(q.timeZone)) throw inputError();
  return JSON.stringify([q.date, q.timeZone]);
}
export function historyKey(q: PomodoroHistoryQuery) {
  if (!q || !integer(q.page, 0, 2147483647) || !integer(q.size, 1, 100) || q.page * q.size > 2147483647 || !validZone(q.timeZone)
    || (q.status !== undefined && !['COMPLETED', 'CANCELLED'].includes(q.status))
    || [q.courseId, q.semesterId, q.assignmentId, q.studySessionId].some(id => id !== undefined && !uuid(id))
    || (q.fromDate === undefined) !== (q.toDate === undefined)
    || (q.fromDate !== undefined && (!validPomodoroDate(q.fromDate) || !validPomodoroDate(q.toDate) || q.fromDate > q.toDate!))) throw inputError();
  return JSON.stringify([q.page, q.size, q.status ?? null, q.courseId ?? null, q.semesterId ?? null, q.assignmentId ?? null, q.studySessionId ?? null, q.fromDate ?? null, q.toDate ?? null, q.timeZone]);
}
// PostgreSQL timestamps can retain microseconds. Do not turn different instants
// within one millisecond into an artificial UUID tie when checking sort order.
function ticks(v: unknown): bigint {
  if (typeof v !== 'string') throw invalid();
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,9}))?Z$/.exec(v);
  if (!match || !Number.isFinite(Date.parse(match[1] + 'Z'))) throw invalid();
  return BigInt(Date.parse(match[1] + 'Z')) * 1000000n + BigInt((match[2] ?? '').padEnd(9, '0'));
}
export function parsePomodoroGoal(v: unknown): PomodoroGoal {
  if (!record(v) || !integer(v.dailySessions, 1, 12) || !integer(v.version) || typeof v.persisted !== 'boolean'
    || (v.persisted ? v.version === 0 : v.version !== 0 || v.dailySessions !== 4)) throw invalid();
  return { dailySessions: v.dailySessions, version: v.version, persisted: v.persisted };
}
export function parsePomodoroDaily(v: unknown, q: PomodoroDayQuery): PomodoroDaily {
  dailyKey(q);
  if (!record(v) || v.date !== q.date || v.timeZone !== q.timeZone) throw invalid();
  const from = ticks(v.from), to = ticks(v.to), goal = parsePomodoroGoal(v.goal);
  if (from > to || to - from > 172800000000000n || !integer(v.completedSessions) || !integer(v.studyMillis) || !integer(v.studySeconds)
    || !Number.isSafeInteger(v.completedSessions * 1500000) || v.studyMillis !== v.completedSessions * 1500000 || v.studySeconds !== v.studyMillis / 1000
    || v.remainingSessions !== Math.max(0, goal.dailySessions - v.completedSessions)
    || v.progressPercent !== Math.min(100, Math.floor(v.completedSessions * 100 / goal.dailySessions))
    || v.goalReached !== (v.completedSessions >= goal.dailySessions) || (from === to && v.completedSessions !== 0)) throw invalid();
  return { date: q.date, timeZone: q.timeZone, from: v.from as string, to: v.to as string, goal,
    completedSessions: v.completedSessions, studyMillis: v.studyMillis, studySeconds: v.studySeconds,
    remainingSessions: v.remainingSessions as number, progressPercent: v.progressPercent as number, goalReached: v.goalReached as boolean };
}
export function parsePomodoroHistory(v: unknown, q: PomodoroHistoryQuery, bounds?: { from: string; to: string }): PomodoroHistory {
  historyKey(q);
  if (!record(v) || !Array.isArray(v.items) || v.page !== q.page || v.size !== q.size || !integer(v.totalElements) || !integer(v.totalPages)
    || v.totalPages !== Math.ceil(v.totalElements / q.size) || v.items.length !== Math.min(q.size, Math.max(0, v.totalElements - q.page * q.size))) throw invalid();
  const items = v.items.map(parsePomodoro), ids = new Set<string>();
  let previous: PomodoroSession | undefined;
  for (const row of items) {
    const end = ticks(row.endedAt), id = row.id.toLowerCase();
    if (!terminal(row) || ids.has(id) || (q.status && row.status !== q.status)
      || (bounds && (end < ticks(bounds.from) || end >= ticks(bounds.to)))
      || (previous && (end > ticks(previous.endedAt) || (end === ticks(previous.endedAt) && id > previous.id.toLowerCase())))) throw invalid();
    for (const key of ['courseId', 'semesterId', 'assignmentId', 'studySessionId'] as const) if (q[key] && q[key]!.toLowerCase() !== row.context[key]?.toLowerCase()) throw invalid();
    ids.add(id); previous = row;
  }
  return { items, page: q.page, size: q.size, totalElements: v.totalElements, totalPages: v.totalPages };
}
export function createPomodoroInsightsApi(baseUrl: string, authorized: Authorized, options: Parameters<typeof createHttpClient>[1] = {}) {
  const request = createHttpClient(baseUrl, options), root = '/api/v1/pomodoro-sessions';
  const read = (path: string, signal?: AbortSignal) => authorized(token => request<unknown>(path, { signal, headers: { Authorization: `Bearer ${token}` } }), signal);
  // Cache only immutable calendar bounds, never daily counts or a user's goal.
  const windows = new Map<string, { from: string; to: string }>();
  const daily = async (q: PomodoroDayQuery, signal?: AbortSignal) => {
    dailyKey(q);
    const result = parsePomodoroDaily(await read(`${root}/daily?${new URLSearchParams(q)}`, signal), q);
    const key = dailyKey(q); windows.delete(key); windows.set(key, { from: result.from, to: result.to });
    if (windows.size > 32) windows.delete(windows.keys().next().value!);
    return result;
  };
  const window = async (q: PomodoroDayQuery, signal?: AbortSignal) => windows.get(dailyKey(q)) ?? daily(q, signal);
  return {
    daily,
    async goal(signal?: AbortSignal) { return parsePomodoroGoal(await read('/api/v1/pomodoro-goal', signal)); },
    async saveGoal(input: { dailySessions: number; version: number }, signal?: AbortSignal) {
      if (!integer(input.dailySessions, 1, 12) || !integer(input.version)) throw new ApiError('Chọn mục tiêu từ 1 đến 12 phiên.', 'INVALID_POMODORO_GOAL');
      const goal = parsePomodoroGoal(await authorized(token => request<unknown>('/api/v1/pomodoro-goal', { method: 'PUT', body: { dailySessions: input.dailySessions, version: input.version }, signal, headers: { Authorization: `Bearer ${token}` } }), signal));
      if (!goal.persisted || goal.dailySessions !== input.dailySessions || (goal.version !== input.version && goal.version !== input.version + 1)) throw invalid();
      return goal;
    },
    async history(q: PomodoroHistoryQuery, signal?: AbortSignal): Promise<PomodoroHistory> {
      historyKey(q);
      const params = new URLSearchParams({ page: String(q.page), size: String(q.size) });
      for (const key of ['status', 'courseId', 'semesterId', 'assignmentId', 'studySessionId'] as const) if (q[key]) params.set(key, q[key]!);
      let bounds: { from: string; to: string } | undefined;
      if (q.fromDate && q.toDate) {
        const start = await window({ date: q.fromDate, timeZone: q.timeZone }, signal);
        const end = q.fromDate === q.toDate ? start : await window({ date: q.toDate, timeZone: q.timeZone }, signal);
        bounds = { from: start.from, to: end.to };
        if (ticks(bounds.from) === ticks(bounds.to)) return { items: [], page: q.page, size: q.size, totalElements: 0, totalPages: 0 };
        params.set('from', bounds.from); params.set('to', bounds.to);
      }
      return parsePomodoroHistory(await read(`${root}?${params}`, signal), q, bounds);
    },
  };
}
export type PomodoroInsightsApi = ReturnType<typeof createPomodoroInsightsApi>;
