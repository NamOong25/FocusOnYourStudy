import { addDays, dateKey, isValidDate, parseDay } from '../../shared/utils/dates';
import type { StudySession } from './learning';
import { studyStartTimestamp } from './studyTime';

export type StudyView = { date: string; period: 'Theo ngày' | 'Theo tuần'; filter: 'Tất cả' | 'Chưa xong' | 'Hoàn thành' };
type Action = { type: 'date'; date: string } | { type: 'period' | 'filter'; value: string }
  | { type: 'plan-saved'; startsAt: readonly string[] };
export const createStudyView = (date: string): StudyView => ({ date, period: 'Theo ngày', filter: 'Tất cả' });

export function studyViewReducer(state: StudyView, action: Action): StudyView {
  if (action.type === 'plan-saved') {
    const times = action.startsAt.map(Date.parse).filter(Number.isFinite);
    // Match the device-local date used by studyApi, including plans in another zone.
    return times.length ? createStudyView(dateKey(new Date(Math.min(...times)))) : state;
  }
  if (action.type === 'date') return isValidDate(action.date) ? { ...state, date: action.date } : state;
  if (action.type === 'period' && (action.value === 'Theo ngày' || action.value === 'Theo tuần')) return { ...state, period: action.value };
  if (action.type === 'filter' && ['Tất cả', 'Chưa xong', 'Hoàn thành'].includes(action.value)) return { ...state, filter: action.value as StudyView['filter'] };
  return state;
}

export function studyViewData(sessions: StudySession[], view: StudyView) {
  const monday = addDays(parseDay(view.date), -((parseDay(view.date).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
  const days = view.period === 'Theo ngày' ? [view.date] : week;
  const inRange = sessions.filter(s => days.includes(s.date));
  const list = inRange.filter(s => view.filter === 'Tất cả' || (view.filter === 'Hoàn thành' ? s.status === 'Hoàn thành' : s.status !== 'Hoàn thành'))
    .sort((a, b) => studyStartTimestamp(a) - studyStartTimestamp(b));
  return { week, days, inRange, list, pending: inRange.filter(s => s.status !== 'Hoàn thành') };
}
