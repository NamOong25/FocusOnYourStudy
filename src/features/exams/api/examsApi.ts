import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';
import { validTimeZone, zonedDay } from '../../study/studyTime';

export const examKinds = { MIDTERM: 'Giữa kỳ', FINAL: 'Cuối kỳ', OTHER: 'Khác' } as const;
export const examFormats = { WRITTEN: 'Tự luận', MULTIPLE_CHOICE: 'Trắc nghiệm', PRACTICAL: 'Thực hành', ORAL: 'Vấn đáp', ONLINE: 'Trực tuyến' } as const;
export type ServerExam = { id: string; courseId: string; kind: keyof typeof examKinds; format: keyof typeof examFormats;
  startsAt: string; endsAt: string; timeZone: string; room: string; reminder: boolean; reminderMinutes: number[]; notes: string;
  version: number; createdAt: string; updatedAt: string };
export type ExamQuery = { semesterId: string; courseId?: string };
export type ExamInput = Pick<ServerExam, 'courseId' | 'kind' | 'format' | 'startsAt' | 'endsAt' | 'timeZone' | 'room' | 'reminder' | 'reminderMinutes' | 'notes'>;
export const validExamId = (value: unknown): value is string => typeof value === 'string' && /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const invalid = () => new ApiError('Dữ liệu lịch thi chưa hợp lệ. Hãy tải lại danh sách.', 'INVALID_RESPONSE');
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;
function instant(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(v)) return false;
  const at = Date.parse(v);
  return Number.isFinite(at) && new Date(at).toISOString().slice(0, 19) === v.slice(0, 19);
}
export function examQueryKey(query: ExamQuery) {
  if (!validExamId(query.semesterId) || query.courseId !== undefined && !validExamId(query.courseId))
    throw new ApiError('Chọn học kỳ và môn học hợp lệ.', 'INVALID_EXAM_QUERY');
  return `${query.semesterId.toLowerCase()}:${query.courseId?.toLowerCase() ?? ''}`;
}
export function parseServerExam(input: unknown): ServerExam {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw invalid();
  const v = input as Record<string, unknown>;
  if (!validExamId(v.id) || !validExamId(v.courseId) || typeof v.kind !== 'string' || !Object.hasOwn(examKinds, v.kind) || typeof v.format !== 'string' || !Object.hasOwn(examFormats, v.format)
    || !instant(v.startsAt) || !instant(v.endsAt) || !text(v.timeZone, 100) || !validTimeZone(v.timeZone)
    || !text(v.room, 100) || !text(v.notes, 5000) || typeof v.reminder !== 'boolean'
    || !Number.isSafeInteger(v.version) || Number(v.version) < 0 || !instant(v.createdAt) || !instant(v.updatedAt)
    || !Array.isArray(v.reminderMinutes) || v.reminderMinutes.length > 10
    || v.reminderMinutes.some(n => !Number.isInteger(n) || n < 0 || n > 10080) || new Set(v.reminderMinutes).size !== v.reminderMinutes.length
    || v.reminder !== (v.reminderMinutes.length > 0)) throw invalid();
  const start = Date.parse(v.startsAt), end = Date.parse(v.endsAt), day = zonedDay(start, v.timeZone);
  const seconds = (at: number) => new Intl.DateTimeFormat('en', { timeZone: v.timeZone as string, second: '2-digit' }).format(at);
  if (start < Date.UTC(1900, 0, 1) || end >= Date.UTC(2100, 0, 1) || start >= end || day < '1900-01-01' || day > '2099-12-31'
    || day !== zonedDay(end, v.timeZone) || start % 1000 !== 0 || end % 1000 !== 0 || Number(seconds(start)) !== 0 || Number(seconds(end)) !== 0) throw invalid();
  return { id: v.id.toLowerCase(), courseId: v.courseId.toLowerCase(), kind: v.kind as ServerExam['kind'], format: v.format as ServerExam['format'],
    startsAt: v.startsAt, endsAt: v.endsAt, timeZone: v.timeZone, room: v.room, reminder: v.reminder,
    reminderMinutes: [...v.reminderMinutes].sort((a, b) => b - a), notes: v.notes, version: Number(v.version), createdAt: v.createdAt, updatedAt: v.updatedAt };
}
export function examInput(input: ExamInput): ExamInput {
  // Validate with the same domain rules as a response, then whitelist writable fields.
  const parsed = parseServerExam({ ...input, room: input.room.trim(), notes: input.notes.trim(),
    id: '00000000-0000-4000-8000-000000000000', version: 0,
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' });
  const { courseId, kind, format, startsAt, endsAt, timeZone, room, reminder, reminderMinutes, notes } = parsed;
  return { courseId, kind, format, startsAt, endsAt, timeZone, room, reminder, reminderMinutes, notes };
}
function originalExam(original: ServerExam) {
  if (!validExamId(original.id) || !Number.isSafeInteger(original.version) || original.version < 0)
    throw new ApiError('Đọc lại lịch thi trước khi sửa hoặc xóa.', 'INVALID_EXAM_QUERY');
}
export function createExamsApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options);
  const parseRows = (rows: unknown) => {
    if (!Array.isArray(rows)) throw invalid();
    const result = rows.map(parseServerExam);
    if (new Set(result.map(row => row.id)).size !== result.length) throw invalid();
    return result.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
  };
  return {
    async all(signal?: AbortSignal) {
      return parseRows(await authorized(token => http<unknown>('/api/v1/exams', { headers: { Authorization: `Bearer ${token}` }, signal }), signal));
    },
    async list(query: ExamQuery, signal?: AbortSignal) {
      examQueryKey(query);
      const path = '/api/v1/exams?semesterId=' + encodeURIComponent(query.semesterId) + (query.courseId ? '&courseId=' + encodeURIComponent(query.courseId) : '');
      const rows = await authorized(token => http<unknown>(path, { headers: { Authorization: `Bearer ${token}` }, signal }), signal);
      const result = parseRows(rows);
      if (query.courseId && result.some(row => row.courseId !== query.courseId!.toLowerCase())) throw invalid();
      return result;
    },
    async get(id: string, signal?: AbortSignal) {
      if (!validExamId(id)) throw new ApiError('Lịch thi chưa hợp lệ. Chọn lại từ danh sách.', 'INVALID_EXAM_QUERY');
      const result = parseServerExam(await authorized(token => http<unknown>('/api/v1/exams/' + encodeURIComponent(id), { headers: { Authorization: `Bearer ${token}` }, signal }), signal));
      if (result.id !== id.toLowerCase()) throw invalid();
      return result;
    },
    async save(input: ExamInput, original?: ServerExam) {
      const body = examInput(input);
      if (original) originalExam(original);
      const result = parseServerExam(await authorized(token => http<unknown>('/api/v1/exams' + (original ? '/' + encodeURIComponent(original.id) : ''), {
        method: original ? 'PUT' : 'POST', headers: { Authorization: `Bearer ${token}` }, body: original ? { ...body, version: original.version } : body,
      })));
      if (original && (result.id !== original.id.toLowerCase() || result.version <= original.version) || !original && result.version !== 0) throw invalid();
      const confirmed = examInput(result);
      if (Object.keys(body).some(key => JSON.stringify(confirmed[key as keyof ExamInput]) !== JSON.stringify(body[key as keyof ExamInput])
        && !(key === 'startsAt' || key === 'endsAt') ) || Date.parse(result.startsAt) !== Date.parse(body.startsAt) || Date.parse(result.endsAt) !== Date.parse(body.endsAt)) throw invalid();
      return result;
    },
    async remove(original: ServerExam) {
      originalExam(original);
      await authorized(token => http<void>('/api/v1/exams/' + encodeURIComponent(original.id) + '?version=' + original.version, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, empty: true,
      }));
    },
  };
}
