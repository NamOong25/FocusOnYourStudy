import { asApiError, cancelledRequest, type ApiError } from '../../../shared/api/http';
import type { ExportInfo, PreparedExport } from './dataExportApi';

type Delivery = 'browser' | 'sharing';
type Api = {
  prepare: (signal: AbortSignal) => Promise<PreparedExport>;
  deliver: (file: PreparedExport, signal: AbortSignal) => Promise<Delivery>;
};
export const emptyDataExport = () => ({
  phase: 'idle' as 'idle' | 'preparing' | 'ready' | 'saving' | 'sent',
  file: null as ExportInfo | null, error: null as ApiError | null, delivery: null as Delivery | null,
});

export class DataExportManager {
  state = emptyDataExport();
  private file: PreparedExport | null = null;
  private listeners = new Set<() => void>();
  private disposed = false;
  private flight: Promise<void> | null = null;
  private controller: AbortController | null = null;

  constructor(private api: Api) { }
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private valid() { if (this.disposed) throw cancelledRequest(); }
  private publish(patch: Partial<typeof this.state>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private run(phase: 'preparing' | 'saving', work: (signal: AbortSignal) => Promise<void>) {
    if (this.flight) return this.flight;
    this.valid();
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ phase, error: null, delivery: null });
    const flight = Promise.resolve().then(() => {
      this.valid();
      if (controller.signal.aborted) throw cancelledRequest();
      return work(controller.signal);
    }).catch(error => {
      if (!this.disposed && this.controller === controller) this.publish({ phase: this.file ? 'ready' : 'idle', error: asApiError(error) });
      throw error;
    }).finally(() => {
      if (this.controller === controller) { this.controller = null; this.flight = null; }
    });
    this.flight = flight;
    return flight;
  }
  prepare = () => {
    if (!this.flight) { this.file = null; this.publish({ file: null }); }
    return this.run('preparing', async signal => {
      const file = await this.api.prepare(signal);
      this.valid();
      if (signal.aborted) throw cancelledRequest();
      this.file = file;
      const { text: _, ...info } = file;
      this.publish({ phase: 'ready', file: info });
    });
  };
  save = () => this.run('saving', async signal => {
    if (!this.file) throw new Error('Missing prepared export');
    const delivery = await this.api.deliver(this.file, signal);
    this.valid();
    if (signal.aborted) throw cancelledRequest();
    this.publish({ phase: 'sent', delivery });
  });
  cancel = () => {
    this.controller?.abort();
    this.controller = null;
    this.flight = null;
    this.file = null;
    this.publish(emptyDataExport());
  };
  dispose = () => {
    this.disposed = true;
    this.controller?.abort();
    this.file = null;
    this.state = emptyDataExport();
    this.listeners.clear();
  };
}
