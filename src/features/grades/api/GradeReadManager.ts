import { asApiError, cancelledRequest, type ApiError } from '../../../shared/api/http';

export type GradeReadState<T> = { key: string | null; value: T | null; loaded: boolean; loading: boolean; error: ApiError | null };
export const emptyGradeRead = <T,>(): GradeReadState<T> => ({ key: null, value: null, loaded: false, loading: false, error: null });
export function visibleGradeRead<T>(snapshot:{owner:string|null;state:GradeReadState<T>},owner:string|null,key:string|null) {
  return owner && key && snapshot.owner===owner && snapshot.state.key===key ? snapshot.state : emptyGradeRead<T>();
}

// One current query per resource. List and detail own separate instances;
// changing query/account cannot publish an old response, even if fetch ignores abort.
export class GradeReadManager<Q, T> {
  state = emptyGradeRead<T>();
  private generation = 0;
  private controller: AbortController | null = null;
  private flight: Promise<T> | null = null;
  private disposed = false;
  private listeners = new Set<() => void>();
  constructor(private read: (query: Q, signal: AbortSignal) => Promise<T>, private keyOf: (query: Q) => string) { }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<GradeReadState<T>>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch }; this.listeners.forEach(listener => listener());
  }
  load = (query: Q): Promise<T> => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    const key = this.keyOf(query);
    if (key === this.state.key && this.flight) return this.flight;
    this.controller?.abort(); const generation = ++this.generation, controller = new AbortController(); this.controller = controller;
    this.publish({ ...(key !== this.state.key ? { key, value: null, loaded: false } : {}), loading: true, error: null });
    this.flight = Promise.resolve().then(() => this.read(query, controller.signal)).then(value => {
      if (this.disposed || generation !== this.generation) throw cancelledRequest();
      this.publish({ value, loaded: true }); return value;
    }).catch(failure => {
      if (!this.disposed && generation === this.generation) {
        const error = asApiError(failure);
        this.publish({ error, value: null, loaded: false });
      }
      throw failure;
    }).finally(() => {
      if (generation === this.generation) { this.flight = null; this.controller = null; this.publish({ loading: false }); }
    });
    return this.flight;
  };
  cancel = () => {
    this.generation++; this.controller?.abort(); this.controller = null; this.flight = null; this.publish({ loading: false });
  };
  dispose = () => { this.cancel(); this.disposed = true; this.listeners.clear(); this.state = emptyGradeRead<T>(); };
}
