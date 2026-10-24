import { asApiError, cancelledRequest, type ApiError } from '../../../shared/api/http';
import { queryKey, type ScheduleQuery, type ServerOccurrence, type createScheduleApi } from './scheduleApi';

export type ScheduleState = { key: string | null; rows: ServerOccurrence[]; loaded: boolean; loading: boolean; error: ApiError | null };
export const emptyScheduleState = (): ScheduleState => ({ key: null, rows: [], loaded: false, loading: false, error: null });
export class ScheduleManager {
  state = emptyScheduleState();
  private listeners = new Set<() => void>();
  private generation = 0;
  private disposed = false;
  private read: AbortController | null = null;
  private flight: Promise<ServerOccurrence[]> | null = null;
  constructor(private api: ReturnType<typeof createScheduleApi>) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<ScheduleState>) { if (!this.disposed) { this.state = { ...this.state, ...change }; this.listeners.forEach(fn => fn()); } }
  load = (q: ScheduleQuery): Promise<ServerOccurrence[]> => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    const key = queryKey(q);
    if (key === this.state.key && this.flight) return this.flight;
    this.read?.abort(); const generation = ++this.generation, controller = new AbortController(); this.read = controller;
    this.publish({ ...(key === this.state.key ? {} : { key, rows: [], loaded: false }), loading: true, error: null });
    this.flight = this.api.list(q, controller.signal).then(rows => {
      if (this.disposed || generation !== this.generation) throw cancelledRequest();
      this.publish({ rows, loaded: true }); return rows;
    }).catch(error => {
      if (!this.disposed && generation === this.generation) this.publish({ error: asApiError(error) });
      throw error;
    }).finally(() => { if (generation === this.generation) { this.flight = null; this.read = null; this.publish({ loading: false }); } });
    return this.flight;
  };
  dispose = () => { this.disposed = true; this.generation++; this.read?.abort(); this.listeners.clear(); };
}
