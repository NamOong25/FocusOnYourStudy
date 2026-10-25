import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../../account/auth/AuthProvider';
import { createOverviewApi } from './overviewApi';
import { emptyOverview, OverviewManager, overviewCacheKey, type OverviewState } from './OverviewManager';
import { type OverviewQuery } from './overview';

export function useScheduleOverview(query: OverviewQuery | null) {
  const auth = useAuth(), { active } = useNavigationScope(), { scheduleRevision } = useApp();
  const ref = useRef<OverviewManager | null>(null), [state, setState] = useState<OverviewState>(emptyOverview);
  const key = query && auth.hasSession ? overviewCacheKey(query, scheduleRevision) : null;
  useEffect(() => {
    if (!auth.hasSession) return;
    const manager = new OverviewManager(createOverviewApi(API_BASE_URL, auth.authorized)); ref.current = manager;
    setState(manager.state); const unsubscribe = manager.subscribe(() => setState(manager.state));
    return () => { unsubscribe(); manager.dispose(); if (ref.current === manager) ref.current = null; };
  }, [auth.hasSession, auth.authorized, auth.revision]);
  const reload = useCallback(() => query && ref.current ? ref.current.load(query, scheduleRevision) : Promise.reject(cancelledRequest()), [key]);
  useEffect(() => {
    if (!key || !active) return;
    const manager = ref.current; void reload().catch(() => {});
    return () => manager?.cancel();
  }, [key, active, auth.revision, reload]);
  useEffect(() => {
    if (!key || !active) return;
    const update = () => { void reload().catch(() => {}); };
    const listener = AppState.addEventListener('change', status => { if (status === 'active') update(); });
    // Refresh changes made in another tab when the user returns to this window.
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.addEventListener('focus', update);
    return () => { listener.remove(); if (Platform.OS === 'web' && typeof window !== 'undefined') window.removeEventListener('focus', update); };
  }, [key, active, reload]);
  return { ...(state.key === key ? state : emptyOverview()), reload };
}
export type ScheduleOverviewSource = ReturnType<typeof useScheduleOverview>;
