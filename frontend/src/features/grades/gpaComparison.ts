import type { Course, Semester } from '../academics/academic';
import { courseResult, formatGpa, summarizeGrades, type GradeBook, type GradeRules } from './grades';

export function orderedGpaSemesters(semesters: Semester[]) {
  return [...semesters].sort((a, b) => a.academicYear.localeCompare(b.academicYear) || a.term - b.term || a.id.localeCompare(b.id));
}
export function resolveGpaPair(semesters: Semester[], selected: { base?: string; target?: string }) {
  const ordered = orderedGpaSemesters(semesters);
  if (ordered.length < 2) return { base: ordered[0], target: undefined };
  const target = ordered.find(semester => semester.id === selected.target) ?? ordered.find(semester => semester.status === 'Đang học') ?? ordered[ordered.length - 1]!;
  const base = ordered.find(semester => semester.id === selected.base && semester.id !== target.id)
    ?? ordered[ordered.findIndex(semester => semester.id === target.id) - 1]
    ?? ordered.find(semester => semester.id !== target.id)!;
  return { base, target };
}
export function semesterGpaReport(semester: Semester, catalog: Course[], book: GradeBook, rules: GradeRules) {
  const courses = catalog.filter(course => course.semesterId === semester.id);
  const summary = summarizeGrades(courses, book, rules);
  const excludedPassFail = courses.filter(course => book[course.id]?.assessment === 'pass-fail').length;
  const gpaCourseCount = courses.length - excludedPassFail;
  const pending = courses.filter(course => book[course.id]?.assessment !== 'pass-fail' && !courseResult(book[course.id], rules).completeForGpa).length;
  const provisional = summary.gpa !== null && pending > 0;
  return { semester, courses, summary, excludedPassFail, gpaCourseCount, pending, provisional,
    status: summary.gpa === null ? 'Chưa đủ dữ liệu' : provisional ? 'GPA tạm tính' : 'Đủ kết quả tính GPA',
    unavailableReason: !courses.length ? 'Học kỳ chưa có môn học.' : !gpaCourseCount ? 'Học kỳ chỉ có môn đạt/không đạt, không tham gia GPA.' : 'Chưa có môn đủ điều kiện để tính GPA.',
  };
}
export type SemesterGpaReport = ReturnType<typeof semesterGpaReport>;

export function compareSemesterGpa(base: SemesterGpaReport, target: SemesterGpaReport) {
  if (base.semester.id === target.semester.id || base.summary.gpa === null || target.summary.gpa === null) return null;
  // Match the two visible GPA values. Preserve the original weighted GPA in reports.
  const difference = Math.round((Number(formatGpa(target.summary.gpa)) - Number(formatGpa(base.summary.gpa))) * 100) / 100;
  const amount = Object.is(difference, -0) ? 0 : difference;
  return { amount, direction: amount > 0 ? 'increase' as const : amount < 0 ? 'decrease' as const : 'same' as const, provisional: base.provisional || target.provisional };
}
