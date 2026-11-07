import type { Course } from './academic';
import type { Task } from '../assignments/assignments';
import type { ClassItem, Exam } from '../schedule/calendar';
import type { StudySession } from '../study/learning';
import type { GradeBook } from '../grades/grades';
import { hasGradeData } from '../grades/grades';

export function courseGradeLinks(id: string, book: GradeBook) {
  const related = new Set<string>(), pending = [id];
  while (pending.length) {
    const current = pending.pop()!; if (related.has(current)) continue; related.add(current);
    const previous = book[current]?.previousCourseId; if (previous) pending.push(previous);
    for (const [next, record] of Object.entries(book)) if (record.previousCourseId === current) pending.push(next);
  }
  const hasScores = [...related].some(key => hasGradeData(book[key]));
  // Automatically derived links between empty attempts are not entered grade data.
  return { retakeLinked: related.size > 1 && hasScores, gradeLinked: hasScores };
}

// Trial learning data never becomes server data during catalogue refresh.
export function reconcileCourseLinks(previous: Course[], next: Course[], data: {
  tasks: Task[]; classes: ClassItem[]; exams: Exam[]; studySessions: StudySession[]; gradeBook: GradeBook;
}) {
  const before = new Map(previous.map(c => [c.id, c])), after = new Map(next.map(c => [c.id, c]));
  const invalidated = new Set(previous.filter(c => !after.has(c.id) || after.get(c.id)!.semesterId !== c.semesterId).map(c => c.id));
  const keep = (value: { courseId: string }) => !invalidated.has(value.courseId);
  const tasks = data.tasks.filter(keep).map(t => after.has(t.courseId) ? { ...t, course: after.get(t.courseId)!.name } : t);
  const classes = data.classes.filter(keep).map(c => {
    const current = after.get(c.courseId), old = before.get(c.courseId);
    return current ? { ...c, title: current.name, teacher: old && c.teacher === old.teacher ? current.teacher : c.teacher } : c;
  });
  const exams = data.exams.filter(keep).map(e => after.has(e.courseId) ? { ...e, course: after.get(e.courseId)!.name } : e);
  const studySessions = data.studySessions.filter(keep);
  let cleared = data.tasks.length - tasks.length + data.classes.length - classes.length + data.exams.length - exams.length + data.studySessions.length - studySessions.length;
  const gradeBook: GradeBook = {};
  for (const [id, record] of Object.entries(data.gradeBook)) {
    if (invalidated.has(id)) { cleared++; continue; }
    if (record.previousCourseId && invalidated.has(record.previousCourseId)) {
      const { previousCourseId, ...rest } = record; gradeBook[id] = rest; cleared++;
    } else gradeBook[id] = record;
  }
  return { tasks, classes, exams, studySessions, gradeBook, invalidated, cleared };
}
