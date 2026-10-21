import type { Course } from '../academics/academic';
import { deadlineTimestamp, taskDeadlineLabel, taskDueLabel, type Task } from '../assignments/assignments';
import { classOccurrences, type ClassException, type ClassItem, type Exam } from '../schedule/calendar';
import { addDays, dateKey, dateLabel, isValidDate } from '../../shared/utils/dates';

export type NotificationTarget = { kind: 'task'; id: string } | { kind: 'class'; id: string; date: string } | { kind: 'exam'; id: string };
export type InAppReminder = {
  id: string; revision: string; kind: NotificationTarget['kind']; target: NotificationTarget;
  title: string; subtitle: string; detail: string; when: string; at: number;
  urgency: 'overdue' | 'ongoing' | 'upcoming'; changed?: boolean;
};
export type ReadReceipts = Record<string, string>;
export type ReminderWithRead = InAppReminder & { read: boolean };
export type ReminderSources = { tasks: Task[]; classes: ClassItem[]; exceptions: ClassException[]; exams: Exam[]; courses: Course[] };
const timestamp = (date: string, time: string) => isValidDate(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? new Date(`${date}T${time}:00`).getTime() : NaN;
const fullDate = (date: string) => `${dateLabel(date)}/${date.slice(0, 4)}`;

// This is a current in-app agenda, not a history of delivered OS notifications.
export function buildInAppReminders(sources: ReminderSources, now: Date): InAppReminder[] {
  const reminders: InAppReminder[] = [], current = now.getTime(), edge = addDays(now, 7).getTime();
  const courses = new Map(sources.courses.map(course => [course.id, course]));
  const revision = (...values: unknown[]) => JSON.stringify(values);
  for (const task of sources.tasks) {
    const at = deadlineTimestamp(task);
    if (task.status === 'Hoàn thành' || !Number.isFinite(at) || at > edge) continue;
    const course = courses.get(task.courseId), name = course?.name ?? task.course;
    reminders.push({ id: `task:${task.id}`, revision: revision(task.title, task.courseId, name, course?.code, at), kind: 'task', target: { kind: 'task', id: task.id },
      title: task.title, subtitle: `${name}${course?.code ? ` · ${course.code}` : ''}`, detail: `Hạn nộp: ${taskDeadlineLabel(task)}`, when: taskDueLabel(task, now), at, urgency: at < current ? 'overdue' : 'upcoming' });
  }
  // Calendar-day iteration handles local midnight/DST. Each occurrence gets its own ID.
  for (let offset = 0; offset <= 7; offset++) {
    const date = dateKey(addDays(now, offset));
    for (const item of classOccurrences(date, sources.classes, sources.exceptions)) {
      const at = timestamp(date, item.start), end = timestamp(date, item.end);
      if (item.cancelled || !Number.isFinite(at) || !Number.isFinite(end) || end <= current || at > edge) continue;
      reminders.push({ id: `class:${item.id}:${date}`, revision: revision(item.courseId, item.title, at, end, item.room, item.teacher, item.changed, item.reason), kind: 'class', target: { kind: 'class', id: item.id, date },
        title: item.title, subtitle: `Phòng ${item.room || 'chưa cập nhật'}${item.teacher ? ` · ${item.teacher}` : ''}`, detail: `${fullDate(date)} · ${item.start} – ${item.end}`, when: at <= current ? 'Đang học' : date === dateKey(now) ? 'Hôm nay' : `Ngày ${dateLabel(date)}`, at, urgency: at <= current ? 'ongoing' : 'upcoming', changed: item.changed });
    }
  }
  for (const exam of sources.exams) {
    const at = timestamp(exam.date, exam.time), end = timestamp(exam.date, exam.end);
    if (!Number.isFinite(at) || !Number.isFinite(end) || end <= current || at > edge) continue;
    const name = courses.get(exam.courseId)?.name ?? exam.course;
    reminders.push({ id: `exam:${exam.id}`, revision: revision(exam.courseId, name, at, end, exam.room, exam.kind, exam.format), kind: 'exam', target: { kind: 'exam', id: exam.id },
      title: name, subtitle: `${exam.kind} · ${exam.format} · Phòng ${exam.room || 'chưa cập nhật'}`, detail: `${fullDate(exam.date)} · ${exam.time} – ${exam.end}`, when: at <= current ? 'Đang thi' : exam.date === dateKey(now) ? 'Hôm nay' : `Ngày ${dateLabel(exam.date)}`, at, urgency: at <= current ? 'ongoing' : 'upcoming' });
  }
  const rank = { overdue: 0, ongoing: 1, upcoming: 2 };
  return reminders.sort((a, b) => rank[a.urgency] - rank[b.urgency] || a.at - b.at || a.id.localeCompare(b.id));
}
export function applyReadReceipts(items: InAppReminder[], receipts: ReadReceipts): ReminderWithRead[] {
  return items.map(item => ({ ...item, read: receipts[item.id] === item.revision }));
}
export function markRemindersRead(receipts: ReadReceipts, items: InAppReminder[]): ReadReceipts {
  if (items.every(item => receipts[item.id] === item.revision)) return receipts;
  const next = { ...receipts }; items.forEach(item => { next[item.id] = item.revision; }); return next;
}
export function pruneReadReceipts(receipts: ReadReceipts, items: InAppReminder[]) {
  const active = new Set(items.map(item => item.id));
  return Object.keys(receipts).every(id => active.has(id)) ? receipts : Object.fromEntries(Object.entries(receipts).filter(([id]) => active.has(id)));
}
export function notificationTargetExists(target: NotificationTarget, sources: ReminderSources) {
  return target.kind === 'task' ? sources.tasks.some(task => task.id === target.id) : target.kind === 'class' ? sources.classes.some(item => item.id === target.id) : sources.exams.some(exam => exam.id === target.id);
}
export function reminderOpenLabel(item: InAppReminder) {
  return item.kind === 'task' ? `Mở nhắc bài ${item.title}` : item.kind === 'class' ? `Mở nhắc lịch học ${item.title}, ${item.detail}` : `Mở nhắc lịch thi ${item.title}, ${item.detail}`;
}
