import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import type { Semester } from '../academic';
import type { createSemestersApi, SemesterInput } from './semestersApi';

type Api = ReturnType<typeof createSemestersApi>;
export type SemesterState = { semesters: Semester[]; loaded: boolean; loading: boolean; busy: boolean; needsReload: boolean; error: ApiError | null };
export class SemesterManager {
  state: SemesterState = { semesters: [], loaded: false, loading: false, busy: false, needsReload: false, error: null };
  private listeners = new Set<() => void>();
  private disposed = false;
  private flight: Promise<Semester[]> | null = null;
  private read: AbortController | null = null;
  constructor(private api: Api) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<SemesterState>) { if (!this.disposed) { this.state = { ...this.state, ...change }; this.listeners.forEach(listener => listener()); } }
  reload = (): Promise<Semester[]> => {
    if (this.state.busy) return Promise.reject(new ApiError('Đang lưu học kỳ. Hãy đợi một chút.', 'REQUEST_BUSY'));
    return this.load();
  };
  private load(): Promise<Semester[]> {
    if (this.disposed) return Promise.reject(cancelledRequest());
    if (this.flight) return this.flight;
    const controller = new AbortController(); this.read = controller; this.publish({ loading: true, error: null });
    this.flight = this.api.list(controller.signal).then(rows => {
      if (this.disposed) throw cancelledRequest();
      this.publish({ semesters: rows, loaded: true, needsReload: false }); return rows;
    }).catch(error => {
      this.publish({ error: asApiError(error), needsReload: true }); throw error;
    }).finally(() => { this.flight = null; this.read = null; this.publish({ loading: false }); });
    return this.flight;
  }
  private async write<T>(operation: () => Promise<T>): Promise<T> {
    if (this.disposed) throw cancelledRequest();
    if (this.state.busy || this.state.loading) throw new ApiError('Đang xử lý học kỳ. Hãy đợi một chút.', 'REQUEST_BUSY');
    if (!this.state.loaded || this.state.needsReload) throw new ApiError('Tải lại danh sách học kỳ trước khi thử tiếp.', 'SEMESTERS_RELOAD_REQUIRED');
    this.publish({ busy: true, error: null });
    try {
      const result = await operation();
      if (this.disposed) throw cancelledRequest();
      // A confirmed commit must not be reported as a failed save if GET then fails.
      try { await this.load(); } catch { /* state retains the reload error */ }
      if (this.disposed) throw cancelledRequest();
      return result;
    } catch (failure) {
      const error = asApiError(failure);
      if (error.status === 409 || error.status === 404 || error.status >= 500 || !error.status) this.publish({ needsReload: true, error });
      throw error;
    } finally { this.publish({ busy: false }); }
  }
  save = (input: SemesterInput, original?: Semester) => this.write(() => this.api.save(input, original));
  remove = (original: Semester) => this.write(() => this.api.remove(original));
  dispose = () => { this.disposed = true; this.read?.abort(); this.listeners.clear(); };
}
