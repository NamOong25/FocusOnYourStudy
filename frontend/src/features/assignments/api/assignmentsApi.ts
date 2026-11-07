import { ApiError, createHttpClient } from '../../../shared/api/http';
import { dateKey } from '../../../shared/utils/dates';
import { deadlineTimestamp, taskDeadlineTime, type Task, type TaskStatus } from '../assignments';
import type { Authorized } from '../../academics/api/semestersApi';

export type AssignmentInput = Pick<Task, 'title' | 'courseId' | 'deadline' | 'deadlineTime' | 'priority' | 'status' | 'notes'>;
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const statuses: Record<string, TaskStatus> = { TODO: 'Chưa làm', IN_PROGRESS: 'Đang làm', COMPLETED: 'Hoàn thành' };
const serverStatuses: Record<TaskStatus, string> = { 'Chưa làm': 'TODO', 'Đang làm': 'IN_PROGRESS', 'Hoàn thành': 'COMPLETED' };
function assignment(value: unknown): Task {
  const v = value as Record<string, unknown> | null;
  const at = typeof v?.dueAt === 'string' ? new Date(v.dueAt) : new Date(NaN);
  if (!v || typeof v.id !== 'string' || !uuid.test(v.id) || typeof v.courseId !== 'string' || !uuid.test(v.courseId)
    || typeof v.title !== 'string' || !v.title.trim() || v.title.length > 200 || typeof v.notes !== 'string' || v.notes.length > 5000
    || !['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(v.status as string) || !['HIGH', 'MEDIUM'].includes(v.priority as string)
    || typeof v.dueAt !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(v.dueAt) || !Number.isFinite(at.getTime())
    || at.getTime() < Date.UTC(1900, 0, 1) || at.getTime() >= Date.UTC(2100, 0, 1)
    || !Number.isSafeInteger(v.version) || Number(v.version) < 0) {
    throw new ApiError('Phản hồi bài tập chưa hợp lệ. Hãy tải lại.', 'INVALID_RESPONSE');
  }
  return { id: v.id, courseId: v.courseId, course: '', title: v.title, notes: v.notes,
    status: statuses[v.status as string]!, priority: v.priority === 'HIGH' ? 'Cao' : 'Trung bình',
    deadline: dateKey(at), deadlineTime: `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`,
    dueAt: v.dueAt, version: v.version as number };
}
function version(original: Task) {
  if (!uuid.test(original.id) || !Number.isSafeInteger(original.version) || Number(original.version) < 0)
    throw new ApiError('Nạp bản bài tập mới nhất trước khi sửa hoặc xóa.', 'ASSIGNMENT_VERSION_CONFLICT', 409);
  return original.version!;
}
export function createAssignmentsApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options), headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async list(signal?: AbortSignal) {
      // All-account catalogue: Dashboard, statistics, reminders and pickers share one confirmed source.
      const rows = await authorized(token => http<unknown>('/api/v1/assignments', { signal, headers: headers(token) }), signal);
      if (!Array.isArray(rows)) throw new ApiError('Danh sách bài tập chưa hợp lệ.', 'INVALID_RESPONSE');
      const tasks = rows.map(assignment);
      if (new Set(tasks.map(t => t.id)).size !== tasks.length) throw new ApiError('Danh sách bài tập bị trùng định danh.', 'INVALID_RESPONSE');
      return tasks;
    },
    async save(input: AssignmentInput, original?: Task) {
      const expected = original ? version(original) : undefined, at = deadlineTimestamp(input);
      if (!Number.isFinite(at) || at < Date.UTC(1900, 0, 1) || at >= Date.UTC(2100, 0, 1))
        throw new ApiError('Chọn ngày và giờ hạn nộp hợp lệ trong khoảng 1900–2099.', 'INVALID_DEADLINE');
      // Preserve seconds, precision and ambiguous DST instants when only status/text changes.
      const dueAt = original?.dueAt && original.deadline === input.deadline && taskDeadlineTime(original) === taskDeadlineTime(input)
        ? original.dueAt : new Date(at).toISOString();
      const body = { title: input.title.trim(), courseId: input.courseId, dueAt, notes: input.notes.trim(),
        priority: input.priority === 'Cao' ? 'HIGH' : 'MEDIUM', status: serverStatuses[input.status], ...(original ? { version: expected } : {}) };
      return assignment(await authorized(token => http<unknown>('/api/v1/assignments' + (original ? '/' + encodeURIComponent(original.id) : ''), {
        method: original ? 'PUT' : 'POST', body, headers: headers(token),
      })));
    },
    async remove(original: Task) {
      const expected = version(original);
      await authorized(token => http<void>(`/api/v1/assignments/${encodeURIComponent(original.id)}?version=${expected}`, {
        method: 'DELETE', empty: true, headers: headers(token),
      }));
    },
  };
}
