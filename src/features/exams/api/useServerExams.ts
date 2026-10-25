import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../../account/auth/AuthProvider';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { emptyExamRead, ExamReadManager, type ExamReadState } from './ExamReadManager';
import { createExamsApi, examQueryKey, type ExamQuery } from './examsApi';
import { useExamWrites } from './ExamWritesProvider';

function useExamRead<Q, T>(query: Q | null, key: string | null, active: boolean, read: (query: Q, signal: AbortSignal) => Promise<T>, keyOf: (query: Q) => string) {
  const auth = useAuth(), owner = auth.hasSession ? `${auth.revision}:${auth.profile?.id ?? ''}` : null;
  const { state: writes } = useExamWrites();
  const ref = useRef<{ owner: string; manager: ExamReadManager<Q, T> } | null>(null);
  const [snapshot, setSnapshot] = useState<{ owner: string | null; state: ExamReadState<T> }>({ owner: null, state: emptyExamRead<T>() });
  useEffect(() => {
    if (!owner) return;
    const manager = new ExamReadManager(read, keyOf); ref.current = { owner, manager };
    const update = () => setSnapshot({ owner, state: manager.state }); update(); const unsubscribe = manager.subscribe(update);
    return () => { unsubscribe(); manager.dispose(); if (ref.current?.manager === manager) ref.current = null; };
  }, [owner, read, keyOf]);
  const reload = useCallback(() => query !== null && ref.current?.owner === owner ? ref.current.manager.load(query) : Promise.reject(cancelledRequest()), [key, owner, read]);
  useEffect(() => {
    if (!active || !key || !owner) return;
    void reload().catch(() => {});
    const check = () => { if (Platform.OS !== 'web' || document.visibilityState === 'visible') void reload().catch(() => {}); };
    const native = AppState.addEventListener('change', status => { if (status === 'active') check(); });
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', check);
    const manager = ref.current?.manager;
    return () => { native.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', check); manager?.cancel(); };
  }, [active, key, owner, reload, writes.revision]);
  return { ...(snapshot.owner === owner && snapshot.state.key === key ? snapshot.state : emptyExamRead<T>()), reload };
}
const idKey = (id: string) => id.toLowerCase();
export function useServerExamList(query: ExamQuery | null, active: boolean) {
  const auth = useAuth(), api = useMemo(() => createExamsApi(API_BASE_URL, auth.authorized), [auth.authorized]);
  return useExamRead(query, query ? examQueryKey(query) : null, active, api.list, examQueryKey);
}
export function useServerExam(id: string, active: boolean) {
  const auth = useAuth(), api = useMemo(() => createExamsApi(API_BASE_URL, auth.authorized), [auth.authorized]);
  return useExamRead(id, idKey(id), active, api.get, idKey);
}
