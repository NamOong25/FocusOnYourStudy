import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { notifyAcademicChange, startAcademicSync } from '../../../shared/sync/academicSyncPlatform';
import { useFeedback } from '../../../shared/feedback/FeedbackProvider';
import { useAuth } from '../../account/auth/AuthProvider';
import type { Course } from '../academic';
import { createCoursesApi, type CourseInput } from './coursesApi';
import { CourseManager, type CourseState } from './CourseManager';

export function useServerCourses() {
  const auth = useAuth(), { showNotice } = useFeedback();
  const ref = useRef<CourseManager | null>(null);
  const [state, setState] = useState<CourseState>({ courses: [], loaded: false, loading: false, busy: false, needsReload: false, error: null });
  useEffect(() => {
    if (!auth.hasSession || !auth.profile) return;
    const manager = new CourseManager(createCoursesApi(API_BASE_URL, auth.authorized)); ref.current = manager;
    setState(manager.state); const unsubscribe = manager.subscribe(() => setState(manager.state));
    const stopSync = startAcademicSync(manager, auth.profile.id);
    void manager.reload().catch(() => {});
    return () => { stopSync(); unsubscribe(); manager.dispose(); if (ref.current === manager) ref.current = null; };
  }, [auth.hasSession, auth.authorized, auth.profile?.id]);
  const reload = useCallback(() => ref.current?.reload() ?? Promise.reject(cancelledRequest()), []);
  const save = useCallback(async (input: CourseInput, original?: Course) => {
    const manager = ref.current; if (!manager) throw cancelledRequest();
    try {
      const saved = await manager.save(input, original);
      if (ref.current === manager) showNotice(original ? 'Đã lưu thay đổi môn học vào tài khoản.' : 'Đã thêm môn học vào tài khoản.');
      return saved;
    } finally { if (ref.current === manager && auth.profile) notifyAcademicChange(auth.profile.id); }
  }, [showNotice, auth.profile?.id]);
  const remove = useCallback(async (original: Course) => {
    const manager = ref.current; if (!manager) throw cancelledRequest();
    try { await manager.remove(original); if (ref.current === manager) showNotice('Đã xóa môn học khỏi tài khoản.'); }
    finally { if (ref.current === manager && auth.profile) notifyAcademicChange(auth.profile.id); }
  }, [showNotice, auth.profile?.id]);
  return auth.hasSession ? { ...state, reload, save, remove } : null;
}
