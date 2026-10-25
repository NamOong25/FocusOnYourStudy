import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../../account/auth/AuthProvider';
import { createScheduleApi, queryKey, type ScheduleQuery, type RuleInput, type ServerRule } from './scheduleApi';
import { emptyScheduleState, ScheduleManager, type ScheduleState } from './ScheduleManager';
import { createClassExceptionsApi, type OccurrenceTarget, type ExceptionSnapshot, type ExceptionInput } from './classExceptionsApi';
import { useApp } from '../../../store/model';

export function useServerSchedule(query: ScheduleQuery | null, active: boolean) {
  const auth = useAuth(), ref = useRef<ScheduleManager | null>(null);
  const { invalidateSchedule } = useApp();
  const [state, setState] = useState<ScheduleState>(emptyScheduleState);
  const key = query ? queryKey(query) : null;
  useEffect(() => {
    if (!auth.hasSession) return;
    const manager = new ScheduleManager(createScheduleApi(API_BASE_URL, auth.authorized), createClassExceptionsApi(API_BASE_URL, auth.authorized)); ref.current = manager;
    setState(manager.state); const unsubscribe = manager.subscribe(() => setState(manager.state));
    return () => { unsubscribe(); manager.dispose(); if (ref.current === manager) ref.current = null; };
  }, [auth.hasSession, auth.authorized, auth.revision]);
  useEffect(() => { if (query && active && !state.busy) void ref.current?.load(query).catch(() => {}); }, [key, active, auth.revision, state.revision, state.busy]);
  const reload = useCallback(() => query && ref.current ? ref.current.load(query) : Promise.reject(cancelledRequest()), [key]);
  // Changing semester/window hides the old data before the effect starts its next request.
  const mutate = useCallback(async <T,>(operation: (manager: ScheduleManager) => Promise<T>): Promise<T> => {
    const manager = ref.current; if (!manager) throw cancelledRequest();
    try { return await operation(manager); }
    finally { if (ref.current === manager) invalidateSchedule(); }
  }, [invalidateSchedule]);
  const save = useCallback((input: RuleInput, original?: ServerRule) => mutate(manager => manager.save(input, original)), [mutate]);
  const remove = useCallback((original: ServerRule) => mutate(manager => manager.remove(original)), [mutate]);
  const readRule = useCallback((id: string, signal?: AbortSignal) => ref.current?.readRule(id, signal) ?? Promise.reject(cancelledRequest()), []);
  const rules = useCallback((semesterId?: string, signal?: AbortSignal) => ref.current?.rules(semesterId, signal) ?? Promise.reject(cancelledRequest()), []);
  const readDay = useCallback((target: OccurrenceTarget, signal?: AbortSignal) => ref.current?.readDay(target, signal) ?? Promise.reject(cancelledRequest()), []);
  const saveException = useCallback((basis: ExceptionSnapshot, input: ExceptionInput) => mutate(manager => manager.saveException(basis, input)), [mutate]);
  const restoreException = useCallback((basis: ExceptionSnapshot) => mutate(manager => manager.restoreException(basis)), [mutate]);
  const acknowledge = useCallback((target?: OccurrenceTarget) => ref.current?.acknowledge(target) ?? false, []);
  return { ...(state.key === key ? state : { ...emptyScheduleState(), busy: state.busy, needsReload: state.needsReload, pendingOccurrence: state.pendingOccurrence }), reload, save, remove, readRule, rules, acknowledge, readDay, saveException, restoreException };
}
export type ScheduleSource = ReturnType<typeof useServerSchedule>;
