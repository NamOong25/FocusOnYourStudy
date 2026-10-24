import { addDays, dateKey, parseDay, isValidDate } from '../../shared/utils/dates';
import { deviceTimeZone, validTimeZone } from '../study/studyTime';
import { ruleInput, type RuleInput, type ServerRule } from './api/scheduleApi';
export function ruleDraft(original?: ServerRule, defaults?: { date?: string; courseId?: string; room?: string; teacher?: string }) {
  const startsOn = defaults?.date ?? dateKey(new Date());
  return { courseId: original?.courseId ?? defaults?.courseId ?? '', weekdays: [...(original?.weekdays ?? [parseDay(startsOn).getDay() || 7])].sort((a, b) => a - b),
    startsOn: original?.startsOn ?? startsOn, endsOn: original?.endsOn ?? (dateKey(addDays(parseDay(startsOn), 90)) > '2099-12-31' ? '2099-12-31' : dateKey(addDays(parseDay(startsOn), 90))),
    startTime: original?.startTime ?? '07:00', endTime: original?.endTime ?? '09:00', timeZone: original?.timeZone ?? deviceTimeZone(),
    room: original?.room ?? defaults?.room ?? '', teacher: original?.teacher ?? defaults?.teacher ?? '', notes: original?.notes ?? '', reminderMinutes: String(original?.reminderMinutes ?? 15) };
}
export type RuleDraft = ReturnType<typeof ruleDraft>;
export function draftInput(draft: RuleDraft): RuleInput {
  if (!draft.weekdays.length) throw new Error('Chọn ít nhất một thứ trong tuần.');
  const span = (Date.parse(draft.endsOn + 'T00:00:00Z') - Date.parse(draft.startsOn + 'T00:00:00Z')) / 86400000;
  if (!isValidDate(draft.startsOn) || !isValidDate(draft.endsOn) || span < 0 || span > 365 || draft.startsOn < '1900-01-01' || draft.endsOn > '2099-12-31') throw new Error('Khoảng áp dụng cần từ 1 đến 366 ngày, trong năm 1900–2099.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(draft.endTime) || draft.startTime >= draft.endTime) throw new Error('Giờ kết thúc phải sau giờ bắt đầu, trước 24:00 cùng ngày.');
  if (!validTimeZone(draft.timeZone.trim())) throw new Error('Múi giờ chưa hợp lệ. Ví dụ: Asia/Ho_Chi_Minh.');
  if (!/^\d{1,5}$/.test(draft.reminderMinutes)) throw new Error('Mốc nhắc cần là số phút nguyên từ 0 đến 10080.');
  return ruleInput({ ...draft, reminderMinutes: Number(draft.reminderMinutes) });
}
export function firstRuleDate(rule: RuleInput) {
  for (let d = parseDay(rule.startsOn); dateKey(d) <= rule.endsOn; d = addDays(d, 1)) if (rule.weekdays.includes(d.getDay() || 7)) return dateKey(d);
  return rule.startsOn;
}
