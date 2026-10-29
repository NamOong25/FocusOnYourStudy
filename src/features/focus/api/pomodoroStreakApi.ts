import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from './pomodoroApi';
import { dailyKey, pomodoroDay, shiftPomodoroDay, validPomodoroDate } from './pomodoroInsightsApi';

export type StreakQuery = { timeZone: string; month?: string };
export type StreakDay = { date: string; from: string; to: string; studied: boolean; completedSessions: number; studyMillis: number; studySeconds: number };
export type PomodoroStreak = { today: string; timeZone: string; currentStreakDays: number; longestStreakDays: number; totalStudiedDays: number; studiedToday: boolean;
  firstStudyDate: string | null; lastStudyDate: string | null; currentStreakStartDate: string | null; currentStreakEndDate: string | null;
  longestStreakStartDate: string | null; longestStreakEndDate: string | null;
  calendar: { month: string; fromDate: string; toDate: string; from: string; to: string; studiedDays: number; completedSessions: number; studyMillis: number; studySeconds: number; days: StreakDay[] } };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const invalid = () => new ApiError('Dữ liệu chuỗi ngày chưa hợp lệ. Hãy tải lại để đối chiếu.', 'INVALID_RESPONSE');
const inputError = () => new ApiError('Chọn tháng và múi giờ hợp lệ để xem lịch học.', 'INVALID_POMODORO_STREAK_FILTER');
export function monthDays(month: string) {
  if (typeof month !== 'string' || !/^(19|20)\d\d-(0[1-9]|1[0-2])$/.test(month)) throw inputError();
  const first = month + '-01', count = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) , 0)).getUTCDate();
  return Array.from({ length: count }, (_, i) => shiftPomodoroDay(first, i));
}
export function shiftStreakMonth(month: string, direction: -1 | 1) {
  monthDays(month);
  const value = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + direction, 1)).toISOString().slice(0, 7);
  monthDays(value); return value;
}
export function streakKey(q: StreakQuery) {
  if (!q) throw inputError();
  try { dailyKey({ date: '2000-01-01', timeZone: q.timeZone }); if (q.month !== undefined) monthDays(q.month); } catch { throw inputError(); }
  return JSON.stringify([q.timeZone, q.month ?? null]);
}
function instant(v: unknown): v is string { return typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(v) && Number.isFinite(Date.parse(v)); }
function totals(v: Record<string, unknown>) {
  if (!integer(v.completedSessions) || !integer(v.studyMillis) || !integer(v.studySeconds) || !Number.isSafeInteger(v.completedSessions * 1500000)
    || v.studyMillis !== v.completedSessions * 1500000 || v.studySeconds !== v.studyMillis / 1000) throw invalid();
  return { completedSessions: v.completedSessions, studyMillis: v.studyMillis, studySeconds: v.studySeconds };
}
export function parseStreak(v: unknown, q: StreakQuery): PomodoroStreak {
  streakKey(q);
  if (!record(v) || !validPomodoroDate(v.today) || v.timeZone !== q.timeZone || !integer(v.currentStreakDays) || !integer(v.longestStreakDays) || !integer(v.totalStudiedDays, 0, 73049)
    || v.currentStreakDays > v.longestStreakDays || v.longestStreakDays > v.totalStudiedDays || typeof v.studiedToday !== 'boolean' || !record(v.calendar)) throw invalid();
  const fields = ['firstStudyDate', 'lastStudyDate', 'currentStreakStartDate', 'currentStreakEndDate', 'longestStreakStartDate', 'longestStreakEndDate'] as const;
  for (const field of fields) if (v[field] !== null && (!validPomodoroDate(v[field]) || (v[field] as string) > v.today)) throw invalid();
  const first = v.firstStudyDate as string | null, last = v.lastStudyDate as string | null;
  if (v.totalStudiedDays === 0 ? first !== null || last !== null || v.studiedToday : first === null || last === null || first > last) throw invalid();
  if (v.totalStudiedDays && (!v.longestStreakDays || !first || !last || (v.totalStudiedDays === 1 && first !== last)
    || v.totalStudiedDays > (Date.parse(last + 'T00:00:00Z') - Date.parse(first + 'T00:00:00Z')) / 86400000 + 1)) throw invalid();
  if (v.studiedToday !== (last === v.today) || (v.studiedToday && v.currentStreakDays === 0)) throw invalid();
  for (const [count, startKey, endKey] of [[v.currentStreakDays, 'currentStreakStartDate', 'currentStreakEndDate'], [v.longestStreakDays, 'longestStreakStartDate', 'longestStreakEndDate']] as const) {
    const start = v[startKey] as string | null, end = v[endKey] as string | null;
    if (!count ? start !== null || end !== null : !start || !end || !first || !last || start < first || end > last || start > end || (count === 1 && start !== end)
      || count > (Date.parse(end + 'T00:00:00Z') - Date.parse(start + 'T00:00:00Z')) / 86400000 + 1) throw invalid();
  }
  if (v.currentStreakDays && v.currentStreakEndDate !== last) throw invalid();
  const c = v.calendar, month = q.month ?? v.today.slice(0, 7), dates = monthDays(month);
  if (c.month !== month || c.fromDate !== dates[0] || c.toDate !== dates[dates.length - 1] || !instant(c.from) || !instant(c.to)
    || !integer(c.studiedDays) || !Array.isArray(c.days) || c.days.length !== dates.length) throw invalid();
  const summary = totals(c);
  const days: StreakDay[] = c.days.map((item: unknown, i) => {
    if (!record(item) || item.date !== dates[i] || !instant(item.from) || !instant(item.to) || typeof item.studied !== 'boolean') throw invalid();
    const count = totals(item), date = item.date as string, from = Date.parse(item.from), to = Date.parse(item.to);
    if (to < from || to - from > 172800000 || item.studied !== (count.completedSessions > 0) || (date > v.today! && item.studied)
      || (item.studied && (!first || !last || date < first || date > last))) throw invalid();
    if (from === to ? count.completedSessions !== 0 || pomodoroDay(from - 1, q.timeZone) >= date || pomodoroDay(from, q.timeZone) <= date
      : pomodoroDay(from, q.timeZone) !== date || pomodoroDay(to - 1, q.timeZone) !== date || pomodoroDay(from - 1, q.timeZone) >= date || pomodoroDay(to, q.timeZone) <= date) throw invalid();
    return { date, from: item.from, to: item.to, studied: item.studied, ...count };
  });
  for (let i = 0; i < days.length; i++) if (days[i]!.from !== (i ? days[i - 1]!.to : c.from)) throw invalid();
  if (days[days.length - 1]!.to !== c.to || days.filter(d => d.studied).length !== c.studiedDays || c.studiedDays > v.totalStudiedDays) throw invalid();
  for (const field of ['completedSessions', 'studyMillis', 'studySeconds'] as const) {
    const sum = days.reduce((sum, d) => sum + d[field], 0); if (!Number.isSafeInteger(sum) || sum !== summary[field]) throw invalid();
  }
  const today = days.find(d => d.date === v.today); if (today && today.studied !== v.studiedToday) throw invalid();
  return { today: v.today, timeZone: q.timeZone, currentStreakDays: v.currentStreakDays, longestStreakDays: v.longestStreakDays, totalStudiedDays: v.totalStudiedDays, studiedToday: v.studiedToday,
    firstStudyDate: first, lastStudyDate: last, currentStreakStartDate: v.currentStreakStartDate as string | null, currentStreakEndDate: v.currentStreakEndDate as string | null,
    longestStreakStartDate: v.longestStreakStartDate as string | null, longestStreakEndDate: v.longestStreakEndDate as string | null,
    calendar: { month, fromDate: c.fromDate as string, toDate: c.toDate as string, from: c.from, to: c.to, studiedDays: c.studiedDays, ...summary, days } };
}
export function createStreakApi(baseUrl: string, authorized: Authorized, options: Parameters<typeof createHttpClient>[1] = {}) {
  const request = createHttpClient(baseUrl, options);
  return { async read(q: StreakQuery, signal?: AbortSignal) {
    streakKey(q); const params = new URLSearchParams({ timeZone: q.timeZone }); if (q.month) params.set('month', q.month);
    return parseStreak(await authorized(token => request<unknown>('/api/v1/pomodoro-streak?' + params, { signal, headers: { Authorization: `Bearer ${token}` } }), signal), q);
  } };
}
