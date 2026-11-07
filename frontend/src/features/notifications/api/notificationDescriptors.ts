import { ApiError } from '../../../shared/api/http';
import type { Course, Semester } from '../../academics/academic';
import type { Task } from '../../assignments/assignments';
import type { ServerExam } from '../../exams/api/examsApi';
import type { ServerOccurrence } from '../../schedule/api/scheduleApi';
import type { InAppReminder } from '../notifications';
import { targetKey, validBasis, validTarget, type ReadBasis, type ReadTarget } from './notificationReadApi';

export type ReminderDescriptor = { id: string; localRevision: string; target: ReadTarget; basis: ReadBasis };
export function descriptorKey(items: ReminderDescriptor[]) {
  return JSON.stringify(items.map(x => [x.id,x.localRevision,targetKey(x.target),x.basis]));
}
export function describeReminders(items: InAppReminder[], sources: { tasks: Task[]; courses: Course[]; semesters: Semester[]; exams: ServerExam[]; rows: ServerOccurrence[] }, now: Date): ReminderDescriptor[] {
  const courses = new Map(sources.courses.map(c => [c.id,c])), terms = new Map(sources.semesters.map(s => [s.id,s]));
  const tasks = new Map(sources.tasks.map(t => [t.id,t])), exams = new Map(sources.exams.map(e => [e.id,e]));
  const rows = new Map(sources.rows.map(r => [`${r.scheduleId}:${r.date}`,r]));
  const result = items.map(item => {
    const t = item.target;
    let courseId: string | undefined, sourceVersion: number | undefined, milestoneMinutes: number | undefined, target: ReadTarget;
    if (t.kind === 'task') { const task=tasks.get(t.id); courseId=task?.courseId;sourceVersion=task?.version;target={kind:'ASSIGNMENT',sourceId:t.id,occurrenceDate:null}; }
    else if (t.kind === 'saved-exam') {
      const exam=exams.get(t.id);courseId=exam?.courseId;sourceVersion=exam?.version;target={kind:'EXAM',sourceId:t.id,occurrenceDate:null};
      const reached=exam?.reminderMinutes.filter(m => now.getTime() >= Date.parse(exam.startsAt)-m*60000) ?? [];
      if (reached.length) milestoneMinutes=Math.min(...reached);
      if (milestoneMinutes === undefined) throw staleSource();
    } else if (t.kind === 'saved-class') { const row=rows.get(`${t.id}:${t.date}`);courseId=row?.courseId;sourceVersion=row?.scheduleVersion;target={kind:'CLASS',sourceId:t.id,occurrenceDate:t.date}; }
    else throw staleSource();
    const course=courseId ? courses.get(courseId) : undefined, semester=course ? terms.get(course.semesterId) : undefined;
    const basis={sourceVersion,courseVersion:course?.version,semesterVersion:semester?.version,...(milestoneMinutes === undefined ? {} : {milestoneMinutes})};
    if (!validTarget(target) || !validBasis(basis)) throw staleSource();
    return {id:item.id,localRevision:item.revision,target,basis};
  });
  if (new Set(result.map(x => x.id)).size !== result.length || new Set(result.map(x => targetKey(x.target))).size !== result.length) throw staleSource();
  return result;
}
export const staleSource = () => new ApiError('Nội dung lời nhắc đã thay đổi. Tải lại nhắc việc rồi xem bản mới trước khi đánh dấu đã đọc.', 'NOTIFICATION_SOURCES_CHANGED');
