import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useFeedback } from '../../../shared/feedback/FeedbackProvider';
import type { Semester } from '../academic';
import { useAuth } from '../../account/auth/AuthProvider';
import { createSemestersApi, type SemesterInput } from './semestersApi';
import { SemesterManager, type SemesterState } from './SemesterManager';

export function useServerSemesters() {
  const auth = useAuth();
  const { showNotice } = useFeedback();
  const ref = useRef<SemesterManager | null>(null);
  const [state, setState] = useState<SemesterState>({ semesters: [], loaded: false, loading: false, busy: false, needsReload: false, error: null });
  useEffect(() => {
    if (!auth.hasSession) return;
    const manager = new SemesterManager(createSemestersApi(API_BASE_URL, auth.authorized)); ref.current = manager;
    setState(manager.state);
    const unsubscribe = manager.subscribe(() => setState(manager.state));
    void manager.reload().catch(() => {});
    return () => { unsubscribe(); manager.dispose(); if (ref.current === manager) ref.current = null; };
  }, [auth.hasSession, auth.authorized]);
  const reload = useCallback(() => ref.current?.reload() ?? Promise.reject(cancelledRequest()), []);
  const save = useCallback(async (input: SemesterInput, original?: Semester) => {
    const manager = ref.current; if (!manager) throw cancelledRequest();
    const result = await manager.save(input, original);
    if (ref.current === manager) showNotice(original ? 'Đã lưu thay đổi học kỳ vào tài khoản.' : 'Đã tạo học kỳ trong tài khoản.');
    return result;
  }, [showNotice]);
  const remove = useCallback(async (original: Semester) => {
    const manager = ref.current; if (!manager) throw cancelledRequest();
    await manager.remove(original); if (ref.current === manager) showNotice('Đã xóa học kỳ khỏi tài khoản.');
  }, [showNotice]);
  return auth.hasSession ? { ...state, reload, save, remove } : null;
}
