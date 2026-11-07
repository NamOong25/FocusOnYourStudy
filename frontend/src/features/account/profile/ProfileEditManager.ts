import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import type { AccountProfile } from '../api/types';
import { editableProfile, profileDraft, profileUpdate, sameProfileFields, type EditableProfile, type ProfileDraft, type ProfileUpdate } from './profileData';

type Api = { read: (signal: AbortSignal) => Promise<AccountProfile>; save: (input: ProfileUpdate, signal: AbortSignal) => Promise<AccountProfile> };
export const emptyProfileEdit = () => ({ loaded: false, busy: false, baseline: null as EditableProfile | null,
  draft: { fullName: '', school: '', major: '' }, latest: null as EditableProfile | null,
  reviewRequired: false, error: null as ApiError | null, notice: '' });
export class ProfileEditManager {
  state = emptyProfileEdit();
  private listeners = new Set<() => void>(); private disposed = false; private flight: Promise<void> | null = null;
  private controller: AbortController | null = null; private submitted: ProfileUpdate | null = null;
  constructor(private owner: string, private api: Api) { }
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private valid() { if (this.disposed) throw cancelledRequest(); }
  private publish(patch: Partial<typeof this.state>) { if (!this.disposed) { this.state = { ...this.state, ...patch }; this.listeners.forEach(fn => fn()); } }
  private profile(value: AccountProfile) { this.valid(); const p = editableProfile(value); if (p.id !== this.owner) throw cancelledRequest(); return p; }
  private run(work: (signal: AbortSignal) => Promise<void>) {
    if (this.flight) return this.flight;
    this.valid(); const controller = new AbortController(); this.controller = controller; this.publish({ busy: true, error: null, notice: '' });
    const request = work(controller.signal).catch(e => { this.valid(); this.publish({ error: asApiError(e) }); throw e; })
      .finally(() => { if (!this.disposed) { this.controller = null; this.flight = null; this.publish({ busy: false }); } });
    this.flight = request; return request;
  }
  get dirty() { return !!this.state.baseline && !sameProfileFields(this.state.draft, this.state.baseline); }
  edit = (field: keyof ProfileDraft, value: string) => {
    if (this.disposed || this.state.busy || !this.state.loaded) return;
    const fields = { ...this.state.error?.fields }; delete fields[field];
    const error = this.state.error?.fields[field] ? Object.keys(fields).length ? new ApiError(this.state.error.message, this.state.error.code, this.state.error.status, fields) : null : this.state.error;
    this.publish({ draft: { ...this.state.draft, [field]: value }, error, notice: '' });
  };
  read = () => this.run(async signal => {
    this.publish({ latest: null });
    const p = this.profile(await this.api.read(signal));
    if (!this.state.baseline) { this.publish({ loaded: true, baseline: p, draft: profileDraft(p), latest: null, reviewRequired: false }); return; }
    if (this.submitted && sameProfileFields(p, this.submitted) && p.version >= this.submitted.version) {
      this.submitted = null;
      this.publish({ baseline: p, latest: null, reviewRequired: false, notice: 'Đã đối chiếu: tài khoản hiện đang có nội dung đã gửi. Bản đang nhập của bạn được giữ.' });
    } else {
      this.publish({ latest: p, reviewRequired: true, notice: 'Đã đọc hồ sơ hiện tại. Đối chiếu bên dưới rồi chọn cách tiếp tục; nội dung đang nhập vẫn được giữ.' });
    }
  });
  save = () => this.run(async signal => {
    if (!this.state.baseline || this.state.reviewRequired) throw new ApiError('Đọc và đối chiếu hồ sơ hiện tại trước khi lưu tiếp.', 'PROFILE_REVIEW_REQUIRED');
    const input = profileUpdate(this.state.draft, this.state.baseline.version);
    if (!this.dirty) return;
    this.submitted = input;
    try {
      const p = this.profile(await this.api.save(input, signal));
      if (!sameProfileFields(p, input) || p.version < input.version) throw new ApiError('Chưa xác nhận được hồ sơ đã lưu. Đọc lại để đối chiếu.', 'INVALID_PROFILE_RESPONSE');
      this.submitted = null;
      this.publish({ baseline: p, draft: profileDraft(p), latest: null, reviewRequired: false, notice: 'Đã lưu hồ sơ tài khoản thành công.' });
    } catch (e) {
      this.valid(); const error = asApiError(e);
      if (!error.status || error.status === 409 || error.status >= 500) this.publish({ reviewRequired: true, latest: null });
      throw e;
    }
  });
  resolve = (keepDraft: boolean) => {
    this.valid(); if (this.state.busy || !this.state.latest) return;
    const p = this.state.latest; this.submitted = null;
    this.publish({ baseline: p, draft: keepDraft ? this.state.draft : profileDraft(p), latest: null, reviewRequired: false, error: null,
      notice: keepDraft ? 'Đã giữ bản đang nhập. Kiểm tra nội dung rồi bấm Lưu nếu muốn dùng bản này.' : 'Đã dùng nội dung hồ sơ hiện tại.' });
  };
  dispose = () => { this.disposed = true; this.controller?.abort(); this.listeners.clear(); };
}
