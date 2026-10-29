import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { useAuth } from '../../account/auth/AuthProvider';
import { usePomodoro } from './PomodoroProvider';
import { pomodoroDay } from './pomodoroInsightsApi';
import { usePomodoroRead, usePomodoroToday } from './usePomodoroInsights';
import { createProgressApi, progressKey, type PomodoroProgress } from './pomodoroProgressApi';
import type { PomodoroReadState } from './PomodoroReadManager';

type Value = { state: PomodoroReadState<PomodoroProgress>; data: PomodoroProgress | null; timeZone: string; owner: string | null; reload: () => Promise<PomodoroProgress | null> };
const Context = createContext<Value | null>(null);
export function PomodoroProgressProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), { state: timer } = usePomodoro(), timeZone = auth.profile?.timeZone ?? 'Asia/Ho_Chi_Minh';
  const { now } = usePomodoroToday(timeZone);
  const api = useMemo(() => createProgressApi(API_BASE_URL, auth.authorized), [auth.authorized]);
  const revision = [timer.last?.id, timer.last?.version, timer.last?.status].join(':');
  const { state, reload } = usePomodoroRead(api.read, progressKey, { timeZone, dayKey: pomodoroDay(now, timeZone) }, revision);
  const data = state.loaded && !state.loading && !state.error ? state.value : null;
  const owner = auth.hasSession && auth.profile ? `${auth.revision}:${auth.profile.id}` : null;
  return <Context.Provider value={{ state, data, reload, timeZone, owner }}>{children}</Context.Provider>;
}
export function usePomodoroProgress() { const context = useContext(Context); if (!context) throw new Error('Missing PomodoroProgressProvider'); return context; }
