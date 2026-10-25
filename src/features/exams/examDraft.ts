import { ApiError } from '../../shared/api/http';
import { dateKey, isValidDate } from '../../shared/utils/dates';
import { deviceTimeZone, validTimeZone, zonedDay } from '../study/studyTime';
import { examClock } from './examView';
import { examInput, type ExamInput, type ServerExam } from './api/examsApi';

export function examDraft(original?: ServerExam, courseId = '') {
  return { courseId: original?.courseId ?? courseId, kind: original?.kind ?? 'MIDTERM' as ServerExam['kind'],
    format: original?.format ?? 'WRITTEN' as ServerExam['format'], date: original ? zonedDay(Date.parse(original.startsAt), original.timeZone) : dateKey(new Date()),
    start: original ? examClock(original.startsAt, original.timeZone) : '08:00', end: original ? examClock(original.endsAt, original.timeZone) : '10:00',
    timeZone: original?.timeZone ?? deviceTimeZone(), startChoice: original?.startsAt ?? '', endChoice: original?.endsAt ?? '',
    room: original?.room ?? '', notes: original?.notes ?? '', reminder: original?.reminder ?? true, minutes: [...(original?.reminderMinutes ?? [1440, 180])] };
}
export type ExamDraft = ReturnType<typeof examDraft>;
// Resolve a wall-clock selection in its source zone, including repeated/missing DST clocks.
// Sampling offsets around the day also retains historical offsets containing seconds.
export function examInstants(day: string, time: string, zone: string): string[] {
  if (!isValidDate(day) || day < '1900-01-01' || day > '2099-12-31' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !validTimeZone(zone)) return [];
  const wall = Date.parse(`${day}T${time}:00Z`), offsets = new Set<number>();
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let h = -36; h <= 36; h += 6) {
    const at = wall + h * 3600000, parts = formatter.formatToParts(at), part = (type: string) => parts.find(p => p.type === type)!.value;
    offsets.add(Date.parse(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}Z`) - at);
  }
  return [...offsets].map(offset => wall - offset).filter(at => zonedDay(at, zone) === day && examClock(new Date(at).toISOString(), zone) === time
    && Number(formatter.formatToParts(at).find(p => p.type === 'second')!.value) === 0).sort((a, b) => a - b).map(at => new Date(at).toISOString());
}
export function examDraftInput(draft: ExamDraft): ExamInput {
  const zone = draft.timeZone.trim();
  if (!validTimeZone(zone)) throw new ApiError('Múi giờ chưa hợp lệ. Ví dụ: Asia/Ho_Chi_Minh.', 'INVALID_EXAM_TIME');
  const pick = (time: string, choice: string, label: string) => {
    const candidates = examInstants(draft.date, time, zone);
    if (!candidates.length) throw new ApiError(`${label} chưa hợp lệ hoặc không tồn tại trong múi giờ đã chọn (năm 1900–2099).`, 'INVALID_EXAM_TIME');
    const selected = candidates.find(at => Date.parse(at) === Date.parse(choice));
    if (candidates.length > 1 && !selected) throw new ApiError(`${label} xuất hiện hai lần khi đổi giờ mùa. Chọn rõ lần xuất hiện bên dưới.`, 'AMBIGUOUS_EXAM_TIME');
    // Keep the original instant when no wall-clock field changed, including DST folds.
    return selected ? choice : candidates[0]!;
  };
  const startsAt = pick(draft.start, draft.startChoice, 'Giờ bắt đầu'), endsAt = pick(draft.end, draft.endChoice, 'Giờ kết thúc');
  if (Date.parse(startsAt) >= Date.parse(endsAt)) throw new ApiError('Giờ kết thúc phải sau bắt đầu và trước 24:00 cùng ngày.', 'INVALID_EXAM_TIME');
  if (draft.room.trim().length > 100 || draft.notes.trim().length > 5000) throw new ApiError('Phòng thi tối đa 100 ký tự, ghi chú tối đa 5000 ký tự.', 'INVALID_EXAM_INPUT');
  if (draft.reminder && !draft.minutes.length) throw new ApiError('Chọn ít nhất một mốc nhắc hoặc chọn Không nhắc.', 'INVALID_EXAM_INPUT');
  return examInput({ courseId: draft.courseId, kind: draft.kind, format: draft.format, startsAt, endsAt, timeZone: zone, room: draft.room, notes: draft.notes,
    reminder: draft.reminder, reminderMinutes: draft.reminder ? [...draft.minutes] : [] });
}
