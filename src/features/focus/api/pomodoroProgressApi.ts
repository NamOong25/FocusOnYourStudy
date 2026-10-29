import { ApiError, assertNotCancelled, type createHttpClient } from '../../../shared/api/http';
import type { Authorized } from './pomodoroApi';
import { createPomodoroInsightsApi, type PomodoroDaily } from './pomodoroInsightsApi';
import { createStreakApi, streakKey, type PomodoroStreak } from './pomodoroStreakApi';

export type PomodoroProgress = { daily: PomodoroDaily; streak: PomodoroStreak };
export type ProgressQuery = { timeZone: string; dayKey: string };
export function progressKey(q: ProgressQuery) { streakKey(q); return JSON.stringify([q.timeZone, q.dayKey]); }
export function createProgressReader(api: { streak: ReturnType<typeof createStreakApi>['read']; daily: ReturnType<typeof createPomodoroInsightsApi>['daily'] }) {
  return async (q: ProgressQuery, signal?: AbortSignal): Promise<PomodoroProgress> => {
    progressKey(q);
    for (let attempt = 0; attempt < 2; attempt++) {
      assertNotCancelled(signal);
      // Server decides today's date. The device dayKey only invalidates the read after midnight.
      const streak = await api.streak({ timeZone: q.timeZone }, signal);
      const daily = await api.daily({ date: streak.today, timeZone: q.timeZone }, signal);
      assertNotCancelled(signal);
      const day = streak.calendar.days.find(day => day.date === streak.today);
      if (day && daily.date === streak.today && daily.timeZone === q.timeZone && daily.completedSessions === day.completedSessions && daily.studyMillis === day.studyMillis && daily.from === day.from && daily.to === day.to) return { daily, streak };
    }
    throw new ApiError('Số liệu vừa thay đổi. Hãy cập nhật lại tiến độ để xem cùng một kết quả.', 'POMODORO_PROGRESS_CHANGED');
  };
}
export function createProgressApi(baseUrl: string, authorized: Authorized, options: Parameters<typeof createHttpClient>[1] = {}) {
  return { read: createProgressReader({ streak: createStreakApi(baseUrl, authorized, options).read, daily: createPomodoroInsightsApi(baseUrl, authorized, options).daily }) };
}
