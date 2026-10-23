import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import type { StudySession } from '../learning';
import { studyStartTimestamp } from '../studyTime';
import type { StudyInput, createStudyApi } from './studyApi';

export type StudyState = { sessions: StudySession[]; loaded: boolean; loading: boolean; busy: boolean; needsReload: boolean; error: ApiError | null };
export class StudyManager {
  state: StudyState = { sessions: [], loaded: false, loading: false, busy: false, needsReload: false, error: null };
  private listeners = new Set<() => void>();
  private disposed = false;
  private flight: Promise<StudySession[]> | null = null;
  private read: AbortController | null = null;
  constructor(private api: ReturnType<typeof createStudyApi>) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<StudyState>) {
    if (!this.disposed) { this.state = { ...this.state, ...change }; this.listeners.forEach(listener => listener()); }
  }
  reload = (): Promise<StudySession[]> => {
    if (this.state.busy) return Promise.reject(new ApiError('Đang lưu buổi tự học. Hãy đợi một chút.', 'REQUEST_BUSY'));
    return this.load();
  };
  private load(): Promise<StudySession[]> {
    if (this.disposed) return Promise.reject(cancelledRequest());
    if (this.flight) return this.flight;
    const controller = new AbortController(); this.read = controller; this.publish({ loading: true, error: null });
    this.flight = this.api.list(controller.signal).then(sessions => {
      if (this.disposed) throw cancelledRequest();
      this.publish({ sessions, loaded: true, needsReload: false }); return sessions;
    }).catch(error => { this.publish({ error: asApiError(error), needsReload: true }); throw error; })
      .finally(() => { this.flight = null; this.read = null; this.publish({ loading: false }); });
    return this.flight;
  }
  private async write<T>(operation: () => Promise<T>, apply: (result: T) => StudySession[]): Promise<T> {
    if (this.disposed) throw cancelledRequest();
    if (this.state.busy || this.state.loading) throw new ApiError('Đang xử lý buổi tự học. Hãy đợi một chút.', 'REQUEST_BUSY');
    if (!this.state.loaded || this.state.needsReload) throw new ApiError('Tải lại danh sách buổi tự học trước khi thử tiếp.', 'STUDY_RELOAD_REQUIRED');
    this.publish({ busy: true, error: null });
    try {
      const result = await operation();
      if (this.disposed) throw cancelledRequest();
      // Only apply a confirmed response, never an optimistic draft/version.
      this.publish({ sessions: apply(result) });
      try { await this.load(); } catch { /* commit succeeded; keep the response and show the GET error */ }
      if (this.disposed) throw cancelledRequest();
      return result;
    } catch (failure) {
      const error = asApiError(failure);
      if (!error.status || error.status === 404 || error.status === 409 || error.status >= 500) this.publish({ needsReload: true, error });
      throw error;
    } finally { this.publish({ busy: false }); }
  }
  save = (input: StudyInput, original?: StudySession) => this.write(() => this.api.save(input, original), saved =>
    [...this.state.sessions.filter(c => c.id !== saved.id), saved].sort((a, b) => studyStartTimestamp(a) - studyStartTimestamp(b) || a.id.localeCompare(b.id)));
  remove = (original: StudySession) => this.write(() => this.api.remove(original), () => this.state.sessions.filter(c => c.id !== original.id));
  dispose = () => { this.disposed = true; this.read?.abort(); this.listeners.clear(); };
}
