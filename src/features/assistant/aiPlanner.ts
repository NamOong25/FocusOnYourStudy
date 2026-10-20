import type { Course } from '../academics/academic';
import type { Task } from '../../store/model';
import { CalendarEvent, ClassException, ClassItem, Exam, calendarEvents, findConflicts } from '../schedule/calendar';
import { StudySession, endTime, timeMinutes } from '../study/learning';
import { addDays, dateKey, isValidDate, parseDay } from '../../shared/utils/dates';
import {deadlineTimestamp,sessionExceedsDeadline} from '../assignments/assignments';

export type PlanInput = { courseId: string; taskId?: string; examId?: string; goal: string; from: string; to: string; start: string; end: string; duration: number; count: number; original?: StudySession };
export type PlanDraft = { id: string; title: string; courseId: string; taskId?: string; date: string; start: string; duration: number; notes: string; selected: boolean; replaceId?: string };
export type AiProposal = { id: string; input: PlanInput; drafts: PlanDraft[] };
export type PlanContext = { courseCatalog: Course[]; tasks: Task[]; classes: ClassItem[]; classExceptions: ClassException[]; exams: Exam[]; studySessions: StudySession[] };
export type DraftIssue = { id: string; message: string; conflicts: CalendarEvent[] };
const validTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function validatePlanInput(input: PlanInput, context: PlanContext, now = new Date()) {
  if (!context.courseCatalog.some(c => c.id === input.courseId)) return 'Chọn môn học đang có trong danh sách.';
  if (!input.goal.trim() || input.goal.trim().length > 120) return 'Mục tiêu cần từ 1 đến 120 ký tự.';
  if (!isValidDate(input.from) || !isValidDate(input.to) || input.from > input.to || input.from < dateKey(now)) return 'Chọn khoảng ngày hợp lệ, bắt đầu từ hôm nay.';
  if (input.to > dateKey(addDays(parseDay(input.from), 13))) return 'Mỗi đề xuất tối đa 14 ngày. Hãy chia kế hoạch thành các đợt nhỏ.';
  if (!validTime(input.start) || !validTime(input.end) || input.start >= input.end) return 'Khung giờ rảnh cần dạng HH:mm, kết thúc sau bắt đầu trong cùng ngày.';
  if (!Number.isInteger(input.duration) || input.duration < 1 || input.duration > 240 || input.duration > timeMinutes(input.end) - timeMinutes(input.start)) return 'Thời lượng cần từ 1–240 phút và vừa khung giờ rảnh.';
  if (!Number.isInteger(input.count) || input.count < 1 || input.count > 6) return 'Chọn từ 1 đến 6 buổi cho mỗi đề xuất.';
  const task = context.tasks.find(t => t.id === input.taskId), exam = context.exams.find(e => e.id === input.examId);
  if (input.taskId && (!task || task.courseId !== input.courseId || task.status === 'Hoàn thành')) return 'Bài tập không còn phù hợp. Chọn bài chưa hoàn thành thuộc môn này.';
  if (input.examId && (!exam || exam.courseId !== input.courseId)) return 'Lịch thi không còn phù hợp với môn đang chọn.';
  if (task && input.from > task.deadline || exam && input.from > exam.date) return 'Khoảng học bắt đầu sau deadline. Chọn mục tiêu hoặc khoảng ngày khác.';
  if(task&&deadlineTimestamp(task)<now.getTime())return 'Bài tập đã quá hạn theo ngày và giờ. Chọn bài khác hoặc điều chỉnh deadline trước khi lập kế hoạch.';
  if (input.original) {
    const current = context.studySessions.find(s => s.id === input.original!.id);
    if (!current || JSON.stringify(current) !== JSON.stringify(input.original) || current.status !== 'Đã lên lịch' || current.focusedSeconds > 0) return 'Buổi gốc đã thay đổi hoặc đã bắt đầu. Đóng đề xuất và chọn lại buổi chưa học.';
    if (input.count !== 1 || input.courseId !== current.courseId || input.taskId !== current.taskId) return 'Điều chỉnh cần giữ môn/bài gốc và chỉ thay một buổi.';
  }
  return null;
}
export function generateProposal(id: string, input: PlanInput, context: PlanContext, now = new Date()): AiProposal {
  const drafts: PlanDraft[] = []; if (validatePlanInput(input, context, now)) return { id, input, drafts };
  const task = context.tasks.find(t => t.id === input.taskId), exam = context.exams.find(e => e.id === input.examId);
  for (let day = parseDay(input.from); dateKey(day) <= input.to && drafts.length < input.count; day = addDays(day, 1)) {
    const date = dateKey(day); if (task && date > task.deadline || exam && date > exam.date) continue;
    const events = calendarEvents(date, context.classes, context.classExceptions, context.exams, context.studySessions).filter(e => !(input.original && e.kind === 'Tự học' && e.id === input.original.id));
    for (let start = timeMinutes(input.start); start + input.duration <= timeMinutes(input.end) && drafts.length < input.count; start += 15) {
      const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`, ending = endTime(time, input.duration);
      if (start + input.duration >= 1440 || date === dateKey(now) && start < now.getHours() * 60 + now.getMinutes() || exam && date === exam.date && ending > exam.time) continue;
      if(task&&sessionExceedsDeadline(task,{date,start:time,duration:input.duration}))continue;
      const draftEvents: CalendarEvent[] = drafts.map(d => ({ id: d.id, kind: 'Tự học', title: d.title, date: d.date, start: d.start, end: endTime(d.start, d.duration + 10) }));
      if (findConflicts(date, time, ending, [...events, ...draftEvents]).length) continue;
      drafts.push({ id: `${id}-${drafts.length + 1}`, title: input.original?.title ?? `${input.goal.trim()} · Buổi ${drafts.length + 1}`, courseId: input.courseId, taskId: input.taskId, date, start: time, duration: input.duration, selected: true, replaceId: input.original?.id, notes: input.original?.notes ?? `Kế hoạch mẫu đã duyệt. ${exam ? `Ôn thi ${exam.course}. ` : ''}${input.goal.trim()}` });
    }
  }
  return { id, input: { ...input }, drafts };
}
export function validateProposal(proposal: AiProposal, context: PlanContext, now = new Date()): DraftIssue[] {
  const selected = proposal.drafts.filter(d => d.selected), baseError = validatePlanInput(proposal.input, context, now);
  if (baseError) return [{ id: 'all', message: baseError, conflicts: [] }];
  if (!selected.length) return [{ id: 'all', message: 'Chọn ít nhất một buổi để duyệt.', conflicts: [] }];
  if (selected.length > 6 || new Set(selected.map(d => d.id)).size !== selected.length) return [{ id: 'all', message: 'Danh sách buổi đề xuất chưa hợp lệ.', conflicts: [] }];
  const issues: DraftIssue[] = [];
  for (const d of selected) {
    const fail = (message: string, conflicts: CalendarEvent[] = []) => issues.push({ id: d.id, message, conflicts });
    const originalId = proposal.input.original?.id;
    if (d.courseId !== proposal.input.courseId || d.taskId !== proposal.input.taskId || d.replaceId !== originalId) { fail('Liên kết môn/bài/buổi gốc đã thay đổi. Tạo lại đề xuất.'); continue; }
    if (!d.title.trim() || d.title.trim().length > 150) { fail('Tên buổi cần từ 1 đến 150 ký tự.'); continue; }
    if (!isValidDate(d.date) || d.date < proposal.input.from || d.date > proposal.input.to || d.date < dateKey(now) || !validTime(d.start)) { fail('Ngày/giờ cần hợp lệ và nằm trong khoảng đã chọn.'); continue; }
    if (!Number.isInteger(d.duration) || d.duration < 1 || d.duration > 240 || timeMinutes(d.start) + d.duration >= 1440) { fail('Thời lượng cần từ 1–240 phút, kết thúc trước 24:00.'); continue; }
    const ending = endTime(d.start, d.duration);
    if (d.start < proposal.input.start || ending > proposal.input.end || d.date === dateKey(now) && timeMinutes(d.start) < now.getHours() * 60 + now.getMinutes()) { fail('Buổi học ngoài giờ rảnh hoặc thời điểm bắt đầu đã qua.'); continue; }
    const task = context.tasks.find(t => t.id === d.taskId), exam = context.exams.find(e => e.id === proposal.input.examId);
    if (task && sessionExceedsDeadline(task,d) || exam && (d.date > exam.date || d.date === exam.date && ending > exam.time)) { fail('Buổi học cần kết thúc không sau ngày/giờ hạn nộp bài hoặc trước lịch thi.'); continue; }
    if (!d.replaceId && context.studySessions.some(s => s.id === d.id)) { fail('Buổi đề xuất này đã được thêm.'); continue; }
    const events = calendarEvents(d.date, context.classes, context.classExceptions, context.exams, context.studySessions).filter(e => !(originalId && e.kind === 'Tự học' && e.id === originalId));
    const peers: CalendarEvent[] = selected.filter(p => p.id !== d.id && isValidDate(p.date) && validTime(p.start) && Number.isInteger(p.duration) && p.duration > 0).map(p => ({ id: p.id, kind: 'Tự học', title: p.title, date: p.date, start: p.start, end: endTime(p.start, p.duration) }));
    const conflicts = findConflicts(d.date, d.start, ending, [...events, ...peers]);
    if (conflicts.length) fail('Khung giờ bị trùng. Sửa giờ hoặc bỏ chọn buổi này.', conflicts);
  }
  return issues;
}
export function proposalSessions(proposal: AiProposal): StudySession[] {
  return proposal.drafts.filter(d => d.selected).map(d => ({ id: d.replaceId ?? d.id, title: d.title.trim(), courseId: d.courseId, taskId: d.taskId, date: d.date, start: d.start, duration: d.duration, notes: d.notes, status: 'Đã lên lịch', focusedSeconds: 0 }));
}
