import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Course, CourseColor, CourseStatus } from '../academic';
import type { Authorized } from './semestersApi';

export type CourseInput = Omit<Course, 'id' | 'version'>;
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const statuses: Record<string, CourseStatus> = { STUDYING: 'Đang học', COMPLETED: 'Hoàn thành', PLANNED: 'Dự kiến' };
const serverStatus: Record<CourseStatus, string> = { 'Đang học': 'STUDYING', 'Hoàn thành': 'COMPLETED', 'Dự kiến': 'PLANNED' };
function course(value: unknown): Course {
  const v = value as Record<string, unknown> | null;
  const string = (key: string, max: number) => typeof v?.[key] === 'string' && (v[key] as string).length <= max;
  if (!v || typeof v.id !== 'string' || !uuid.test(v.id) || typeof v.semesterId !== 'string' || !uuid.test(v.semesterId)
    || !string('code', 64) || !(v.code as string).trim() || !string('name', 200) || !(v.name as string).trim()
    || !Number.isInteger(v.credits) || Number(v.credits) < 1 || Number(v.credits) > 30
    || !string('teacher', 200) || !string('room', 100) || !string('description', 5000)
    || !['STUDYING', 'COMPLETED', 'PLANNED'].includes(v.status as string)
    || !['lavender', 'mint', 'peach', 'blue'].includes(v.color as string)
    || !Number.isSafeInteger(v.version) || Number(v.version) < 0) {
    throw new ApiError('Phản hồi môn học chưa hợp lệ. Hãy tải lại.', 'INVALID_RESPONSE');
  }
  return { id: v.id, semesterId: v.semesterId, code: v.code as string, name: v.name as string, credits: v.credits as number,
    teacher: v.teacher as string, room: v.room as string, description: v.description as string,
    status: statuses[v.status as string]!, color: v.color as CourseColor, version: v.version as number };
}
function version(original: Course) {
  if (!Number.isSafeInteger(original.version) || Number(original.version) < 0) {
    throw new ApiError('Hãy nạp bản môn học mới nhất trước khi sửa hoặc xóa.', 'COURSE_VERSION_CONFLICT', 409);
  }
  return original.version!;
}
export function createCoursesApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options);
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async list(signal?: AbortSignal) {
      // One complete account catalogue feeds every picker and semester total.
      const rows = await authorized(token => http<unknown>('/api/v1/courses', { signal, headers: headers(token) }), signal);
      if (!Array.isArray(rows)) throw new ApiError('Danh sách môn học chưa hợp lệ.', 'INVALID_RESPONSE');
      const result = rows.map(course);
      if (new Set(result.map(c => c.id)).size !== result.length) throw new ApiError('Danh sách môn bị trùng định danh.', 'INVALID_RESPONSE');
      return result;
    },
    async save(input: CourseInput, original?: Course) {
      const expected = original ? version(original) : undefined;
      const body = { semesterId: input.semesterId, name: input.name, code: input.code, credits: input.credits,
        teacher: input.teacher, room: input.room, description: input.description, status: serverStatus[input.status], color: input.color,
        ...(original ? { version: expected } : {}) };
      return course(await authorized(token => http<unknown>('/api/v1/courses' + (original ? '/' + encodeURIComponent(original.id) : ''), {
        method: original ? 'PUT' : 'POST', headers: headers(token), body,
      })));
    },
    async remove(original: Course) {
      const expected = version(original);
      await authorized(token => http<void>(`/api/v1/courses/${encodeURIComponent(original.id)}?version=${expected}`, {
        method: 'DELETE', headers: headers(token), empty: true,
      }));
    },
  };
}
