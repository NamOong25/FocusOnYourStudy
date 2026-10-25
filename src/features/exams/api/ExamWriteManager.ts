import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import { examInput, type ExamInput, type ServerExam, type createExamsApi } from './examsApi';

export type ExamPending = { operation: 'create' | 'update' | 'delete'; original?: ServerExam; input?: ExamInput; reason: 'uncertain' | 'stale' | 'gone' };
export type ExamCheck = { current: ServerExam | null; rows: ServerExam[] };
export const emptyExamWrite = () => ({ busy: false, checking: false, revision: 0, error: null as ApiError | null, pending: null as ExamPending | null, checked: null as ExamCheck | null });
export class ExamWriteManager {
  state = emptyExamWrite();
  private disposed = false;
  private listeners = new Set<() => void>();
  private read: AbortController | null = null;
  constructor(private api: ReturnType<typeof createExamsApi>) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private publish(patch: Partial<typeof this.state>) { if (!this.disposed) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); } }
  private async write<T>(pending: Omit<ExamPending, 'reason'>, operation: () => Promise<T>): Promise<T> {
    if (this.disposed) throw cancelledRequest();
    if (this.state.busy || this.state.checking) throw new ApiError('Đang xử lý lịch thi. Đợi một chút nhé.', 'REQUEST_BUSY');
    if (this.state.pending) throw new ApiError('Kiểm tra kết quả lần ghi trước trước khi tiếp tục.', 'EXAM_REVIEW_REQUIRED');
    this.publish({ busy: true, error: null, checked: null });
    try {
      const result = await operation();
      if (this.disposed) throw cancelledRequest();
      this.publish({ revision: this.state.revision + 1 }); return result;
    } catch (failure) {
      const error = asApiError(failure);
      const reason = error.code === 'EXAM_VERSION_CONFLICT' ? 'stale' : error.code === 'EXAM_NOT_FOUND' ? 'gone'
        : !error.status || error.status >= 500 || error.code === 'DATA_CONFLICT' ? 'uncertain' : null;
      this.publish({ error, ...(reason ? { pending: { ...pending, reason }, revision: this.state.revision + 1 } : {}) });
      throw error;
    } finally { this.publish({ busy: false }); }
  }
  save = (input: ExamInput, original?: ServerExam) => {
    // Snapshot before the request: neither form edits nor response readers may change its version/body.
    const snapshot = examInput(input), basis = original ? { ...original, reminderMinutes: [...original.reminderMinutes] } : undefined;
    return this.write({ operation: basis ? 'update' : 'create', input: snapshot, original: basis }, () => this.api.save(snapshot, basis));
  };
  remove = (original: ServerExam) => {
    const basis = { ...original, reminderMinutes: [...original.reminderMinutes] };
    return this.write({ operation: 'delete', original: basis }, () => this.api.remove(basis));
  };
  check = async (): Promise<ExamCheck> => {
    if (this.disposed) throw cancelledRequest();
    if (this.state.busy || this.state.checking || !this.state.pending) throw new ApiError('Chưa thể kiểm tra lúc này.', 'REQUEST_BUSY');
    const pending = this.state.pending, controller = new AbortController(); this.read = controller;
    this.publish({ checking: true, error: null, checked: null });
    try {
      let checked: ExamCheck;
      if (pending.original) {
        let current: ServerExam | null;
        try { current = await this.api.get(pending.original.id, controller.signal); }
        catch (failure) { if (asApiError(failure).code === 'EXAM_NOT_FOUND') current = null; else throw failure; }
        checked = { current, rows: current ? [current] : [] };
      } else checked = { current: null, rows: await this.api.all(controller.signal) };
      if (this.disposed || controller.signal.aborted) throw cancelledRequest();
      this.publish({ checked }); return checked;
    } catch (failure) { this.publish({ error: asApiError(failure) }); throw failure; }
    finally { this.read = null; this.publish({ checking: false }); }
  };
  // A successful GET alone never removes an uncertain-write lock. The user must review it.
  acknowledge = () => {
    if (this.disposed || this.state.busy || this.state.checking || !this.state.checked) return false;
    this.publish({ pending: null, checked: null, error: null, revision: this.state.revision + 1 }); return true;
  };
  clearError = () => { if (!this.state.pending && !this.state.busy) this.publish({ error: null }); };
  dispose = () => { this.disposed = true; this.read?.abort(); this.listeners.clear(); this.state = emptyExamWrite(); };
}
