import { dateKey, isValidDate, parseDay } from './dates';

export const firstPickerYear = 1900, lastPickerYear = 2100;
export const pad = (n: number) => String(n).padStart(2, '0');
export const isTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function displayDate(value: string) { return isValidDate(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : 'Chọn ngày'; }
export function dateInMonth(year: number, month: number, day: number) {
  const y = Math.max(firstPickerYear, Math.min(lastPickerYear, year));
  const m = Math.max(0, Math.min(11, month));
  return dateKey(new Date(y, m, Math.min(Math.max(1, day), new Date(y, m + 1, 0).getDate())));
}
export function initialPickerDate(value: string, fallback = new Date()) {
  const d = isValidDate(value) ? parseDay(value) : fallback;
  return dateInMonth(d.getFullYear(), d.getMonth(), d.getDate());
}
export function moveMonth(value: string, amount: number) {
  const d = parseDay(value), next = new Date(d.getFullYear(), d.getMonth() + amount, 1);
  if (next.getFullYear() < firstPickerYear || next.getFullYear() > lastPickerYear) return value;
  return dateInMonth(next.getFullYear(), next.getMonth(), d.getDate());
}
export function monthCells(year: number, month: number): (string | null)[] {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7, count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: 42 }, (_, i) => i < offset || i >= offset + count ? null : dateKey(new Date(year, month, i - offset + 1)));
}
