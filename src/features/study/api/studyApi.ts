import { ApiError, createHttpClient } from '../../../shared/api/http';
import { dateKey } from '../../../shared/utils/dates';
import type { Authorized } from '../../academics/api/semestersApi';
import type { StudySession, StudyStatus } from '../learning';
import { localTime, studyTiming, validTimeZone, zonedDay, type StudyInput } from '../studyTime';
export type { StudyInput } from '../studyTime';

const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const statuses: Record<string, StudyStatus> = { PLANNED: 'Đã lên lịch', IN_PROGRESS: 'Đang học', COMPLETED: 'Hoàn thành' };
const serverStatuses: Record<StudyStatus, string> = { 'Đã lên lịch': 'PLANNED', 'Đang học': 'IN_PROGRESS', 'Hoàn thành': 'COMPLETED' };
function instant(value: unknown) { return typeof value === 'string' && /T.*(Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN; }
function session(value: unknown): StudySession {
  const v = value as Record<string, unknown> | null, start = instant(v?.startsAt), end = instant(v?.endsAt);
  if (!v || typeof v.id !== 'string' || !uuid.test(v.id) || typeof v.courseId !== 'string' || !uuid.test(v.courseId)
    || !(v.assignmentId === null || typeof v.assignmentId === 'string' && uuid.test(v.assignmentId))
    || typeof v.title !== 'string' || !v.title.trim() || v.title.length > 200 || typeof v.notes !== 'string' || v.notes.length > 5000
    || !Number.isInteger(v.durationMinutes) || Number(v.durationMinutes) < 1 || Number(v.durationMinutes) > 240
    || !['PLANNED', 'IN_PROGRESS', 'COMPLETED'].includes(v.status as string) || !Number.isSafeInteger(v.version) || Number(v.version) < 0
    || !Number.isFinite(start) || !Number.isFinite(end) || start < Date.UTC(1900, 0, 1) || end >= Date.UTC(2100, 0, 1)
    || end - start !== Number(v.durationMinutes) * 60_000 || typeof v.timeZone !== 'string' || !validTimeZone(v.timeZone)
    || zonedDay(start, v.timeZone) !== zonedDay(end, v.timeZone))
    throw new ApiError('Phản hồi buổi tự học chưa hợp lệ. Hãy tải lại.', 'INVALID_RESPONSE');
  return { id: v.id, courseId: v.courseId, taskId: typeof v.assignmentId === 'string' ? v.assignmentId : undefined, title: v.title,
    date: dateKey(new Date(start)), start: localTime(start), duration: v.durationMinutes as number, notes: v.notes,
    status: statuses[v.status as string]!, startsAt: v.startsAt as string, endsAt: v.endsAt as string, timeZone: v.timeZone,
    version: v.version as number, focusedSeconds: 0 };
}
function version(original: StudySession) {
  if (!uuid.test(original.id) || !Number.isSafeInteger(original.version) || Number(original.version) < 0)
    throw new ApiError('Nạp bản buổi học mới nhất trước khi sửa hoặc xóa.', 'STUDY_SESSION_VERSION_CONFLICT', 409);
  return original.version!;
}
export function createStudyApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options), headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async list(signal?: AbortSignal) {
      const rows = await authorized(token => http<unknown>('/api/v1/study-sessions', { signal, headers: headers(token) }), signal);
      if (!Array.isArray(rows)) throw new ApiError('Danh sách buổi học chưa hợp lệ.', 'INVALID_RESPONSE');
      const result = rows.map(session);
      if (new Set(result.map(s => s.id)).size !== result.length) throw new ApiError('Danh sách buổi học bị trùng định danh.', 'INVALID_RESPONSE');
      return result;
    },
    async save(input: StudyInput, original?: StudySession) {
      const expected = original ? version(original) : undefined, timing = studyTiming(input, original);
      const body = { title: input.title.trim(), courseId: input.courseId, assignmentId: input.taskId || null,
        startsAt: timing.startsAt, timeZone: timing.timeZone, durationMinutes: input.duration,
        notes: input.notes.trim(), status: serverStatuses[input.status], ...(original ? { version: expected } : {}) };
      return session(await authorized(token => http<unknown>('/api/v1/study-sessions' + (original ? '/' + encodeURIComponent(original.id) : ''), {
        method: original ? 'PUT' : 'POST', body, headers: headers(token),
      })));
    },
    async remove(original: StudySession) {
      const expected = version(original);
      await authorized(token => http<void>(`/api/v1/study-sessions/${encodeURIComponent(original.id)}?version=${expected}`, { method: 'DELETE', empty: true, headers: headers(token) }));
    },
  };
}
