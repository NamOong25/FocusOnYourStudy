import { ApiError, createHttpClient } from '../../../shared/api/http';
import { isValidDate, parseDay } from '../../../shared/utils/dates';
import type { Authorized } from '../../academics/api/semestersApi';
import { validTimeZone, zonedDay } from '../../study/studyTime';

export type ScheduleQuery = { semesterId: string; from: string; to: string };
export type ServerOccurrence = { scheduleId: string; courseId: string; date: string; startTime: string; endTime: string;
  timeZone: string; startsAt: string; endsAt: string; room: string; teacher: string; reminderMinutes: number; notes: string;
  scheduleVersion: number; cancelled: boolean; changed: boolean; reason: string; exceptionId: string | null };
export type ServerRule = { id: string; courseId: string; weekdays: number[]; startsOn: string; endsOn: string;
  startTime: string; endTime: string; timeZone: string; room: string; teacher: string; reminderMinutes: number; notes: string; version: number };
export type RuleInput = Omit<ServerRule, 'id' | 'version'>;
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const validId = (v: unknown): v is string => typeof v === 'string' && uuid.test(v);
const day = (v: unknown): v is string => typeof v === 'string' && v >= '1900-01-01' && v <= '2099-12-31' && isValidDate(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
const version = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const time = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const daysBetween = (a: string, b: string) => (Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000;
const invalid = () => new ApiError('Dữ liệu lịch học chưa hợp lệ. Hãy tải lại lịch.', 'INVALID_RESPONSE');
function record(v: unknown): v is Record<string, unknown> { return typeof v === 'object' && v !== null && !Array.isArray(v); }
function base(v: Record<string, unknown>) {
  return validId(v.courseId) && time(v.startTime) && time(v.endTime) && v.startTime < v.endTime
    && typeof v.timeZone === 'string' && validTimeZone(v.timeZone) && text(v.room, 100) && text(v.teacher, 200)
    && text(v.notes, 5000) && Number.isInteger(v.reminderMinutes) && Number(v.reminderMinutes) >= 0 && Number(v.reminderMinutes) <= 10080;
}
function zonedTime(at: number, zone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  return parts.find(p => p.type === 'hour')!.value + ':' + parts.find(p => p.type === 'minute')!.value;
}
function instant(value: unknown) { return typeof value === 'string' && /T.*Z$/.test(value) ? Date.parse(value) : NaN; }
export function queryKey(q: ScheduleQuery) {
  if (!validId(q.semesterId) || !day(q.from) || !day(q.to) || daysBetween(q.from, q.to) < 0 || daysBetween(q.from, q.to) > 91)
    throw new ApiError('Chọn học kỳ và khoảng lịch hợp lệ, tối đa 92 ngày.', 'INVALID_CLASS_RANGE');
  return `${q.semesterId}:${q.from}:${q.to}`;
}
function occurrence(value: unknown): ServerOccurrence {
  if (!record(value) || !base(value) || !validId(value.scheduleId) || !day(value.date) || !version(value.scheduleVersion)
    || typeof value.cancelled !== 'boolean' || typeof value.changed !== 'boolean' || value.cancelled && value.changed
    || !text(value.reason, 1000) || !(value.cancelled || value.changed ? validId(value.exceptionId) : value.exceptionId === null && value.reason === '')) throw invalid();
  const v = value as unknown as ServerOccurrence, start = instant(v.startsAt), end = instant(v.endsAt);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end || start < Date.UTC(1900, 0, 1) || end >= Date.UTC(2100, 0, 1)
    || zonedDay(start, v.timeZone) !== v.date || zonedDay(end, v.timeZone) !== v.date
    || zonedTime(start, v.timeZone) !== v.startTime || zonedTime(end, v.timeZone) !== v.endTime) throw invalid();
  return { scheduleId: v.scheduleId, courseId: v.courseId, date: v.date, startTime: v.startTime, endTime: v.endTime, timeZone: v.timeZone,
    startsAt: v.startsAt, endsAt: v.endsAt, room: v.room, teacher: v.teacher, reminderMinutes: v.reminderMinutes, notes: v.notes,
    scheduleVersion: v.scheduleVersion, cancelled: v.cancelled, changed: v.changed, reason: v.reason, exceptionId: v.exceptionId };
}
function rule(value: unknown): ServerRule {
  if (!record(value) || !base(value) || !validId(value.id) || !version(value.version) || !day(value.startsOn) || !day(value.endsOn)
    || daysBetween(value.startsOn, value.endsOn) < 0 || daysBetween(value.startsOn, value.endsOn) > 365
    || !Array.isArray(value.weekdays) || !value.weekdays.length || value.weekdays.some(d => !Number.isInteger(d) || d < 1 || d > 7)
    || new Set(value.weekdays).size !== value.weekdays.length) throw invalid();
  const v = value as unknown as ServerRule;
  return { id: v.id, courseId: v.courseId, weekdays: [...v.weekdays], startsOn: v.startsOn, endsOn: v.endsOn,
    startTime: v.startTime, endTime: v.endTime, timeZone: v.timeZone, room: v.room, teacher: v.teacher, reminderMinutes: v.reminderMinutes, notes: v.notes, version: v.version };
}
export function ruleInput(input: RuleInput): RuleInput {
  let value: ServerRule;
  try { value = rule({ ...input, id: '00000000-0000-4000-8000-000000000000', version: 0,
    room: input.room.trim(), teacher: input.teacher.trim(), notes: input.notes.trim(), timeZone: input.timeZone.trim() }); }
  catch { throw new ApiError('Kiểm tra môn, thứ, khoảng ngày tối đa 366 ngày, giờ kết thúc, múi giờ và mốc nhắc.', 'INVALID_CLASS_INPUT', 400); }
  let matched = false;
  for (let day = parseDay(value.startsOn); day <= parseDay(value.endsOn); day.setDate(day.getDate() + 1)) {
    if (value.weekdays.includes(day.getDay() || 7)) { matched = true; break; }
  }
  if (!matched) throw new ApiError('Khoảng ngày áp dụng cần có ít nhất một buổi đúng thứ đã chọn.', 'INVALID_CLASS_INPUT', 400);
  const { id, version: ignored, ...body } = value;
  return { ...body, weekdays: [...body.weekdays].sort((a, b) => a - b) };
}
function expectedVersion(original: ServerRule) {
  if (!validId(original.id) || !version(original.version)) throw new ApiError('Nạp bản lịch mới nhất trước khi sửa hoặc xóa.', 'CLASS_SCHEDULE_VERSION_CONFLICT', 409);
  return original.version;
}
export function createScheduleApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options), headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async rules(semesterId?: string, signal?: AbortSignal) {
      if (semesterId !== undefined && !validId(semesterId)) throw new ApiError('Chọn học kỳ hợp lệ.', 'INVALID_CLASS_INPUT');
      const rows = await authorized(token => http<unknown>('/api/v1/class-schedules' + (semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : ''), { headers: headers(token), signal }), signal);
      if (!Array.isArray(rows)) throw invalid();
      const result = rows.map(rule);
      if (new Set(result.map(r => r.id)).size !== result.length) throw invalid();
      return result;
    },
    async readRule(id: string, signal?: AbortSignal) {
      if (!validId(id)) throw invalid();
      const value = rule(await authorized(token => http<unknown>(`/api/v1/class-schedules/${encodeURIComponent(id)}`, { headers: headers(token), signal }), signal));
      if (value.id !== id) throw invalid();
      return value;
    },
    async save(input: RuleInput, original?: ServerRule) {
      const expected = original ? expectedVersion(original) : undefined, body = ruleInput(input);
      const value = rule(await authorized(token => http<unknown>('/api/v1/class-schedules' + (original ? '/' + encodeURIComponent(original.id) : ''), {
        method: original ? 'PUT' : 'POST', headers: headers(token), body: { ...body, ...(original ? { version: expected } : {}) },
      })));
      if (original && (value.id !== original.id || value.version < original.version) || value.courseId !== body.courseId) throw invalid();
      return value;
    },
    async remove(original: ServerRule) {
      const expected = expectedVersion(original);
      await authorized(token => http<void>(`/api/v1/class-schedules/${encodeURIComponent(original.id)}?version=${expected}`, { method: 'DELETE', empty: true, headers: headers(token) }));
    },
    async list(q: ScheduleQuery, signal?: AbortSignal) {
      queryKey(q);
      const path = `/api/v1/class-schedules/occurrences?semesterId=${encodeURIComponent(q.semesterId)}&from=${q.from}&to=${q.to}`;
      const rows = await authorized(token => http<unknown>(path, { headers: headers(token), signal }), signal);
      if (!Array.isArray(rows)) throw invalid();
      const result = rows.map(occurrence), seen = new Set<string>(), versions = new Map<string, number>();
      for (const item of result) {
        const key = `${item.scheduleId}:${item.date}`;
        if (item.date < q.from || item.date > q.to || seen.has(key) || versions.has(item.scheduleId) && versions.get(item.scheduleId) !== item.scheduleVersion) throw invalid();
        seen.add(key); versions.set(item.scheduleId, item.scheduleVersion);
      }
      return result.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.scheduleId.localeCompare(b.scheduleId));
    },
    async get(selected: ServerOccurrence, signal?: AbortSignal) {
      if (!validId(selected.scheduleId)) throw invalid();
      const value = rule(await authorized(token => http<unknown>(`/api/v1/class-schedules/${encodeURIComponent(selected.scheduleId)}`, { headers: headers(token), signal }), signal));
      if (value.id !== selected.scheduleId || value.courseId !== selected.courseId || value.version !== selected.scheduleVersion)
        throw new ApiError('Lịch đã thay đổi từ lúc mở danh sách. Tải lại lịch để xem buổi mới nhất.', 'CLASS_SCHEDULE_VERSION_CONFLICT', 409);
      const isoDay = parseDay(selected.date).getDay() || 7;
      if (selected.date < value.startsOn || selected.date > value.endsOn || !value.weekdays.includes(isoDay)) throw invalid();
      return value;
    },
  };
}
