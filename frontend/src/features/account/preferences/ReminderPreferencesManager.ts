import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import { parseReminderPreferences, reminderDraft, reminderPreferencesInput, sameReminderPreferences, type ReminderDraft, type ReminderPreferences } from './reminderPreferencesData';

type Api = {
  read: (signal: AbortSignal) => Promise<ReminderPreferences>;
  save: (input: ReminderPreferences, signal: AbortSignal) => Promise<ReminderPreferences>;
};
export const emptyReminderPreferences = () => ({
  baseline: null as ReminderPreferences | null, draft: null as ReminderDraft | null, latest: null as ReminderPreferences | null,
  busy: false, reviewRequired: false, error: null as ApiError | null, notice: '',
});

export class ReminderPreferencesManager {
  state = emptyReminderPreferences();
  private listeners = new Set<() => void>();
  private disposed = false;
  private flight: Promise<void> | null = null;
  private controller: AbortController | null = null;
  private submitted: ReminderPreferences | null = null;

  constructor(private api: Api) { }

  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private valid() { if (this.disposed) throw cancelledRequest(); }
  private publish(patch: Partial<typeof this.state>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private run(work: (signal: AbortSignal) => Promise<void>) {
    if (this.flight) return this.flight;
    this.valid();
    const controller = new AbortController();
    this.controller = controller;
    this.publish({ busy: true, error: null, notice: '' });
    const flight = Promise.resolve().then(() => { this.valid(); return work(controller.signal); })
      .catch(error => { this.valid(); this.publish({ error: asApiError(error) }); throw error; })
      .finally(() => {
        if (!this.disposed) {
          this.flight = null;
          this.controller = null;
          this.publish({ busy: false });
        }
      });
    this.flight = flight;
    return flight;
  }

  get dirty() {
    return !!this.state.baseline && !!this.state.draft && !sameReminderPreferences(this.state.draft, this.state.baseline);
  }
  edit = <K extends keyof ReminderDraft>(field: K, value: ReminderDraft[K]) => {
    if (this.disposed || this.state.busy || !this.state.draft) return;
    this.publish({ draft: { ...this.state.draft, [field]: value }, error: null, notice: '' });
  };
  read = () => this.run(async signal => {
    this.publish({ latest: null });
    const current = parseReminderPreferences(await this.api.read(signal));
    this.valid();
    if (!this.state.baseline) {
      this.publish({ baseline: current, draft: reminderDraft(current), latest: null, reviewRequired: false });
    } else if (this.submitted && current.version > this.submitted.version && sameReminderPreferences(current, this.submitted)) {
      this.submitted = null;
      this.publish({ baseline: current, latest: null, reviewRequired: false, notice: 'Đã đối chiếu. Tài khoản đang có các lựa chọn bạn đã gửi.' });
    } else {
      this.publish({ latest: current, reviewRequired: true, notice: 'Đã tải cấu hình trên tài khoản. Đối chiếu bên dưới và chọn cách tiếp tục.' });
    }
  });
  save = () => this.run(async signal => {
    if (!this.state.baseline || !this.state.draft || this.state.reviewRequired) {
      throw new ApiError('Đọc và đối chiếu tùy chọn trước khi lưu tiếp.', 'REMINDER_PREFERENCES_REVIEW_REQUIRED');
    }
    const input = reminderPreferencesInput(this.state.draft, this.state.baseline.version);
    if (!this.dirty) return;
    this.submitted = input;
    try {
      const current = parseReminderPreferences(await this.api.save(input, signal));
      this.valid();
      if (current.version !== input.version + 1 || !sameReminderPreferences(current, input)) {
        throw new ApiError('Chưa xác nhận được tùy chọn đã lưu. Đọc lại để đối chiếu.', 'INVALID_REMINDER_PREFERENCES_RESPONSE');
      }
      this.submitted = null;
      this.publish({ baseline: current, draft: reminderDraft(current), latest: null, reviewRequired: false, notice: 'Đã lưu tùy chọn nhắc học vào tài khoản.' });
    } catch (failure) {
      this.valid();
      const error = asApiError(failure);
      if (!error.status || [408, 409].includes(error.status) || error.status >= 500) {
        this.publish({ reviewRequired: true, latest: null });
      } else this.submitted = null;
      throw failure;
    }
  });
  resolve = (keepDraft: boolean) => {
    this.valid();
    if (this.state.busy || !this.state.latest) return;
    const current = this.state.latest;
    this.submitted = null;
    this.publish({ baseline: current, draft: keepDraft ? this.state.draft : reminderDraft(current), latest: null,
      reviewRequired: false, error: null, notice: keepDraft ? 'Đã giữ lựa chọn đang chỉnh. Kiểm tra rồi bấm Lưu để dùng bản này.' : 'Đã dùng cấu hình hiện tại trên tài khoản.' });
  };
  dispose = () => {
    this.disposed = true;
    this.controller?.abort();
    this.listeners.clear();
  };
}
