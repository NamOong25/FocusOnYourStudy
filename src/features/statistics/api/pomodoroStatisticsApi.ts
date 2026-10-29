import { ApiError, createHttpClient } from '../../../shared/api/http';
import { uuid, type Authorized } from '../../focus/api/pomodoroApi';
import { dailyKey, pomodoroDay, shiftPomodoroDay, validPomodoroDate } from '../../focus/api/pomodoroInsightsApi';

export type StatisticsPeriod = 'WEEK' | 'MONTH';
export type StatisticsQuery = { period: StatisticsPeriod; date: string; timeZone: string; courseId?: string; semesterId?: string };
type Totals = { completedSessions: number; studyMillis: number; studySeconds: number };
export type StatisticsDay = Totals & { date: string; from: string; to: string };
export type StatisticsCourse = Totals & { courseId: string; courseCode: string; courseName: string; semesterId: string; semesterTerm: number; semesterStartYear: number };
export type PomodoroStatistics = Totals & { period: StatisticsPeriod; date: string; timeZone: string;
  fromDate: string; toDate: string; from: string; to: string; filters: { courseId: string | null; semesterId: string | null };
  days: StatisticsDay[]; courses: StatisticsCourse[] };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v: unknown, max: number): v is string => typeof v === 'string' && !!v.trim() && v.length <= max;
const invalid = () => new ApiError('Số liệu thống kê chưa hợp lệ. Hãy tải lại để đối chiếu.', 'INVALID_RESPONSE');
const inputError = () => new ApiError('Chọn tuần/tháng, ngày và múi giờ hợp lệ trong năm 1900–2099.', 'INVALID_POMODORO_STATISTICS_FILTER');

