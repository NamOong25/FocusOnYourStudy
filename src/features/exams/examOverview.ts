import type { Course } from '../academics/academic';
import type { ExamReadState } from './api/ExamReadManager';
import type { ExamQuery, ServerExam } from './api/examsApi';

export function projectExamOverview(source: Pick<ExamReadState<ServerExam[]>, 'loaded' | 'loading' | 'error' | 'value'>,
  courses: Pick<Course, 'id' | 'semesterId'>[], query: ExamQuery, now: number) {
  const incoming = source.loaded ? source.value ?? [] : [];
  const catalogueMismatch = incoming.some(exam => !courses.some(course => course.id === exam.courseId && course.semesterId === query.semesterId)
    || !!query.courseId && exam.courseId !== query.courseId);
  // An incomplete catalogue must not turn a known exam into a false empty result or a wrong course title.
  const rows = catalogueMismatch ? [] : [...incoming].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
  const upcoming = rows.filter(exam => Date.parse(exam.endsAt) > now);
  return { rows, upcoming, next: upcoming[0], catalogueMismatch, ready: source.loaded && !source.loading && !source.error && !catalogueMismatch,
    stale: source.loaded && !!source.error };
}

export function examCountdownLabel(exam: Pick<ServerExam, 'startsAt' | 'endsAt'>, now: number) {
  if (Date.parse(exam.endsAt) <= now) return 'Đã kết thúc';
  if (Date.parse(exam.startsAt) <= now) return 'Đang diễn ra';
  const minutes = Math.ceil((Date.parse(exam.startsAt) - now) / 60000);
  if (minutes < 60) return `Còn ${minutes} phút`;
  if (minutes < 1440) return `Còn ${Math.floor(minutes / 60)} giờ${minutes % 60 ? ` ${minutes % 60} phút` : ''}`;
  const days = Math.floor(minutes / 1440), hours = Math.floor(minutes % 1440 / 60);
  return `Còn ${days} ngày${hours ? ` ${hours} giờ` : ''}`;
}
