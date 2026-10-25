import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import { queryKey, type ScheduleQuery, type ServerOccurrence, type ServerRule, type RuleInput, type createScheduleApi } from './scheduleApi';
import type { OccurrenceTarget, ExceptionSnapshot, ExceptionInput, createClassExceptionsApi } from './classExceptionsApi';

export type ScheduleState = { key: string | null; rows: ServerOccurrence[]; loaded: boolean; loading: boolean; error: ApiError | null;
  busy: boolean; needsReload: boolean; revision: number; confirmedWrite: boolean; pendingOccurrence: OccurrenceTarget | null };
export const emptyScheduleState = (): ScheduleState => ({ key: null, rows: [], loaded: false, loading: false, error: null,
  busy: false, needsReload: false, revision: 0, confirmedWrite: false, pendingOccurrence: null });
export class ScheduleManager {
  state = emptyScheduleState();
  private listeners = new Set<() => void>();
  private generation = 0;
  private disposed = false;
  private read: AbortController | null = null;
  private flight: Promise<ServerOccurrence[]> | null = null;
  constructor(private api: ReturnType<typeof createScheduleApi>, private exceptions?: ReturnType<typeof createClassExceptionsApi>) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<ScheduleState>) { if (!this.disposed) { this.state = { ...this.state, ...change }; this.listeners.forEach(fn => fn()); } }
  load = (q: ScheduleQuery): Promise<ServerOccurrence[]> => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    if (this.state.busy) return Promise.reject(new ApiError('Đang lưu lịch học. Đợi một chút nhé.', 'REQUEST_BUSY'));
    const key = queryKey(q);
    if (key === this.state.key && this.flight) return this.flight;
    this.read?.abort(); const generation = ++this.generation, controller = new AbortController(); this.read = controller;
    this.publish({ ...(key === this.state.key ? {} : { key, rows: [], loaded: false }), loading: true, error: null });
    this.flight = this.api.list(q, controller.signal).then(rows => {
      if (this.disposed || generation !== this.generation) throw cancelledRequest();
      this.publish({ rows, loaded: true, confirmedWrite: false }); return rows;
    }).catch(error => {
      if (!this.disposed && generation === this.generation) this.publish({ error: asApiError(error) });
      throw error;
    }).finally(() => { if (generation === this.generation) { this.flight = null; this.read = null; this.publish({ loading: false }); } });
    return this.flight;
  };
  private async write<T>(operation: () => Promise<T>, pendingOccurrence: OccurrenceTarget | null = null): Promise<T> {
    if (this.disposed) throw cancelledRequest();
    if (this.state.busy || this.state.loading) throw new ApiError('Đang xử lý lịch học. Đợi một chút nhé.', 'REQUEST_BUSY');
    if (!this.state.loaded || this.state.error || this.state.needsReload) throw new ApiError('Kiểm tra lịch đã lưu trước khi gửi tiếp.', 'SCHEDULE_RELOAD_REQUIRED');
    this.publish({ busy: true });
    try {
      const result = await operation();
      if (this.disposed) throw cancelledRequest();
      // Never fabricate occurrences from a rule or retry a write after losing its response.
      this.publish({ rows: [], loaded: false, error: null, revision: this.state.revision + 1, confirmedWrite: true, pendingOccurrence: null });
      return result;
    } catch (failure) {
      const error = asApiError(failure);
      if (!error.status || error.status >= 500 || error.code === 'DATA_CONFLICT') this.publish({ needsReload: true, pendingOccurrence });
      throw error;
    } finally { this.publish({ busy: false }); }
  }
  save = (input: RuleInput, original?: ServerRule) => this.write(() => this.api.save(input, original));
  remove = (original: ServerRule) => this.write(() => this.api.remove(original));
  readRule = (id: string, signal?: AbortSignal) => this.disposed ? Promise.reject(cancelledRequest()) : this.api.readRule(id, signal);
  rules = (semesterId?: string, signal?: AbortSignal) => this.disposed ? Promise.reject(cancelledRequest()) : this.api.rules(semesterId, signal);
  readDay = (target: OccurrenceTarget, signal?: AbortSignal) => this.disposed || !this.exceptions ? Promise.reject(cancelledRequest()) : this.exceptions.readDay(target, signal);
  saveException = (basis: ExceptionSnapshot, input: ExceptionInput) => this.write(() => {
    if (!this.exceptions) throw cancelledRequest(); return this.exceptions.save(basis, input);
  }, { scheduleId: basis.rule.id, date: basis.occurrence.date });
  restoreException = (basis: ExceptionSnapshot) => this.write(() => {
    if (!this.exceptions) throw cancelledRequest(); return this.exceptions.restore(basis);
  }, { scheduleId: basis.rule.id, date: basis.occurrence.date });
  acknowledge = (target?: OccurrenceTarget) => {
    const pending = this.state.pendingOccurrence;
    if (pending && (!target || pending.scheduleId !== target.scheduleId || pending.date !== target.date)) return false;
    if (this.state.loaded && !this.state.error && !this.state.loading && !this.state.busy) { this.publish({ needsReload: false, pendingOccurrence: null }); return true; }
    return false;
  };
  invalidate = () => {
    if (this.disposed) return;
    this.read?.abort(); this.read = null; this.flight = null; this.generation++;
    // A link may return to the same already-mounted calendar day. Discard its
    // old read before opening, while retaining any unresolved write/review lock.
    this.publish({ rows: [], loaded: false, loading: false, error: null, revision: this.state.revision + 1 });
  };
  dispose = () => { this.disposed = true; this.generation++; this.read?.abort(); this.listeners.clear(); };
}