// Calendar arithmetic stays independent of the device's local zone and DST.
export function statisticsWindow(period: StatisticsPeriod, date: string) {
  if (!['WEEK', 'MONTH'].includes(period) || !validPomodoroDate(date)) throw inputError();
  const anchor = new Date(date + 'T00:00:00Z');
  const first = period === 'WEEK' ? shiftPomodoroDay(date, -(anchor.getUTCDay() + 6) % 7) : date.slice(0, 8) + '01';
  const length = period === 'WEEK' ? 7 : new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length }, (_, i) => shiftPomodoroDay(first, i));
  if (!days.every(validPomodoroDate)) throw inputError();
  return { fromDate: first, toDate: days[days.length - 1]!, days };
}
export function moveStatistics(period: StatisticsPeriod, date: string, direction: -1 | 1) {
  const window = statisticsWindow(period, date);
  const next = period === 'WEEK' ? shiftPomodoroDay(window.fromDate, direction * 7)
    : new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1 + direction, 1)).toISOString().slice(0, 10);
  statisticsWindow(period, next); return next;
}
export function statisticsKey(q: StatisticsQuery) {
  if (!q) throw inputError();
  statisticsWindow(q.period, q.date);
  try { dailyKey({ date: q.date, timeZone: q.timeZone }); } catch { throw inputError(); }
  if ([q.courseId, q.semesterId].some(id => id !== undefined && !uuid(id))) throw inputError();
  return JSON.stringify([q.period, q.date, q.timeZone, q.courseId?.toLowerCase() ?? null, q.semesterId?.toLowerCase() ?? null]);
}
function instant(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(v) && Number.isFinite(Date.parse(v));
}
function totals(v: Record<string, unknown>): Totals {
  if (!integer(v.completedSessions) || !integer(v.studyMillis) || !integer(v.studySeconds)
    || !Number.isSafeInteger(v.completedSessions * 1500000) || v.studyMillis !== v.completedSessions * 1500000 || v.studySeconds !== v.studyMillis / 1000) throw invalid();
  return { completedSessions: v.completedSessions, studyMillis: v.studyMillis, studySeconds: v.studySeconds };
}
export function parseStatistics(v: unknown, q: StatisticsQuery): PomodoroStatistics {
  statisticsKey(q); const window = statisticsWindow(q.period, q.date);
  if (!object(v) || v.period !== q.period || v.date !== q.date || v.timeZone !== q.timeZone
    || v.fromDate !== window.fromDate || v.toDate !== window.toDate || !instant(v.from) || !instant(v.to)
    || !object(v.filters) || v.filters.courseId !== (q.courseId?.toLowerCase() ?? null) || v.filters.semesterId !== (q.semesterId?.toLowerCase() ?? null)
    || !Array.isArray(v.days) || v.days.length !== window.days.length || !Array.isArray(v.courses)) throw invalid();
  const summary = totals(v);
  const days = v.days.map((item: unknown, index): StatisticsDay => {
    if (!object(item) || item.date !== window.days[index] || !instant(item.from) || !instant(item.to)
      || Date.parse(item.from) > Date.parse(item.to) || Date.parse(item.to) - Date.parse(item.from) > 172800000) throw invalid();
    const count = totals(item);
    const start = Date.parse(item.from), end = Date.parse(item.to), date = item.date as string;
    if (start === end ? count.completedSessions !== 0 || pomodoroDay(start - 1, q.timeZone) >= date || pomodoroDay(start, q.timeZone) <= date
      : pomodoroDay(start, q.timeZone) !== date || pomodoroDay(end - 1, q.timeZone) !== date
        || pomodoroDay(start - 1, q.timeZone) >= date || pomodoroDay(end, q.timeZone) <= date) throw invalid();
    return { date: item.date as string, from: item.from, to: item.to, ...count };
  });
  for (let i = 0; i < days.length; i++) if (days[i]!.from !== (i ? days[i - 1]!.to : v.from)) throw invalid();
  if (days[days.length - 1]!.to !== v.to) throw invalid();
  const seen = new Set<string>();
  const courses = v.courses.map((item: unknown): StatisticsCourse => {
    if (!object(item) || !uuid(item.courseId) || !uuid(item.semesterId) || !text(item.courseCode, 64) || !text(item.courseName, 200)
      || !integer(item.semesterTerm, 1, 3) || !integer(item.semesterStartYear, 1900, 2099)
      || (q.courseId && item.courseId !== q.courseId.toLowerCase()) || (q.semesterId && item.semesterId !== q.semesterId.toLowerCase())) throw invalid();
    const count = totals(item), key = item.courseId.toLowerCase() + ':' + item.semesterId.toLowerCase();
    if (seen.has(key) || count.completedSessions === 0) throw invalid(); seen.add(key);
    return { courseId: item.courseId.toLowerCase(), semesterId: item.semesterId.toLowerCase(), courseCode: item.courseCode, courseName: item.courseName,
      semesterTerm: item.semesterTerm, semesterStartYear: item.semesterStartYear, ...count };
  });
  for (const rows of [days, courses]) for (const field of ['completedSessions', 'studyMillis', 'studySeconds'] as const) {
    const sum = rows.reduce((sum, row) => sum + row[field], 0);
    if (!Number.isSafeInteger(sum) || sum !== summary[field]) throw invalid();
  }
  return { period: q.period, date: q.date, timeZone: q.timeZone, fromDate: window.fromDate, toDate: window.toDate, from: v.from, to: v.to,
    filters: { courseId: q.courseId?.toLowerCase() ?? null, semesterId: q.semesterId?.toLowerCase() ?? null }, ...summary, days, courses };
}
export function createStatisticsApi(baseUrl: string, authorized: Authorized, options: Parameters<typeof createHttpClient>[1] = {}) {
  const request = createHttpClient(baseUrl, options);
  return { async read(q: StatisticsQuery, signal?: AbortSignal) {
    statisticsKey(q);
    const params = new URLSearchParams({ period: q.period, date: q.date, timeZone: q.timeZone });
    for (const key of ['courseId', 'semesterId'] as const) if (q[key]) params.set(key, q[key]!.toLowerCase());
    return parseStatistics(await authorized(token => request<unknown>('/api/v1/pomodoro-statistics?' + params,
      { signal, headers: { Authorization: `Bearer ${token}` } }), signal), q);
  } };
}
