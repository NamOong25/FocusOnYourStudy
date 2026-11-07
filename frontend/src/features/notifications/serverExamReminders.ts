import { ApiError, asApiError } from '../../shared/api/http';
import type { Course, Semester } from '../academics/academic';
import type { ExamReadState } from '../exams/api/ExamReadManager';
import type { ServerExam } from '../exams/api/examsApi';
import { examFormats, examKinds } from '../exams/api/examsApi';
import { examDate, examTiming } from '../exams/examView';
import { reminderLabel } from '../schedule/calendar';
import type { OverviewSnapshot } from '../schedule/overview/overview';
import type { InAppReminder } from './notifications';
import { buildServerClassReminders } from './serverClassReminders';

export function buildServerExamReminders(rows: ServerExam[], courses: Course[], semesters: Semester[], now: Date): InAppReminder[] {
  const byCourse = new Map(courses.map(c => [c.id, c])), bySemester = new Map(semesters.map(s => [s.id, s])), current = now.getTime();
  const result: InAppReminder[] = [];
  for (const exam of rows) {
    const course = byCourse.get(exam.courseId), semester = course && bySemester.get(course.semesterId);
    if (!course || !semester) throw new ApiError('Danh sách môn hoặc học kỳ đã thay đổi. Tải lại nhắc việc để xác định đúng lịch thi.', 'REMINDER_CATALOG_RELOAD_REQUIRED');
    const start = Date.parse(exam.startsAt), end = Date.parse(exam.endsAt);
    if (!exam.reminder || current >= end) continue;
    const reached = exam.reminderMinutes.filter(minutes => current >= start - minutes * 60000);
    if (!reached.length) continue;
    // One card per exam. The latest reached milestone creates a new unread revision,
    // while minute ticks and a start/ongoing transition alone do not change the receipt.
    const milestone = Math.min(...reached), minutes = [...exam.reminderMinutes].sort((a, b) => b - a);
    result.push({ id: `saved-exam:${exam.id}`, kind: 'saved-exam', target: { kind: 'saved-exam', id: exam.id, courseId: course.id, semesterId: semester.id },
      revision: JSON.stringify([course.id, course.name, course.code, semester.id, semester.name, semester.academicYear, start, end, exam.timeZone, exam.room, exam.kind, exam.format, minutes, milestone]),
      title: course.name, subtitle: `${course.code} · ${semester.name} · ${semester.academicYear}\n${examKinds[exam.kind]} · ${examFormats[exam.format]} · ${exam.room ? `Phòng ${exam.room}` : 'Chưa có phòng thi'}`,
      detail: `${examDate(exam)} · ${examTiming(exam)}`, origin: `Múi giờ kỳ thi: ${exam.timeZone}`,
      reason: milestone === 0 ? 'Mốc nhắc: Đúng giờ bắt đầu' : `Mốc nhắc: Trước ${reminderLabel(milestone)}`,
      when: current >= start ? 'Đang thi' : `Còn ${Math.ceil((start - current) / 60000)} phút`, at: start, urgency: current >= start ? 'ongoing' : 'upcoming',
    });
  }
  return result;
}

type ReadFlags = { loaded: boolean; loading: boolean; error: ApiError | null };
export function projectServerReminders(input: {
  classes: OverviewSnapshot & ReadFlags; exams: Pick<ExamReadState<ServerExam[]>, 'loaded' | 'loading' | 'error' | 'value'>;
  courses: Course[]; semesters: Semester[]; metadataReady: boolean; metadataError: ApiError | null; now: Date;
}) {
  const { classes, exams, courses, semesters, metadataReady, metadataError, now } = input;
  const build = (ready: boolean, operation: () => InAppReminder[]) => {
    if (!ready) return { ready: false, items: [], error: null };
    try { return { ready: true, items: operation(), error: null }; }
    catch (error) { return { ready: false, items: [], error: asApiError(error) }; }
  };
  const classResult = build(metadataReady && classes.loaded && !classes.loading && !classes.error, () => buildServerClassReminders(classes, courses, semesters, now));
  const examResult = build(metadataReady && exams.loaded && !exams.loading && !exams.error, () => buildServerExamReminders(exams.value ?? [], courses, semesters, now));
  return { classItems: classResult.items, examItems: examResult.items, classesReady: classResult.ready, examsReady: examResult.ready,
    ready: classResult.ready && examResult.ready, error: metadataError ?? classes.error ?? classResult.error ?? exams.error ?? examResult.error };
}
