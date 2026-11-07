import { ApiError } from '../../../shared/api/http';
import { dateKey, isValidDate } from '../../../shared/utils/dates';
import type { ServerOccurrence, ServerRule } from '../api/scheduleApi';

export type OverviewQuery = { semesterId: string; courseId?: string; today: string } | { reminders: true; today: string };
export type OverviewSnapshot = { rules: ServerRule[]; rows: ServerOccurrence[] };
export type DateWindow = { from: string; to: string };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
export function overviewKey(q: OverviewQuery) {
  if (!isValidDate(q.today) || q.today < '1900-01-01' || q.today > '2099-12-31'
    || ('reminders' in q ? q.reminders !== true : !uuid.test(q.semesterId) || q.courseId !== undefined && !uuid.test(q.courseId)))
    throw new ApiError('Chọn đúng học kỳ, môn và ngày xem lịch.', 'INVALID_CLASS_RANGE');
  return 'reminders' in q ? `reminders:${q.today}` : `${q.semesterId}:${q.courseId ?? '*'}:${q.today}`;
}
export function shiftDate(date: string, days: number) { return new Date(Date.parse(date + 'T00:00:00Z') + days * 86400000).toISOString().slice(0, 10); }
// The viewer and a class may be on opposite sides of the date line. Include
// two earlier source dates, then classify by actual UTC instants in the UI.
export function overviewFrom(today: string) { return today < '1900-01-03' ? '1900-01-01' : shiftDate(today, -2); }
export function overviewWindows(rules: ServerRule[], today: string, through = '2099-12-31'): DateWindow[] {
  const from = overviewFrom(today), intervals = rules.filter(r => r.endsOn >= from && r.startsOn <= through)
    .map(r => ({ from: r.startsOn > from ? r.startsOn : from, to: r.endsOn < through ? r.endsOn : through })).sort((a, b) => a.from.localeCompare(b.from));
  const merged: DateWindow[] = [];
  for (const interval of intervals) {
    const previous = merged[merged.length - 1];
    if (previous && interval.from <= shiftDate(previous.to, 1)) { if (interval.to > previous.to) previous.to = interval.to; }
    else merged.push({ ...interval });
  }
  // The existing occurrences API accepts at most 92 inclusive calendar days.
  return merged.flatMap(interval => {
    const windows: DateWindow[] = [];
    for (let start = interval.from; start <= interval.to; start = shiftDate(start, 92)) {
      const end = shiftDate(start, 91); windows.push({ from: start, to: end < interval.to ? end : interval.to });
    }
    return windows;
  });
}
export function expectedOccurrences(rules: ServerRule[], today: string, through = '2099-12-31') {
  const result = new Set<string>(), from = overviewFrom(today);
  for (const rule of rules) for (let date = rule.startsOn > from ? rule.startsOn : from; date <= rule.endsOn && date <= through; date = shiftDate(date, 1)) {
    if (rule.weekdays.includes(new Date(date + 'T00:00:00Z').getUTCDay() || 7)) result.add(`${rule.id}:${date}`);
  }
  return result;
}
export function projectOverview(snapshot: OverviewSnapshot, now: Date) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start); end.setDate(end.getDate() + 1);
  const active = snapshot.rows.filter(r => !r.cancelled).sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.scheduleId.localeCompare(b.scheduleId));
  const today = active.filter(r => Date.parse(r.startsAt) < end.getTime() && Date.parse(r.endsAt) > start.getTime());
  const remaining = active.filter(r => Date.parse(r.endsAt) > now.getTime());
  return { today, remaining, next: remaining[0], hasRules: snapshot.rules.length > 0 };
}
export function occurrenceStatus(row: ServerOccurrence, now: Date) {
  return Date.parse(row.endsAt) <= now.getTime() ? 'Đã kết thúc' : Date.parse(row.startsAt) <= now.getTime() ? 'Đang học' : 'Sắp học';
}
export function occurrenceClock(row: ServerOccurrence) {
  const start = new Date(row.startsAt), end = new Date(row.endsAt);
  const clock = (value: Date) => `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  return { date: dateKey(start), endDate: dateKey(end), start: clock(start), end: clock(end),
    different: dateKey(start) !== row.date || clock(start) !== row.startTime || clock(end) !== row.endTime };
}
