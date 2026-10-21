import type { Course } from '../academics/academic';
import { taskIsOverdue, type Task } from '../assignments/assignments';
import { focusSummary, uniqueFocusRecords, type FocusRecord } from '../focus/focus';
import { addDays, dateKey, isValidDate, parseDay } from '../../shared/utils/dates';

export const statisticsPeriods = ['7 ngày', '30 ngày', 'Tùy chọn'] as const;
export type StatisticsPeriod = typeof statisticsPeriods[number];
export type StatisticsRange = { from: string; to: string };
type CatalogCourse = Pick<Course, 'id' | 'name' | 'semesterId' | 'code'>;
const dayNumber = (day: string) => {
  const date = parseDay(day);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
};

export function validateStatisticsRange(range: StatisticsRange) {
  if (!isValidDate(range.from) || !isValidDate(range.to)) return 'Chọn ngày bắt đầu và kết thúc hợp lệ.';
  return range.from > range.to ? 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' : '';
}
export function statisticsRange(period: StatisticsPeriod, now: Date, custom: StatisticsRange): StatisticsRange {
  return period === 'Tùy chọn' ? custom : { from: dateKey(addDays(now, period === '7 ngày' ? -6 : -29)), to: dateKey(now) };
}
export function formatStudyTime(seconds: number) {
  const minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
  return hours ? `${hours} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}` : `${minutes} phút`;
}

// All intervals use local calendar dates. UTC ordinals count days across DST,
// while addDays constructs the actual local boundaries shown to the student.
export function statisticsData({ semesterId, catalog, records, tasks, range, now }: {
  semesterId: string; catalog: CatalogCourse[]; records: FocusRecord[]; tasks: Task[]; range: StatisticsRange; now: Date;
}) {
  const courses = new Map(catalog.map(course => [course.id, course]));
  const semesterRecords = uniqueFocusRecords(records, now).filter(record => (record.semesterId ?? courses.get(record.courseId)?.semesterId) === semesterId);
  const validRange = !validateStatisticsRange(range);
  const entries = validRange ? semesterRecords.filter(record => {
    const day = dateKey(new Date(record.endedAt)); return day >= range.from && day <= range.to;
  }) : [];
  const totalSeconds = entries.reduce((sum, record) => sum + record.studySeconds, 0);
  const span = validRange ? dayNumber(range.to) - dayNumber(range.from) + 1 : 0;
  const bucketDays = Math.max(1, Math.ceil(span / 7));
  const buckets = Array.from({ length: Math.ceil(span / bucketDays) }, (_, index) => {
    const from = dateKey(addDays(parseDay(range.from), index * bucketDays));
    const to = dateKey(addDays(parseDay(range.from), Math.min(span - 1, (index + 1) * bucketDays - 1)));
    return { from, to, seconds: 0, sessions: 0 };
  });
  const byCourse = new Map<string, { id: string; name: string; code?: string; seconds: number; sessions: number; archived: boolean }>();
  for (const record of entries) {
    const index = Math.floor((dayNumber(dateKey(new Date(record.endedAt))) - dayNumber(range.from)) / bucketDays);
    buckets[index]!.seconds += record.studySeconds; buckets[index]!.sessions++;
    const course = courses.get(record.courseId);
    const item = byCourse.get(record.courseId) ?? { id: record.courseId, name: course?.name ?? record.courseName, code: course?.code, seconds: 0, sessions: 0, archived: !course };
    item.seconds += record.studySeconds; item.sessions++;
    byCourse.set(record.courseId, item);
  }
  const semesterTasks = tasks.filter(task => courses.get(task.courseId)?.semesterId === semesterId);
  const done = semesterTasks.filter(task => task.status === 'Hoàn thành').length;
  const overdue = semesterTasks.filter(task => taskIsOverdue(task, now)).length;
  return {
    entries, totalSeconds, buckets, groupedDays: bucketDays > 1,
    sampleCount: entries.filter(record => record.source === 'sample').length,
    streak: focusSummary(semesterRecords, 4, now).streak,
    distribution: [...byCourse.values()].sort((a, b) => b.seconds - a.seconds || a.name.localeCompare(b.name)).map(course => ({ ...course, percent: totalSeconds ? course.seconds / totalSeconds * 100 : 0 })),
    tasks: { total: semesterTasks.length, done, overdue, notDue: semesterTasks.length - done - overdue, percent: semesterTasks.length ? Math.round(done / semesterTasks.length * 100) : 0 },
  };
}
export type StatisticsData = ReturnType<typeof statisticsData>;
