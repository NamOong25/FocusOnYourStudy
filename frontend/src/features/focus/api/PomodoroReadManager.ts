import { asApiError, cancelledRequest, type ApiError } from '../../../shared/api/http';

export type PomodoroReadState<T> = { key: string | null; value: T | null; loaded: boolean; loading: boolean; error: ApiError | null };
export const emptyPomodoroRead = <T,>(): PomodoroReadState<T> => ({ key: null, value: null, loaded: false, loading: false, error: null });
export function visiblePomodoroRead<T>(snapshot: { owner: string | null; state: PomodoroReadState<T> }, owner: string | null, key: string | null) {
  return owner && key && snapshot.owner === owner && snapshot.state.key === key ? snapshot.state : emptyPomodoroRead<T>();
}
export class PomodoroReadManager<Q, T> {
  state = emptyPomodoroRead<T>();
  private generation = 0;
  private disposed = false;
  private controller: AbortController | null = null;
  private flight: Promise<T> | null = null;
  private listeners = new Set<() => void>();
  constructor(private read: (q: Q, signal: AbortSignal) => Promise<T>, private keyOf: (q: Q) => string) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<PomodoroReadState<T>>) { if (!this.disposed) { this.state = { ...this.state, ...patch }; this.listeners.forEach(f => f()); } }
  load = (query: Q, revision = ''): Promise<T> => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    const key = this.keyOf(query) + '|' + revision;
    if (this.state.key === key && this.flight) return this.flight;
    this.controller?.abort(); const generation = ++this.generation, controller = new AbortController(); this.controller = controller;
    this.publish({ key, value: null, loaded: false, loading: true, error: null });
    this.flight = Promise.resolve().then(() => this.read(query, controller.signal)).then(value => {
      if (this.disposed || generation !== this.generation) throw cancelledRequest();
      this.publish({ value, loaded: true }); return value;
    }).catch(failure => {
      if (!this.disposed && generation === this.generation) this.publish({ value: null, loaded: false, error: asApiError(failure) });
      throw failure;
    }).finally(() => { if (generation === this.generation) { this.flight = null; this.controller = null; this.publish({ loading: false }); } });
    return this.flight;
  };
  cancel = () => { this.generation++; this.controller?.abort(); this.controller = null; this.flight = null; this.publish({ loading: false, loaded: false, value: null, error: null }); };
  dispose = () => { this.cancel(); this.disposed = true; this.listeners.clear(); this.state = emptyPomodoroRead<T>(); };
}
