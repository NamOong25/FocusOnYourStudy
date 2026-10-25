import { asApiError, cancelledRequest, isCancelled, type ApiError } from '../../../shared/api/http';
import { overviewKey, type OverviewQuery, type OverviewSnapshot } from './overview';
import type { createOverviewApi } from './overviewApi';

export type OverviewState = OverviewSnapshot & { key: string | null; loaded: boolean; loading: boolean; error: ApiError | null; receivedAt: number | null };
export const emptyOverview = (): OverviewState => ({ key: null, rules: [], rows: [], loaded: false, loading: false, error: null, receivedAt: null });
export const overviewCacheKey = (q: OverviewQuery, revision: number) => `${overviewKey(q)}:r${revision}`;
export class OverviewManager {
  state = emptyOverview();
  private listeners = new Set<() => void>();
  private generation = 0;
  private disposed = false;
  private read: AbortController | null = null;
  private flight: Promise<OverviewSnapshot> | null = null;
  constructor(private api: ReturnType<typeof createOverviewApi>) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<OverviewState>) { if (!this.disposed) { this.state = { ...this.state, ...change }; this.listeners.forEach(listener => listener()); } }
  load = (q: OverviewQuery, revision: number): Promise<OverviewSnapshot> => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    const key = overviewCacheKey(q, revision);
    if (key === this.state.key && this.flight) return this.flight;
    this.read?.abort(); const generation = ++this.generation, controller = new AbortController(); this.read = controller;
    this.publish({ ...(key !== this.state.key ? { ...emptyOverview(), key } : {}), loading: true, error: null });
    this.flight = this.api.read(q, controller.signal).then(value => {
      if (this.disposed || generation !== this.generation) throw cancelledRequest();
      this.publish({ ...value, loaded: true, receivedAt: Date.now() }); return value;
    }).catch(error => { if (generation === this.generation && !isCancelled(error)) this.publish({ error: asApiError(error) }); throw error; })
      .finally(() => { if (generation === this.generation) { this.flight = null; this.read = null; this.publish({ loading: false }); } });
    return this.flight;
  };
  cancel = () => { this.generation++; this.read?.abort(); this.read = null; this.flight = null; this.publish({ loading: false }); };
  dispose = () => { this.disposed = true; this.cancel(); this.listeners.clear(); };
}
