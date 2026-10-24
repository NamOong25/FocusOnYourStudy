import { addDays, dateKey } from '../../shared/utils/dates';
export type CalendarView = 'Theo ngày' | 'Theo tuần' | 'Theo tháng';
export function scheduleWindow(selected: Date, view: CalendarView) {
  const monday = addDays(selected, -((selected.getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const start = addDays(first, -((first.getDay() + 6) % 7));
  const month = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const grid = view === 'Theo tháng' ? month : week;
  return { grid, days: view === 'Theo tuần' ? week.filter(d => dateKey(d) >= '1900-01-01' && dateKey(d) <= '2099-12-31') : [selected],
    from: dateKey(grid[0]!) < '1900-01-01' ? '1900-01-01' : dateKey(grid[0]!),
    to: dateKey(grid[grid.length - 1]!) > '2099-12-31' ? '2099-12-31' : dateKey(grid[grid.length - 1]!) };
}
