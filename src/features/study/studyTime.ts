import { ApiError } from '../../shared/api/http';
import { dateKey, isValidDate } from '../../shared/utils/dates';
import type { StudySession } from './learning';

export type StudyInput = Pick<StudySession, 'title' | 'courseId' | 'taskId' | 'date' | 'start' | 'duration' | 'notes' | 'status'>;
export function deviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
export function zonedDay(at: number, zone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function validTimeZone(zone: string) {
  try { new Intl.DateTimeFormat('en', { timeZone: zone }).format(0); return !!zone && zone.length <= 100; } catch { return false; }
}
export function studyStartTimestamp(session: Pick<StudySession, 'date' | 'start' | 'startsAt'>) {
  return session.startsAt ? Date.parse(session.startsAt) : new Date(`${session.date}T${session.start}:00`).getTime();
}
export function studyEndTimestamp(session: Pick<StudySession, 'date' | 'start' | 'startsAt' | 'duration'>) {
  return studyStartTimestamp(session) + session.duration * 60_000;
}
export function localTime(at: number) {
  const date = new Date(at); return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
export function studyTimeLabel(session: Pick<StudySession, 'date' | 'start' | 'startsAt' | 'duration'>) {
  const end = studyEndTimestamp(session);
  return `${session.start} – ${localTime(end)}${dateKey(new Date(end)) !== session.date ? ' (ngày sau)' : ''}`;
}
export function studyTiming(input: StudyInput, original?: StudySession) {
  if (!isValidDate(input.date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.start) || !Number.isInteger(input.duration) || input.duration < 1 || input.duration > 240)
    throw new ApiError('Chọn ngày, giờ và thời lượng từ 1 đến 240 phút hợp lệ.', 'INVALID_STUDY_TIME');
  const retained = !!original?.startsAt && original.date === input.date && original.start === input.start;
  const timeZone = retained ? original.timeZone! : deviceTimeZone();
  const start = retained ? Date.parse(original.startsAt!) : new Date(`${input.date}T${input.start}:00`).getTime();
  const end = start + input.duration * 60_000;
  if (!validTimeZone(timeZone) || !Number.isFinite(start) || start < Date.UTC(1900, 0, 1) || end >= Date.UTC(2100, 0, 1))
    throw new ApiError('Ngày giờ hoặc múi giờ chưa hợp lệ trong khoảng năm 1900–2099.', 'INVALID_STUDY_TIME');
  // Date normalizes nonexistent DST times; require the selection to round-trip instead.
  if (!retained && (dateKey(new Date(start)) !== input.date || localTime(start) !== input.start))
    throw new ApiError('Giờ này không tồn tại trong múi giờ thiết bị. Chọn giờ khác.', 'INVALID_STUDY_TIME');
  if (zonedDay(start, timeZone) !== zonedDay(end, timeZone))
    throw new ApiError('Buổi học phải kết thúc trước 24:00 cùng ngày theo múi giờ của buổi.', 'INVALID_STUDY_TIME');
  return { startsAt: retained ? original.startsAt! : new Date(start).toISOString(), endsAt: new Date(end).toISOString(), timeZone };
}
export function studyOverlaps(left: Pick<StudySession, 'date' | 'start' | 'startsAt' | 'duration'>, right: Pick<StudySession, 'date' | 'start' | 'startsAt' | 'duration'>) {
  return studyStartTimestamp(left) < studyEndTimestamp(right) && studyEndTimestamp(left) > studyStartTimestamp(right);
}
