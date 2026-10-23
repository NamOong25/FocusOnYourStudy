import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import type { Task } from '../assignments';
import { compareTaskDeadlines } from '../assignments';
import type { AssignmentInput, createAssignmentsApi } from './assignmentsApi';

export type AssignmentState = { tasks: Task[]; loaded: boolean; loading: boolean; busy: boolean; needsReload: boolean; error: ApiError | null };
export class AssignmentManager {
  state: AssignmentState = { tasks: [], loaded: false, loading: false, busy: false, needsReload: false, error: null };
  private listeners = new Set<() => void>();
  private disposed = false;
  private flight: Promise<Task[]> | null = null;
  private read: AbortController | null = null;
  constructor(private api: ReturnType<typeof createAssignmentsApi>) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<AssignmentState>) {
    if (!this.disposed) { this.state = { ...this.state, ...change }; this.listeners.forEach(listener => listener()); }
  }
  reload = (): Promise<Task[]> => {
    if (this.state.busy) return Promise.reject(new ApiError('Đang lưu bài tập. Hãy đợi một chút.', 'REQUEST_BUSY'));
    return this.load();
  };
  private load(): Promise<Task[]> {
    if (this.disposed) return Promise.reject(cancelledRequest());
    if (this.flight) return this.flight;
    const controller = new AbortController(); this.read = controller; this.publish({ loading: true, error: null });
    this.flight = this.api.list(controller.signal).then(tasks => {
      if (this.disposed) throw cancelledRequest();
      this.publish({ tasks, loaded: true, needsReload: false }); return tasks;
    }).catch(error => { this.publish({ error: asApiError(error), needsReload: true }); throw error; })
      .finally(() => { this.flight = null; this.read = null; this.publish({ loading: false }); });
    return this.flight;
  }
  private async write<T>(operation: () => Promise<T>, apply: (result: T) => Task[]): Promise<T> {
    if (this.disposed) throw cancelledRequest();
    if (this.state.busy || this.state.loading) throw new ApiError('Đang xử lý bài tập. Hãy đợi một chút.', 'REQUEST_BUSY');
    if (!this.state.loaded || this.state.needsReload) throw new ApiError('Tải lại danh sách bài tập trước khi thử tiếp.', 'ASSIGNMENTS_RELOAD_REQUIRED');
    this.publish({ busy: true, error: null });
    try {
      const result = await operation();
      if (this.disposed) throw cancelledRequest();
      // Only apply a confirmed response, never an optimistic draft/version.
      this.publish({ tasks: apply(result) });
      try { await this.load(); } catch { /* commit succeeded; keep the response and show the GET error */ }
      if (this.disposed) throw cancelledRequest();
      return result;
    } catch (failure) {
      const error = asApiError(failure);
      if (!error.status || error.status === 404 || error.status === 409 || error.status >= 500) this.publish({ needsReload: true, error });
      throw error;
    } finally { this.publish({ busy: false }); }
  }
  save = (input: AssignmentInput, original?: Task) => this.write(() => this.api.save(input, original), saved =>
    [...this.state.tasks.filter(c => c.id !== saved.id), saved].sort(compareTaskDeadlines));
  remove = (original: Task) => this.write(() => this.api.remove(original), () => this.state.tasks.filter(c => c.id !== original.id));
  dispose = () => { this.disposed = true; this.read?.abort(); this.listeners.clear(); };
}
