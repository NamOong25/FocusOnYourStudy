import { ApiError } from '../../shared/api/http';
import { instantMicros } from '../../shared/utils/instantMicros';
import type { Course } from '../academics/academic';
import { filterAssignments, type Task, type TaskStatus, type DeadlineFilter } from './assignments';
import { pomodoroDay } from '../focus/api/pomodoroInsightsApi';
import type { AssignmentStatistics } from '../statistics/api/assignmentStatisticsApi';

export type AssignmentStatisticsGroup = 'ALL' | 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'DUE_SOON';
export type AssignmentStatisticsLink = Pick<AssignmentStatistics, 'semesterId' | 'courseId' | 'asOf' | 'date' | 'timeZone' | 'dueSoonThrough'> & { group: AssignmentStatisticsGroup };
const groups: Record<AssignmentStatisticsGroup, { status: TaskStatus | 'Tất cả'; deadline: DeadlineFilter; label: string }> = {
  ALL: { status: 'Tất cả', deadline: 'Tất cả', label: 'Tất cả bài tập' }, TODO: { status: 'Chưa làm', deadline: 'Tất cả', label: 'Chưa làm' },
  IN_PROGRESS: { status: 'Đang làm', deadline: 'Tất cả', label: 'Đang làm' }, COMPLETED: { status: 'Hoàn thành', deadline: 'Tất cả', label: 'Hoàn thành' },
  OVERDUE: { status: 'Tất cả', deadline: 'Quá hạn', label: 'Quá hạn' }, DUE_SOON: { status: 'Tất cả', deadline: 'Sắp hạn', label: 'Sắp hạn' },
};
export const assignmentGroup = (group: AssignmentStatisticsGroup) => groups[group];
export function createAssignmentStatisticsLink(data: AssignmentStatistics, group: AssignmentStatisticsGroup): AssignmentStatisticsLink {
  if (!groups[group]) throw new ApiError('Nhóm bài tập chưa hợp lệ.', 'INVALID_REQUEST');
  return { semesterId: data.semesterId, courseId: data.courseId, asOf: data.asOf, date: data.date, timeZone: data.timeZone, dueSoonThrough: data.dueSoonThrough, group };
}
function bounds(reference: AssignmentStatisticsLink) {
  const start = instantMicros(reference.asOf), end = instantMicros(reference.dueSoonThrough);
  if (start === null || end === null || end <= start) throw new ApiError('Mốc thống kê chưa hợp lệ. Trở lại Thống kê và tải lại.', 'INVALID_RESPONSE');
  return { start, end };
}
export function statisticsTaskTiming(task: Task, reference: AssignmentStatisticsLink) {
  const { start, end } = bounds(reference), due = instantMicros(task.dueAt);
  if (due === null) throw new ApiError('Hạn nộp bài tập chưa hợp lệ. Tải lại danh sách để đối chiếu.', 'INVALID_RESPONSE');
  const pending = task.status !== 'Hoàn thành';
  return { overdue: pending && due < start, soon: pending && due >= start && due <= end,
    today: pomodoroDay(Date.parse(task.dueAt!), reference.timeZone) === reference.date };
}
export function filterStatisticsAssignments(tasks: Task[], catalog: Course[], filters: Parameters<typeof filterAssignments>[2], reference: AssignmentStatisticsLink) {
  const scoped = tasks.filter(task => catalog.some(c => c.id === task.courseId && c.semesterId === reference.semesterId));
  return filterAssignments(scoped, catalog, { ...filters, deadline: 'Tất cả' }, new Date(reference.asOf)).filter(task => {
    const timing = statisticsTaskTiming(task, reference);
    return filters.deadline === 'Tất cả' || filters.deadline === 'Hôm nay' && timing.today
      || filters.deadline === 'Quá hạn' && timing.overdue || filters.deadline === 'Sắp hạn' && timing.soon;
  });
}
export function statisticsTimeLabel(instant: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(instant));
  const part = (name: string) => parts.find(p => p.type === name)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} · ${part('hour')}:${part('minute')}:${part('second')}`;
}
