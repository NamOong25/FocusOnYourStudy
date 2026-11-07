import { zonedDay } from '../study/studyTime';
import { reminderLabel } from '../schedule/calendar';
import type { ServerExam } from './api/examsApi';

export type ExamPeriod = 'Sắp tới' | 'Đã qua' | 'Tất cả';
export function examClock(at: string, zone: string) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(Date.parse(at));
}
export function examDate(exam: ServerExam) { const [year, month, day] = zonedDay(Date.parse(exam.startsAt), exam.timeZone).split('-'); return `${day}/${month}/${year}`; }
export function examTiming(exam: ServerExam) {
  const offset = (at: string) => new Intl.DateTimeFormat('en-GB', { timeZone: exam.timeZone, timeZoneName: 'shortOffset' }).formatToParts(Date.parse(at)).find(part => part.type === 'timeZoneName')!.value;
  const start = offset(exam.startsAt), end = offset(exam.endsAt);
  return start === end ? `${examClock(exam.startsAt, exam.timeZone)} – ${examClock(exam.endsAt, exam.timeZone)}`
    : `${examClock(exam.startsAt, exam.timeZone)} (${start}) – ${examClock(exam.endsAt, exam.timeZone)} (${end})`;
}
export function examProgress(exam: ServerExam, now: number) {
  if (Date.parse(exam.endsAt) <= now) return 'Đã kết thúc';
  if (Date.parse(exam.startsAt) <= now) return 'Đang diễn ra';
  const day = zonedDay(Date.parse(exam.startsAt), exam.timeZone), today = zonedDay(now, exam.timeZone);
  const days = Math.round((Date.parse(day + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / 86400000);
  return days === 0 ? 'Hôm nay' : days === 1 ? 'Ngày mai' : `Còn ${days} ngày`;
}
export function filterExams(rows: ServerExam[], period: ExamPeriod, now: number) {
  return rows.filter(row => period === 'Tất cả' || (period === 'Sắp tới' ? Date.parse(row.endsAt) > now : Date.parse(row.endsAt) <= now));
}
export function examReminderText(exam: ServerExam) {
  return exam.reminder ? exam.reminderMinutes.map(value => value === 0 ? 'Đúng giờ bắt đầu' : `Trước ${reminderLabel(value)}`).join(' · ') : 'Không chọn nhắc';
}
