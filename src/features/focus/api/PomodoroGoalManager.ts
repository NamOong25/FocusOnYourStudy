import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import type { PomodoroGoal, PomodoroInsightsApi } from './pomodoroInsightsApi';

type Draft = { dailySessions: number; version: number; baseline: number };
type Attempt = { dailySessions: number; version: number };
export type PomodoroGoalState = { goal: PomodoroGoal | null; draft: Draft | null; pending: Attempt | null;
  loaded: boolean; busy: boolean; loading: boolean; needsReload: boolean; needsReview: boolean; error: ApiError | null; notice: string; revision: number };
export const emptyPomodoroGoal = (): PomodoroGoalState => ({ goal: null, draft: null, pending: null, loaded: false, busy: false, loading: false, needsReload: false, needsReview: false, error: null, notice: '', revision: 0 });
const conflict = () => new ApiError('Mục tiêu đã thay đổi ở nơi khác. Đọc mục tiêu mới rồi chọn lại trước khi lưu.', 'POMODORO_GOAL_VERSION_CONFLICT', 409);
const uncertain = (e: ApiError) => e.status === 0 || e.status >= 500 || e.code === 'INVALID_RESPONSE';
export class PomodoroGoalManager {
  state = emptyPomodoroGoal();
  private disposed = false;
  private controller: AbortController | null = null;
  private flight: Promise<PomodoroGoal> | null = null;
  private listeners = new Set<() => void>();
  constructor(private api: Pick<PomodoroInsightsApi, 'goal' | 'saveGoal'>, private notify: () => void = () => {}) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<PomodoroGoalState>) { if (!this.disposed) { this.state = { ...this.state, ...patch }; this.listeners.forEach(f => f()); } }
  private announce() { try { this.notify(); } catch { /* A failed tab signal cannot undo a confirmed server result. */ } }
  private ready() { if (this.disposed) throw cancelledRequest(); if (this.state.busy || this.state.loading) throw new ApiError('Đang đối chiếu mục tiêu. Vui lòng chờ.', 'REQUEST_BUSY'); }
  begin = () => { this.ready(); if (!this.state.draft && this.state.loaded && this.state.goal && !this.state.needsReload) this.publish({ draft: { dailySessions: this.state.goal.dailySessions, baseline: this.state.goal.dailySessions, version: this.state.goal.version } }); };
  choose = (dailySessions: number) => { this.ready(); if (this.state.pending || !this.state.draft) return; if (!Number.isInteger(dailySessions) || dailySessions < 1 || dailySessions > 12) throw new ApiError('Chọn từ 1 đến 12 phiên.', 'INVALID_POMODORO_GOAL'); this.publish({ draft: { ...this.state.draft, dailySessions }, notice: '' }); };
  close = () => { if (!this.state.busy && !this.state.pending) this.publish({ draft: null }); };
  adopt = () => { this.ready(); if (this.state.pending || !this.state.goal || !this.state.loaded || this.state.needsReload) return; this.publish({ draft: { dailySessions: this.state.goal.dailySessions, baseline: this.state.goal.dailySessions, version: this.state.goal.version }, needsReview: false, error: null, notice: '' }); };
  load = (): Promise<PomodoroGoal> => {
    if (this.disposed) return Promise.reject(cancelledRequest());
    if (this.state.loading && this.flight) return this.flight;
    if (this.state.busy) return Promise.reject(new ApiError('Đang lưu mục tiêu.', 'REQUEST_BUSY'));
    const controller = new AbortController(); this.controller = controller;
    this.publish({ loading: true, error: null });
    this.flight = this.api.goal(controller.signal).then(goal => {
      if (this.disposed) throw cancelledRequest();
      const { pending, draft } = this.state;
      const confirmed = !!pending && goal.dailySessions === pending.dailySessions && goal.version >= pending.version;
      const changed = !!this.state.goal && (goal.version !== this.state.goal.version || goal.dailySessions !== this.state.goal.dailySessions);
      const moved = !!pending && goal.version > pending.version;
      const stillPending = pending && !confirmed && !moved ? pending : null;
      const needsReview = !confirmed && !!draft && draft.version !== goal.version;
      this.publish({ goal, loaded: true, needsReload: false, pending: stillPending, needsReview,
        revision: this.state.revision + (confirmed || changed ? 1 : 0),
        ...(confirmed ? { draft: { dailySessions: goal.dailySessions, baseline: goal.dailySessions, version: goal.version }, notice: `Đã đối chiếu: mục tiêu hiện là ${goal.dailySessions} phiên/ngày.` } : {}),
        error: needsReview ? conflict() : null });
      if (confirmed) this.announce();
      return goal;
    }).catch(e => { if (!this.disposed) this.publish({ needsReload: true, loaded: false, error: asApiError(e) }); throw e; })
      .finally(() => { this.flight = null; this.controller = null; this.publish({ loading: false }); });
    return this.flight;
  };
  save = (): Promise<PomodoroGoal> => {
    this.ready();
    const { draft, goal } = this.state;
    if (!draft || !goal || !this.state.loaded || this.state.needsReload || this.state.pending) return Promise.reject(new ApiError('Đọc lại mục tiêu trước khi lưu.', 'POMODORO_GOAL_READ_REQUIRED'));
    if (this.state.needsReview || draft.version !== goal.version) return Promise.reject(conflict());
    return this.write({ dailySessions: draft.dailySessions, version: draft.version });
  };
  retry = (): Promise<PomodoroGoal> => {
    this.ready(); const { pending, goal } = this.state;
    if (!pending || !goal || !this.state.loaded || this.state.needsReload || goal.version !== pending.version) return Promise.reject(new ApiError('Đối chiếu mục tiêu đã lưu trước khi gửi lại.', 'POMODORO_GOAL_READ_REQUIRED'));
    return this.write(pending);
  };
  private write(attempt: Attempt): Promise<PomodoroGoal> {
    const previouslyUncertain = !!this.state.pending, previousGoal = this.state.goal, controller = new AbortController(); this.controller = controller;
    this.publish({ busy: true, pending: { ...attempt }, error: null, notice: '' });
    return this.api.saveGoal({ ...attempt }, controller.signal).then(goal => {
      if (this.disposed) throw cancelledRequest();
      if (goal.version === attempt.version && (!previousGoal?.persisted || previousGoal.dailySessions !== attempt.dailySessions)) throw new ApiError('Kết quả lưu mục tiêu cần được đối chiếu lại.', 'INVALID_RESPONSE');
      this.publish({ goal, loaded: true, pending: null, needsReload: false, needsReview: false,
        draft: { dailySessions: goal.dailySessions, baseline: goal.dailySessions, version: goal.version }, notice: `Đã lưu mục tiêu ${goal.dailySessions} phiên/ngày.`, revision: this.state.revision + 1 });
      this.announce(); return goal;
    }).catch(failure => {
      if (!this.disposed) {
        // A browser may retry a PUT after losing its reply. The retry can return
        // 409 even though the original write committed; GET must resolve it.
        const error = asApiError(failure), keep = previouslyUncertain || uncertain(error) || error.status === 409;
        this.publish({ error, pending: keep ? { ...attempt } : null, needsReload: keep || error.status === 409, needsReview: error.status === 409 });
      }
      throw failure;
    }).finally(() => { this.controller = null; this.publish({ busy: false }); });
  }
  dispose = () => { this.disposed = true; this.controller?.abort(); this.listeners.clear(); this.state = emptyPomodoroGoal(); };
}
