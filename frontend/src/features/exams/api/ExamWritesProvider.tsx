import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../account/auth/AuthProvider';
import { useApp } from '../../../store/model';
import { API_BASE_URL } from '../../../shared/api/config';
import { createExamsApi } from './examsApi';
import { ExamWriteManager } from './ExamWriteManager';

type Writes = { manager: ExamWriteManager; state: ExamWriteManager['state'] };
const Context = createContext<Writes | null>(null);
export function ExamWritesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), { invalidateSchedule } = useApp();
  const manager = useMemo(() => new ExamWriteManager(createExamsApi(API_BASE_URL, auth.authorized)), [auth.revision, auth.authorized]);
  const [snapshot, setSnapshot] = useState({ manager, state: manager.state });
  const state = snapshot.manager === manager ? snapshot.state : manager.state;
  useEffect(() => { const update = () => setSnapshot({ manager, state: manager.state }); update(); const unsubscribe = manager.subscribe(update);
    return () => { unsubscribe(); manager.dispose(); };
  }, [manager]);
  useEffect(() => { if (state.revision) invalidateSchedule(); }, [manager, state.revision, invalidateSchedule]);
  return <Context.Provider value={{ manager, state }}>{children}</Context.Provider>;
}
export function useExamWrites() { const value = useContext(Context); if (!value) throw new Error('Missing ExamWritesProvider'); return value; }
