import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../../account/auth/AuthProvider';
import { createStudyApi } from './studyApi';
import { StudyManager, type StudyState } from './StudyManager';

export function useServerStudySessions() {
  const auth = useAuth();
  const ref = useRef<StudyManager | null>(null);
  const [state, setState] = useState<StudyState>({ sessions: [], loaded: false, loading: false, busy: false, needsReload: false, error: null });
  useEffect(() => {
    if (!auth.hasSession) return;
    const manager = new StudyManager(createStudyApi(API_BASE_URL, auth.authorized)); ref.current = manager;
    setState(manager.state); const unsubscribe = manager.subscribe(() => setState(manager.state));
    void manager.reload().catch(() => {});
    return () => { unsubscribe(); manager.dispose(); if (ref.current === manager) ref.current = null; };
  }, [auth.hasSession, auth.authorized]);
  const reload = useCallback(() => ref.current?.reload() ?? Promise.reject(cancelledRequest()), []);
  return auth.hasSession ? { ...state, reload } : null;
}
