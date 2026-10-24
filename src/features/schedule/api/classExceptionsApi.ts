import { ApiError, createHttpClient } from '../../../shared/api/http';
import { isValidDate, parseDay } from '../../../shared/utils/dates';
import type { Authorized } from '../../academics/api/semestersApi';
import { createScheduleApi, parseServerOccurrence, type ServerOccurrence, type ServerRule } from './scheduleApi';

export type OccurrenceTarget = { scheduleId: string; date: string };
export type ExceptionInput = { kind: 'CANCELLED' | 'CHANGED'; startTime: string | null; endTime: string | null; room: string | null; teacher: string | null; reason: string };
export type ServerException = ExceptionInput & OccurrenceTarget & { id: string; scheduleVersion: number };
export type ExceptionSnapshot = { rule: ServerRule; occurrence: ServerOccurrence; exception: ServerException | null };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const time = (v: unknown) => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
const version = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const invalid = () => new ApiError('Phản hồi thay đổi buổi học chưa hợp lệ. Hãy đọc lại buổi học.', 'INVALID_RESPONSE');
const stale = () => new ApiError('Chuỗi hoặc buổi học đã đổi trong lúc tải. Đọc lại buổi mới nhất trước khi chỉnh.', 'CLASS_SCHEDULE_VERSION_CONFLICT', 409);
function target(t: OccurrenceTarget) {
  if (!uuid.test(t.scheduleId) || !isValidDate(t.date) || t.date < '1900-01-01' || t.date > '2099-12-31')
    throw new ApiError('Chọn đúng chuỗi và ngày học hợp lệ.', 'INVALID_CLASS_DATE', 400);
  return `/api/v1/class-schedules/${encodeURIComponent(t.scheduleId)}/exceptions/${t.date}`;
}
function raw(value: unknown): ServerException {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v.id !== 'string' || !uuid.test(v.id) || typeof v.scheduleId !== 'string' || !uuid.test(v.scheduleId)
    || typeof v.date !== 'string' || !isValidDate(v.date) || v.date < '1900-01-01' || v.date > '2099-12-31'
    || !['CANCELLED', 'CHANGED'].includes(v.kind as string) || !version(v.scheduleVersion)
    || !(v.startTime === null || time(v.startTime)) || !(v.endTime === null || time(v.endTime))
    || !(v.room === null || typeof v.room === 'string' && v.room.length <= 100) || !(v.teacher === null || typeof v.teacher === 'string' && v.teacher.length <= 200)
    || typeof v.reason !== 'string' || v.reason.length > 1000) throw invalid();
  const hasOverride = [v.startTime, v.endTime, v.room, v.teacher].some(x => x !== null);
  if (v.kind === 'CANCELLED' ? hasOverride : !hasOverride) throw invalid();
  return { id: v.id, scheduleId: v.scheduleId, date: v.date, kind: v.kind as ServerException['kind'], startTime: v.startTime as string | null,
    endTime: v.endTime as string | null, room: v.room as string | null, teacher: v.teacher as string | null, reason: v.reason, scheduleVersion: Number(v.scheduleVersion) };
}
function checkBasis(basis: ExceptionSnapshot) {
  const { rule, occurrence: row, exception } = basis;
  target(row);
  if (rule.id !== row.scheduleId || rule.courseId !== row.courseId || rule.version !== row.scheduleVersion || !version(rule.version)
    || row.exceptionId !== (exception?.id ?? null) || exception && (exception.scheduleId !== rule.id || exception.date !== row.date || exception.scheduleVersion !== rule.version)) throw stale();
}
export function exceptionInput(input: ExceptionInput, rule: ServerRule): ExceptionInput {
  const fail = (message: string): never => { throw new ApiError(message, 'INVALID_CLASS_EXCEPTION', 400); };
  if (!['CANCELLED', 'CHANGED'].includes(input.kind) || typeof input.reason !== 'string' || input.reason.length > 1000) return fail('Lý do tối đa 1000 ký tự.');
  if (!(input.startTime === null || time(input.startTime)) || !(input.endTime === null || time(input.endTime))) return fail('Giờ cần đúng HH:mm.');
  if (!(input.room === null || typeof input.room === 'string' && input.room.length <= 100) || !(input.teacher === null || typeof input.teacher === 'string' && input.teacher.length <= 200)) return fail('Phòng tối đa 100 ký tự; giảng viên tối đa 200 ký tự.');
  const overrides = [input.startTime, input.endTime, input.room, input.teacher].some(v => v !== null);
  if (input.kind === 'CANCELLED' && overrides) return fail('Buổi nghỉ không có thông tin thay thế.');
  if (input.kind === 'CHANGED' && !overrides) return fail('Bật ít nhất một thông tin cần thay đổi riêng cho buổi này.');
  const start = input.startTime ?? rule.startTime, end = input.endTime ?? rule.endTime;
  if (input.kind === 'CHANGED' && start >= end) return fail('Giờ kết thúc thực tế phải sau giờ bắt đầu. Kiểm tra cả giờ đang dùng theo chuỗi.');
  return { kind: input.kind, startTime: input.startTime, endTime: input.endTime, room: input.room === null ? null : input.room.trim(),
    teacher: input.teacher === null ? null : input.teacher.trim(), reason: input.reason.trim() };
}
export function createClassExceptionsApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options), rules = createScheduleApi(baseUrl, authorized, options), headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async readDay(t: OccurrenceTarget, signal?: AbortSignal): Promise<ExceptionSnapshot> {
      const path = target(t), rule = await rules.readRule(t.scheduleId, signal);
      if (t.date < rule.startsOn || t.date > rule.endsOn || !rule.weekdays.includes(parseDay(t.date).getDay() || 7))
        throw new ApiError('Ngày này không còn thuộc chuỗi lịch. Đóng và chọn lại buổi học.', 'CLASS_OCCURRENCE_NOT_FOUND', 404);
      const value = await authorized(token => http<unknown>(`/api/v1/class-schedules/occurrences?courseId=${encodeURIComponent(rule.courseId)}&from=${t.date}&to=${t.date}`, { headers: headers(token), signal }), signal);
      if (!Array.isArray(value)) throw invalid();
      const rows = value.map(parseServerOccurrence), seen = new Set<string>();
      for (const row of rows) { if (row.date !== t.date || row.courseId !== rule.courseId || seen.has(row.scheduleId)) throw invalid(); seen.add(row.scheduleId); }
      const occurrence = rows.find(row => row.scheduleId === t.scheduleId);
      if (!occurrence) throw new ApiError('Không còn buổi học này trong lịch. Đóng và tải lại lịch.', 'CLASS_OCCURRENCE_NOT_FOUND', 404);
      if (occurrence.scheduleVersion !== rule.version) throw stale();
      const exception = occurrence.exceptionId ? raw(await authorized(token => http<unknown>(path, { headers: headers(token), signal }), signal)) : null;
      const snapshot = { rule, occurrence, exception }; checkBasis(snapshot);
      if (occurrence.timeZone !== rule.timeZone || occurrence.notes !== rule.notes || occurrence.reminderMinutes !== rule.reminderMinutes
        || occurrence.startTime !== (exception?.startTime ?? rule.startTime) || occurrence.endTime !== (exception?.endTime ?? rule.endTime)
        || occurrence.room !== (exception?.room ?? rule.room) || occurrence.teacher !== (exception?.teacher ?? rule.teacher)
        || occurrence.reason !== (exception?.reason ?? '') || occurrence.cancelled !== (exception?.kind === 'CANCELLED') || occurrence.changed !== (exception?.kind === 'CHANGED')) throw invalid();
      return snapshot;
    },
    async save(basis: ExceptionSnapshot, input: ExceptionInput) {
      checkBasis(basis); const body = exceptionInput(input, basis.rule), path = target(basis.occurrence);
      const saved = raw(await authorized(token => http<unknown>(path, { method: 'PUT', headers: headers(token), body: { ...body, scheduleVersion: basis.rule.version } })));
      if (saved.scheduleId !== basis.rule.id || saved.date !== basis.occurrence.date || saved.scheduleVersion <= basis.rule.version
        || basis.exception && saved.id !== basis.exception.id || Object.keys(body).some(key => saved[key as keyof ExceptionInput] !== body[key as keyof ExceptionInput])) throw invalid();
      return saved;
    },
    async restore(basis: ExceptionSnapshot) {
      checkBasis(basis);
      if (!basis.exception) throw new ApiError('Buổi đang theo lịch gốc, không có thay đổi riêng để khôi phục.', 'CLASS_EXCEPTION_NOT_FOUND', 404);
      await authorized(token => http<void>(target(basis.occurrence) + `?scheduleVersion=${basis.rule.version}`, { method: 'DELETE', empty: true, headers: headers(token) }));
    },
  };
}
