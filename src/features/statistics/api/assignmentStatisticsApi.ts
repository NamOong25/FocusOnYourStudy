import { ApiError, createHttpClient } from '../../../shared/api/http';
import { instantMicros } from '../../../shared/utils/instantMicros';
import { uuid, type Authorized } from '../../focus/api/pomodoroApi';
import { dailyKey, pomodoroDay, validPomodoroDate } from '../../focus/api/pomodoroInsightsApi';

export type AssignmentStatisticsQuery = { semesterId: string; courseId?: string; timeZone: string };
export type AssignmentStatistics = { semesterId: string; courseId: string | null; asOf: string; date: string; timeZone: string; dueSoonThrough: string;
  totalAssignments: number; todoAssignments: number; inProgressAssignments: number; completedAssignments: number;
  pendingAssignments: number; overdueAssignments: number; notDueAssignments: number; dueSoonAssignments: number; completionPercent: number };
const counts = ['totalAssignments', 'todoAssignments', 'inProgressAssignments', 'completedAssignments', 'pendingAssignments', 'overdueAssignments', 'notDueAssignments', 'dueSoonAssignments', 'completionPercent'] as const;
const invalid = () => new ApiError('Tiến độ bài tập chưa hợp lệ. Hãy tải lại để đối chiếu.', 'INVALID_RESPONSE');
export function assignmentStatisticsKey(q: AssignmentStatisticsQuery) {
  try {
    if (!q || !uuid(q.semesterId) || q.courseId !== undefined && !uuid(q.courseId)) throw invalid();
    dailyKey({ date: '2026-01-01', timeZone: q.timeZone });
    return JSON.stringify([q.semesterId.toLowerCase(), q.courseId?.toLowerCase() ?? null, q.timeZone]);
  } catch { throw new ApiError('Chọn học kỳ, môn và múi giờ hợp lệ để xem tiến độ.', 'INVALID_ASSIGNMENT_STATISTICS_FILTER'); }
}
export function parseAssignmentStatistics(value: unknown, q: AssignmentStatisticsQuery): AssignmentStatistics {
  assignmentStatisticsKey(q);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const v = value as Record<string, unknown>;
  if (v.semesterId !== q.semesterId.toLowerCase() || v.courseId !== (q.courseId?.toLowerCase() ?? null) || v.timeZone !== q.timeZone
    || !validPomodoroDate(v.date) || typeof v.asOf !== 'string' || !v.asOf.endsWith('Z') || typeof v.dueSoonThrough !== 'string' || !v.dueSoonThrough.endsWith('Z')) throw invalid();
  const start = instantMicros(v.asOf), end = instantMicros(v.dueSoonThrough);
  if (start === null || end === null || end <= start || end - start < 5 * 86400000000 || end - start > 9 * 86400000000
    || pomodoroDay(Date.parse(v.asOf), q.timeZone) !== v.date) throw invalid();
  for (const key of counts) if (typeof v[key] !== 'number' || !Number.isSafeInteger(v[key]) || Number(v[key]) < 0) throw invalid();
  const n = v as unknown as AssignmentStatistics;
  if (n.todoAssignments + n.inProgressAssignments !== n.pendingAssignments
    || n.pendingAssignments + n.completedAssignments !== n.totalAssignments
    || n.overdueAssignments + n.notDueAssignments !== n.pendingAssignments || n.dueSoonAssignments > n.notDueAssignments) throw invalid();
  // Match Java's HALF_UP exactly, including half points such as 29/200 = 14.5%.
  const percent = n.totalAssignments ? Number((BigInt(n.completedAssignments) * BigInt(200) + BigInt(n.totalAssignments)) / (BigInt(n.totalAssignments) * BigInt(2))) : 0;
  if (n.completionPercent !== percent) throw invalid();
  return { semesterId: n.semesterId, courseId: n.courseId, asOf: n.asOf, date: n.date, timeZone: n.timeZone, dueSoonThrough: n.dueSoonThrough,
    totalAssignments: n.totalAssignments, todoAssignments: n.todoAssignments, inProgressAssignments: n.inProgressAssignments, completedAssignments: n.completedAssignments,
    pendingAssignments: n.pendingAssignments, overdueAssignments: n.overdueAssignments, notDueAssignments: n.notDueAssignments, dueSoonAssignments: n.dueSoonAssignments, completionPercent: n.completionPercent };
}
export function createAssignmentStatisticsApi(baseUrl: string, authorized: Authorized, options: Parameters<typeof createHttpClient>[1] = {}) {
  const request = createHttpClient(baseUrl, options);
  return { async read(q: AssignmentStatisticsQuery, signal?: AbortSignal) {
    assignmentStatisticsKey(q);
    const params = new URLSearchParams({ semesterId: q.semesterId.toLowerCase(), timeZone: q.timeZone });
    if (q.courseId) params.set('courseId', q.courseId.toLowerCase());
    return parseAssignmentStatistics(await authorized(token => request<unknown>('/api/v1/assignment-statistics?' + params,
      { signal, headers: { Authorization: `Bearer ${token}` } }), signal), q);
  } };
}
