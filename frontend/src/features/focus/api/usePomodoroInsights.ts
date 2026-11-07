import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { API_BASE_URL } from '../../../shared/api/config';
import { asApiError } from '../../../shared/api/http';
import { useAuth } from '../../account/auth/AuthProvider';
import { useNavigationScope } from '../../../navigation/Navigation';
import { createPomodoroInsightsApi } from './pomodoroInsightsApi';
import { PomodoroReadManager, emptyPomodoroRead, visiblePomodoroRead, type PomodoroReadState } from './PomodoroReadManager';
import { PomodoroGoalManager, emptyPomodoroGoal, type PomodoroGoalState } from './PomodoroGoalManager';
import { listenPomodoro, notifyPomodoro } from './pomodoroPlatform';

export function usePomodoroInsightsApi() {
  const auth = useAuth();
  return useMemo(() => createPomodoroInsightsApi(API_BASE_URL, auth.authorized), [auth.authorized]);
}
function foreground() { return Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active'; }
function listenForeground(sync: () => void) {
  const native = AppState.addEventListener('change', s => { if (s === 'active') sync(); });
  if (Platform.OS === 'web') { window.addEventListener('focus', sync); window.addEventListener('online', sync); document.addEventListener('visibilitychange', sync); }
  const stop = listenPomodoro(sync);
  return () => { native.remove(); stop(); if (Platform.OS === 'web') { window.removeEventListener('focus', sync); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', sync); } };
}
export function usePomodoroRead<Q, T>(read: (q: Q, signal: AbortSignal) => Promise<T>, keyOf: (q: Q) => string, query: Q, revision: string, enabled = true) {
  const auth = useAuth(), scope = useNavigationScope();
  const owner = auth.hasSession && auth.profile ? `${auth.revision}:${auth.profile.id}` : null;
  const [snapshot, setSnapshot] = useState<{ owner: string | null; state: PomodoroReadState<T> }>({ owner: null, state: emptyPomodoroRead<T>() });
  const managerRef = useRef<{ owner: string; manager: PomodoroReadManager<Q, T> } | null>(null);
  let key: string | null = null, queryError: ReturnType<typeof asApiError> | null = null;
  try { key = keyOf(query) + '|' + revision; } catch (e) { queryError = asApiError(e); }
  const current = useRef({ query, revision, key }); current.current = { query, revision, key };
  useEffect(() => {
    if (!owner) return;
    const manager = new PomodoroReadManager(read, keyOf); managerRef.current = { owner, manager };
    const update = () => setSnapshot({ owner, state: manager.state }); update(); const stop = manager.subscribe(update);
    return () => { stop(); manager.dispose(); if (managerRef.current?.manager === manager) managerRef.current = null; };
  }, [owner, read, keyOf]);
  const reload = () => {
    const target = managerRef.current;
    if (target?.owner === owner && current.current.key) return target.manager.load(current.current.query, current.current.revision);
    return Promise.resolve(null);
  };
  useEffect(() => {
    const manager = managerRef.current?.owner === owner ? managerRef.current.manager : null;
    if (!manager || !key || !enabled || !scope.active) { manager?.cancel(); return; }
    const sync = () => { if (foreground() && current.current.key === key) void manager.load(current.current.query, current.current.revision).catch(() => {}); };
    sync(); const stop = listenForeground(sync), poll = setInterval(sync, 30000);
    return () => { stop(); clearInterval(poll); manager.cancel(); };
  }, [owner, read, keyOf, key, enabled, scope.active]);
  const state = queryError ? { ...emptyPomodoroRead<T>(), error: queryError } : visiblePomodoroRead(snapshot, owner, key);
  return { state, reload };
}
export function usePomodoroGoal() {
  const auth = useAuth(), api = usePomodoroInsightsApi(), owner = auth.hasSession && auth.profile ? `${auth.revision}:${auth.profile.id}` : null;
  const [snapshot, setSnapshot] = useState<{ owner: string | null; manager: PomodoroGoalManager | null; state: PomodoroGoalState }>({ owner: null, manager: null, state: emptyPomodoroGoal() });
  useEffect(() => {
    if (!owner) return;
    const manager = new PomodoroGoalManager(api, notifyPomodoro), update = () => setSnapshot({ owner, manager, state: manager.state }); update();
    const stop = manager.subscribe(update);
    return () => { stop(); manager.dispose(); };
  }, [owner, api]);
  return snapshot.owner === owner && owner ? snapshot : { owner, manager: null, state: emptyPomodoroGoal() };
}
export function usePomodoroToday(timeZone: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 15000); const stop = listenForeground(() => setNow(Date.now())); return () => { clearInterval(timer); stop(); }; }, []);
  // The key is recalculated after midnight and when returning to the app.
  return useMemo(() => ({ now, timeZone }), [now, timeZone]);
}
