import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import { emptyPasswordDraft, passwordDraftUpdate, type PasswordDraft, type PasswordChangeOutcome, type PasswordUpdate } from './passwordData';

export class PasswordChangeManager {
  state = { draft: emptyPasswordDraft(), busy: false, error: null as ApiError | null };
  private listeners = new Set<() => void>();
  private disposed = false;
  private controller = new AbortController();
  private flight: Promise<PasswordChangeOutcome> | null = null;
  constructor(private save: (input: PasswordUpdate, signal: AbortSignal) => Promise<PasswordChangeOutcome>) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(patch: Partial<typeof this.state>) { if (!this.disposed) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); } }
  get dirty() { return Object.values(this.state.draft).some(Boolean); }
  edit = (field: keyof PasswordDraft, value: string) => {
    if (this.disposed || this.state.busy) return;
    this.publish({ draft: { ...this.state.draft, [field]: value }, error: null });
  };
  submit = (): Promise<PasswordChangeOutcome> => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    if (this.flight) return this.flight;
    let body: PasswordUpdate;
    try { body = passwordDraftUpdate(this.state.draft); }
    catch (e) { this.publish({ error: asApiError(e) }); return Promise.reject(e); }
    this.publish({ busy: true, error: null });
    const work = Promise.resolve().then(() => this.save(body, this.controller.signal)).then(outcome => {
      this.publish({ draft: emptyPasswordDraft() }); return outcome;
    }).catch(e => { this.publish({ error: asApiError(e) }); throw e; }).finally(() => { this.flight = null; this.publish({ busy: false }); });
    this.flight = work; return work;
  };
  dispose = () => {
    this.disposed = true; this.controller.abort(); this.listeners.clear();
    this.state = { draft: emptyPasswordDraft(), busy: false, error: null };
  };
}
