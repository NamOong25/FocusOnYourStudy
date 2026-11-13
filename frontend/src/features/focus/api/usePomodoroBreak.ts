import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../../account/auth/AuthProvider';
import { API_BASE_URL } from '../../../shared/api/config';
import { asApiError, isCancelled, type ApiError } from '../../../shared/api/http';
import { useNavigationScope } from '../../../navigation/Navigation';
import { createPomodoroBreakApi, type BreakAction, type BreakKind, type BreakSnapshot } from './pomodoroBreakApi';
import { monotonicNow } from './PomodoroManager';
import { listenPomodoro, notifyPomodoro } from './pomodoroPlatform';

export function usePomodoroBreak() {
  const auth = useAuth();
  const { active } = useNavigationScope();
  const api = useMemo(() => createPomodoroBreakApi(API_BASE_URL, auth.authorized), [auth.authorized, auth.revision]);
  const [saved, setSaved] = useState<{ row: BreakSnapshot; receivedAt: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const read = useRef<AbortController | null>(null);
  const write = useRef<AbortController | null>(null);
  const publish = (row: BreakSnapshot) => {
    setSaved({ row, receivedAt: monotonicNow() });
    setError(null);
  };
  const reload = useCallback(async () => {
    if (read.current || write.current) return;
    const controller = new AbortController();
    read.current = controller;
    try {
      const row = await api.read(controller.signal);
      if (!controller.signal.aborted) publish(row);
    } catch (failure) {
      if (!controller.signal.aborted && !isCancelled(failure)) setError(asApiError(failure));
    } finally {
      if (read.current === controller) read.current = null;
    }
  }, [api]);
  useEffect(() => {
    setSaved(null);
    setError(null);
    setBusy(false);
    return () => {
      read.current?.abort();
      write.current?.abort();
      read.current = null;
      write.current = null;
    };
  }, [api]);
  useEffect(() => {
    if (!active) return;
    const sync = () => { if (Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active') void reload(); };
    void reload();
    const interval = setInterval(sync, 15_000);
    const unsubscribe = listenPomodoro(sync);
    const app = AppState.addEventListener('change', status => { if (status === 'active') sync(); });
    if (Platform.OS === 'web') {
      window.addEventListener('online', sync);
      window.addEventListener('focus', sync);
      document.addEventListener('visibilitychange', sync);
    }
    return () => {
      clearInterval(interval);
      unsubscribe();
      app.remove();
      if (Platform.OS === 'web') {
        window.removeEventListener('online', sync);
        window.removeEventListener('focus', sync);
        document.removeEventListener('visibilitychange', sync);
      }
    };
  }, [active, reload]);
  const change = async (action: BreakAction, kind?: BreakKind) => {
    if (!saved || error || write.current) return;
    read.current?.abort();
    read.current = null;
    const controller = new AbortController();
    write.current = controller;
    setBusy(true);
    try {
      const row = await api.change(action, saved.row.version, controller.signal, kind);
      if (!controller.signal.aborted) { publish(row); notifyPomodoro(); }
    } catch (failure) {
      if (!controller.signal.aborted && !isCancelled(failure)) setError(asApiError(failure));
    } finally {
      if (write.current === controller) { write.current = null; if (!controller.signal.aborted) setBusy(false); }
    }
  };
  return { saved, error, busy, reload, change };
}
