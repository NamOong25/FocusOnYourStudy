import { addDays, dateKey, parseDay } from '../../shared/utils/dates';
import { StudySession, endTime } from '../study/learning';

export type ClassItem = { id: string; courseId: string; title: string; weekday: number; weekdays: number[]; startsOn: string; endsOn: string; start: string; end: string; room: string; teacher: string; reminderMinutes: number };
export type ClassException = { id: string; seriesId: string; date: string; kind: 'cancelled' | 'changed'; start: string; end: string; room: string; teacher: string; reason: string };
export type ClassOccurrence = ClassItem & { date: string; cancelled: boolean; changed: boolean; reason: string };
export type Exam = { id: string; courseId: string; course: string; date: string; time: string; end: string; room: string; type: string; kind: 'Giữa kỳ' | 'Cuối kỳ' | 'Khác'; format: 'Tự luận' | 'Trắc nghiệm' | 'Thực hành' | 'Vấn đáp' | 'Trực tuyến'; reminder: boolean; reminderMinutes: number[]; notes: string };
export type CalendarEvent = { id: string; kind: 'Ca học' | 'Lịch thi' | 'Tự học'; title: string; date: string; start: string; end: string };
export const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export const weekdaysLabel = (weekdays: number[]) => [...weekdays].sort((a,b) => (a + 6) % 7 - (b + 6) % 7).map(d => dayNames[d]).join(', ');
export function isClassDate(item: ClassItem, date: string) { return date >= item.startsOn && date <= item.endsOn && item.weekdays.includes(parseDay(date).getDay()); }
export function classOccurrences(date: string, classes: ClassItem[], exceptions: ClassException[]): ClassOccurrence[] {
  return classes.filter(c => isClassDate(c, date)).map(c => {
    const exception = exceptions.find(e => e.seriesId === c.id && e.date === date);
    return { ...c, date, start: exception?.kind === 'changed' ? exception.start : c.start, end: exception?.kind === 'changed' ? exception.end : c.end, room: exception?.kind === 'changed' ? exception.room : c.room, teacher: exception?.kind === 'changed' ? exception.teacher : c.teacher, cancelled: exception?.kind === 'cancelled', changed: exception?.kind === 'changed', reason: exception?.reason ?? '' };
  }).sort((a,b) => a.start.localeCompare(b.start));
}
export function calendarEvents(date: string, classes: ClassItem[], exceptions: ClassException[], exams: Exam[], sessions: StudySession[]): CalendarEvent[] {
  return [
    ...classOccurrences(date, classes, exceptions).filter(c => !c.cancelled).map(c => ({ id: c.id, kind: 'Ca học' as const, title: c.title, date, start: c.start, end: c.end })),
    ...exams.filter(e => e.date === date).map(e => ({ id: e.id, kind: 'Lịch thi' as const, title: e.course, date, start: e.time, end: e.end })),
    ...sessions.filter(s => s.date === date).map(s => ({ id: s.id, kind: 'Tự học' as const, title: s.title, date, start: s.start, end: endTime(s.start, s.duration) })),
  ];
}
export function findConflicts(date: string, start: string, end: string, events: CalendarEvent[], exclude?: { kind: CalendarEvent['kind']; id: string }) {
  return events.filter(e => e.date === date && !(e.kind === exclude?.kind && e.id === exclude.id) && start < e.end && end > e.start);
}
export function seriesConflicts(candidate: ClassItem, classes: ClassItem[], exceptions: ClassException[], exams: Exam[], sessions: StudySession[]) {
  const conflicts: CalendarEvent[] = []; const seen = new Set<string>();
  for (let d = parseDay(candidate.startsOn), n = 0; dateKey(d) <= candidate.endsOn && n <= 366; d = addDays(d, 1), n++) {
    const date = dateKey(d); const occurrence = classOccurrences(date, [candidate], exceptions)[0];
    if (!occurrence || occurrence.cancelled) continue;
    for (const event of findConflicts(date, occurrence.start, occurrence.end, calendarEvents(date, classes, exceptions, exams, sessions), { kind: 'Ca học', id: candidate.id })) {
      const key = `${event.kind}:${event.id}:${event.start}:${event.end}`;
      if (!seen.has(key)) { seen.add(key); conflicts.push(event); }
    }
  }
  return conflicts.slice(0, 5);
}
export function reminderLabel(minutes: number) { return minutes >= 1440 ? `${minutes / 1440} ngày` : minutes >= 60 ? `${minutes / 60} giờ` : `${minutes} phút`; }
