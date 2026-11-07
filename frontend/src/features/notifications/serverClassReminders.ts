import { ApiError } from '../../shared/api/http';
import { dateLabel } from '../../shared/utils/dates';
import type { Course, Semester } from '../academics/academic';
import { occurrenceClock, type OverviewSnapshot } from '../schedule/overview/overview';
import type { InAppReminder, ReadReceipts } from './notifications';

export type NotificationScheduleState = { ready: boolean; loading: boolean; error: ApiError | null; reload: () => Promise<unknown>; classesReady?: boolean; examsReady?: boolean };
export function buildServerClassReminders(snapshot: OverviewSnapshot, courses: Course[], semesters: Semester[], now: Date): InAppReminder[] {
  const byCourse = new Map(courses.map(course => [course.id, course])), bySemester = new Map(semesters.map(semester => [semester.id, semester]));
  const current = now.getTime(), result: InAppReminder[] = [];
  for (const row of snapshot.rows) {
    const course = byCourse.get(row.courseId), semester = course && bySemester.get(course.semesterId);
    if (!course || !semester) throw new ApiError('Danh sách môn hoặc học kỳ đã thay đổi. Tải lại dữ liệu nhắc việc để xác định đúng môn.', 'REMINDER_CATALOG_RELOAD_REQUIRED');
    const start = Date.parse(row.startsAt), end = Date.parse(row.endsAt), trigger = start - row.reminderMinutes * 60000;
    if (row.cancelled || current < trigger || current >= end) continue;
    const clock = occurrenceClock(row), fullDate = `${dateLabel(clock.date)}/${clock.date.slice(0, 4)}`;
    result.push({ id: `saved-class:${row.scheduleId}:${row.date}`, kind: 'saved-class',
      target: { kind: 'saved-class', id: row.scheduleId, date: row.date, courseId: row.courseId, semesterId: course.semesterId },
      // Parent version is intentionally absent: editing another date must not
      // turn this otherwise unchanged reminder unread again.
      revision: JSON.stringify([course.id, course.name, course.code, semester.id, semester.name, semester.academicYear, start, end, row.room, row.teacher, row.reminderMinutes, row.changed, row.reason]),
      title: course.name, subtitle: `${course.code} · ${semester.name} · ${semester.academicYear}\n${row.room ? `Phòng ${row.room}` : 'Chưa có phòng'}${row.teacher ? ` · ${row.teacher}` : ''}`,
      detail: `${fullDate} · ${clock.start} – ${clock.endDate !== clock.date ? `${dateLabel(clock.endDate)} ` : ''}${clock.end}`,
      origin: clock.different ? `Giờ lịch gốc: ${dateLabel(row.date)}/${row.date.slice(0, 4)} · ${row.startTime} – ${row.endTime} · ${row.timeZone}` : undefined,
      reason: row.reason || undefined, when: current >= start ? 'Đang học' : `Còn ${Math.ceil((start - current) / 60000)} phút`, at: start,
      urgency: current >= start ? 'ongoing' : 'upcoming', changed: row.changed,
    });
  }
  return result;
}
export function mergeReminders(...lists: InAppReminder[][]) {
  const rank = { overdue: 0, ongoing: 1, upcoming: 2 };
  return lists.flat().sort((a, b) => rank[a.urgency] - rank[b.urgency] || a.at - b.at || a.id.localeCompare(b.id));
}
export function pruneKnownReceipts(receipts: ReadReceipts, items: InAppReminder[], scheduleReady: boolean, examsReady = true) {
  const ids = new Set(items.map(item => item.id));
  const entries = Object.entries(receipts).filter(([id]) => ids.has(id) || !scheduleReady && id.startsWith('saved-class:') || !examsReady && id.startsWith('saved-exam:'));
  return entries.length === Object.keys(receipts).length ? receipts : Object.fromEntries(entries);
}
