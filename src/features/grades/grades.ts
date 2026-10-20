import { Course } from '../academics/academic';

export type GradePart = { id: string; name: string; weight: number; score: number | null };
export type CourseGrades = { parts: GradePart[]; previousCourseId?: string };
export type GradeBook = Record<string, CourseGrades>;
export type GradeRules = { scale: 'expanded' | 'simple'; decimals: 1 | 2; retake: 'latest' | 'highest' };
export const defaultRules: GradeRules = { scale: 'expanded', decimals: 1, retake: 'highest' };
export const gradeScales = {
  expanded: [{ min: 8.5, letter: 'A', point: 4 }, { min: 8, letter: 'B+', point: 3.5 }, { min: 7, letter: 'B', point: 3 }, { min: 6.5, letter: 'C+', point: 2.5 }, { min: 5.5, letter: 'C', point: 2 }, { min: 5, letter: 'D+', point: 1.5 }, { min: 4, letter: 'D', point: 1 }, { min: 0, letter: 'F', point: 0 }],
  simple: [{ min: 8.5, letter: 'A', point: 4 }, { min: 7, letter: 'B', point: 3 }, { min: 5.5, letter: 'C', point: 2 }, { min: 4, letter: 'D', point: 1 }, { min: 0, letter: 'F', point: 0 }],
};
export function emptyGrades(): CourseGrades { return { parts: [{ id: 'regular', name: 'Thường xuyên', weight: 20, score: null }, { id: 'mid', name: 'Giữa kỳ', weight: 30, score: null }, { id: 'final', name: 'Cuối kỳ', weight: 50, score: null }] }; }
function example(scores: (number | null)[]): CourseGrades { return { parts: emptyGrades().parts.map((p,i) => ({ ...p, score: scores[i] ?? null })) }; }
export const initialGradeBook: GradeBook = {
  'course-oop': example([8,7.5,null]),
  'course-db': example([8,8,8.5]),
  'course-network': example([7,7.5,8]),
  'course-intro': example([8,8.5,9]),
  'course-linear': example([6,7,7]),
};
export function validateGrades(parts: GradePart[]): string | null {
  if (!parts.length || parts.length > 10) return 'Cần từ 1 đến 10 thành phần điểm.';
  if (new Set(parts.map(p => p.id)).size !== parts.length) return 'Các thành phần cần có mã riêng.';
  if (parts.some(p => !p.name.trim())) return 'Nhập tên cho từng thành phần điểm.';
  if (parts.some(p => !Number.isFinite(p.weight) || p.weight <= 0 || p.weight > 100)) return 'Trọng số phải lớn hơn 0 và không quá 100%.';
  if (Math.abs(parts.reduce((s,p) => s+p.weight,0)-100) > 0.000001) return 'Tổng trọng số phải bằng 100%.';
  if (parts.some(p => p.score !== null && (!Number.isFinite(p.score) || p.score < 0 || p.score > 10))) return 'Điểm cần từ 0 đến 10; để trống nếu chưa có.';
  return null;
}
export function courseResult(record: CourseGrades | undefined, rules: GradeRules) {
  const parts = record?.parts ?? emptyGrades().parts; const valid = validateGrades(parts) === null;
  const entered = parts.filter(p => p.score !== null); const complete = valid && entered.length === parts.length;
  const raw = complete ? parts.reduce((sum,p) => sum + p.score! * p.weight / 100,0) : null;
  const factor = 10 ** rules.decimals;
  const total = raw === null ? null : Math.round((raw + Number.EPSILON * Math.max(1,Math.abs(raw))) * factor) / factor;
  const band = total === null ? null : gradeScales[rules.scale].find(b => total >= b.min)!;
  return { valid, complete, entered: entered.length, count: parts.length, enteredWeight: entered.reduce((s,p) => s+p.weight,0), total, raw, letter: band?.letter ?? null, point: band?.point ?? null, passed: total !== null && total >= 4 };
}
export function rootCourseId(id: string, book: GradeBook) {
  const seen = new Set<string>(); let current = id;
  while (book[current]?.previousCourseId && !seen.has(current)) { seen.add(current); current = book[current]!.previousCourseId!; }
  return current;
}
export function attemptDepth(id: string, book: GradeBook) {
  const seen = new Set<string>(); let current = id, count = 0;
  while (book[current]?.previousCourseId && !seen.has(current)) { seen.add(current); count++; current = book[current]!.previousCourseId!; }
  return count;
}
export function validateRetake(id: string, previousId: string | undefined, catalog: Course[], book: GradeBook) {
  if (!previousId) return null;
  const course = catalog.find(c => c.id === id), previous = catalog.find(c => c.id === previousId);
  if (!course || !previous || id === previousId) return 'Chọn môn đã học trước đó hợp lệ.';
  if (course.semesterId === previous.semesterId) return 'Lần học trước cần thuộc học kỳ khác.';
  if (course.credits !== previous.credits) return 'Bản mẫu chỉ gộp các lần học có cùng số tín chỉ.';
  const seen = new Set([id]); let next: string | undefined = previousId;
  while (next) { if (seen.has(next)) return 'Liên kết học lại tạo vòng lặp.'; seen.add(next); next = book[next]?.previousCourseId; }
  if (Object.entries(book).some(([key, value]) => key !== id && value.previousCourseId === previousId)) return 'Môn này đã có lần học tiếp theo. Hãy chọn lần học gần nhất trong chuỗi.';
  return null;
}
export function summarizeGrades(catalog: Course[], book: GradeBook, rules: GradeRules, cumulative = false) {
  const eligible = catalog.filter(c => courseResult(book[c.id],rules).complete);
  let selected = eligible;
  if (cumulative) {
    const groups = new Map<string, Course[]>();
    for (const course of eligible) { const root = rootCourseId(course.id,book); groups.set(root,[...(groups.get(root) ?? []),course]); }
    selected = [...groups.values()].map(group => [...group].sort((a,b) => {
      if (rules.retake === 'highest') { const diff = courseResult(book[b.id],rules).point! - courseResult(book[a.id],rules).point!; if (diff) return diff; }
      return attemptDepth(b.id,book) - attemptDepth(a.id,book);
    })[0]!);
  }
  const scoredCredits = selected.reduce((sum,c) => sum+c.credits,0);
  const earnedCredits = selected.filter(c => courseResult(book[c.id],rules).passed).reduce((sum,c) => sum+c.credits,0);
  const gpa = scoredCredits ? selected.reduce((sum,c) => sum+courseResult(book[c.id],rules).point!*c.credits,0)/scoredCredits : null;
  return { gpa, scoredCredits, earnedCredits, completeCourses: eligible.length, totalCourses: catalog.length, excludedIncomplete: catalog.length-eligible.length, selectedIds: selected.map(c=>c.id), selectedCount: selected.length };
}
export function requiredRemaining(record: CourseGrades | undefined, target: number) {
  const parts = record?.parts ?? emptyGrades().parts;
  if (!Number.isFinite(target) || target < 0 || target > 10 || validateGrades(parts)) return null;
  const missing = parts.filter(p=>p.score===null), weight = missing.reduce((s,p)=>s+p.weight,0);
  if (!weight) return null;
  const known = parts.reduce((s,p)=>s+(p.score ?? 0)*p.weight/100,0);
  return { needed: (target-known)/(weight/100), weight, missingCount: missing.length };
}
export function formatGpa(value: number | null) { return value === null ? '—' : value.toFixed(2); }
