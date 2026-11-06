import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import { parseReminderPreferences, sameReminderPreferences, type ReminderPreferences } from './reminderPreferencesData';

export const emptySavedReminderPreferences = () => ({
  value: null as ReminderPreferences | null, loading: false, error: null as ApiError | null,
});

export class ReminderPreferencesSource {
  state = emptySavedReminderPreferences();
  private listeners = new Set<() => void>();
  private disposed = false;
  private controller: AbortController | null = null;
  private flight: Promise<ReminderPreferences> | null = null;

  constructor(private read: (signal: AbortSignal) => Promise<ReminderPreferences>) { }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<typeof this.state>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  accept = (input: ReminderPreferences) => {
    if (this.disposed) throw cancelledRequest();
    const next = parseReminderPreferences(input), current = this.state.value;
    if (current && next.version < current.version) return current;
    if (current && next.version === current.version && !sameReminderPreferences(next, current)) {
      throw new ApiError('Cấu hình nhắc học chưa nhất quán. Hãy tải lại để kiểm tra.', 'INVALID_REMINDER_PREFERENCES_RESPONSE');
    }
    this.publish({ value: next, error: null });
    return next;
  };
  reload = () => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    if (this.flight) return this.flight;
    const controller = new AbortController();
    const initialVersion = this.state.value?.version ?? -1;
    this.controller = controller;
    this.publish({ loading: true, error: null });
    this.flight = Promise.resolve().then(() => {
      if (this.disposed) throw cancelledRequest();
      return this.read(controller.signal);
    })
      .then(this.accept)
      .catch(error => {
        if (!this.disposed && (this.state.value?.version ?? -1) <= initialVersion) this.publish({ error: asApiError(error) });
        throw error;
      })
      .finally(() => {
        this.flight = null;
        this.controller = null;
        this.publish({ loading: false });
      });
    return this.flight;
  };
  dispose = () => {
    this.disposed = true;
    this.controller?.abort();
    this.listeners.clear();
    this.state = emptySavedReminderPreferences();
  };
}
