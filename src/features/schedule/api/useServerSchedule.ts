import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../../account/auth/AuthProvider';
import { createScheduleApi, queryKey, type ScheduleQuery } from './scheduleApi';
import { emptyScheduleState, ScheduleManager, type ScheduleState } from './ScheduleManager';

export function useServerSchedule(query: ScheduleQuery | null, active: boolean) {
  const auth = useAuth(), ref = useRef<ScheduleManager | null>(null);
  const [state, setState] = useState<ScheduleState>(emptyScheduleState);
  const key = query ? queryKey(query) : null;
  useEffect(() => {
    if (!auth.hasSession) return;
    const manager = new ScheduleManager(createScheduleApi(API_BASE_URL, auth.authorized)); ref.current = manager;
    setState(manager.state); const unsubscribe = manager.subscribe(() => setState(manager.state));
    return () => { unsubscribe(); manager.dispose(); if (ref.current === manager) ref.current = null; };
  }, [auth.hasSession, auth.authorized, auth.revision]);
  useEffect(() => { if (query && active) void ref.current?.load(query).catch(() => {}); }, [key, active, auth.revision]);
  const reload = useCallback(() => query && ref.current ? ref.current.load(query) : Promise.reject(cancelledRequest()), [key]);
  // Changing semester/window hides the old data before the effect starts its next request.
  return { ...(state.key === key ? state : emptyScheduleState()), reload };
}
