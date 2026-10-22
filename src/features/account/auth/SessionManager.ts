import { ApiError, asApiError, assertNotCancelled, cancelledRequest } from '../../../shared/api/http';
import type { createAccountApi } from '../api/accountApi';
import type { AccountProfile, LoginInput, LoginResult } from '../api/types';
import type { SessionCoordinator, SessionRecord, SessionState, SessionStore } from './sessionTypes';

type Api = ReturnType<typeof createAccountApi>;
export class SessionManager {
  state: SessionState = { phase: 'restoring', hasSession: false, profile: null, profileError: null,
    email: '', notice: '', logoutPending: false, canRestore: false, revision: 0 };
  private listeners = new Set<() => void>();
  private current: { pair: LoginResult; expiresAt: number } | null = null;
  private owner: string | null = null;
  private epoch = 0;
  private refreshFlight: Promise<LoginResult> | null = null;
  private restoreFlight: Promise<void> | null = null;
  constructor(private api: Api, private store: SessionStore, private coordinator: SessionCoordinator, private now = Date.now) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(change: Partial<SessionState>) { this.state = { ...this.state, ...change }; this.listeners.forEach(listener => listener()); }
  private identity(id: string | null) {
    if (this.owner !== id) { this.owner = id; this.state = { ...this.state, revision: this.state.revision + 1 }; }
  }
  private clear(notice = '', pending = false, phase: SessionState['phase'] = 'ready') {
    this.epoch++; this.current = null; this.identity(null);
    this.publish({ phase, hasSession: false, profile: null, profileError: null, email: '', notice, logoutPending: pending, canRestore: false });
  }
  private record(pair: LoginResult): SessionRecord { return { kind: 'active', userId: pair.user.id, refreshToken: pair.refreshToken }; }
  private async accept(pair: LoginResult, readProfile = true) {
    await this.store.write(this.record(pair));
    this.current = { pair, expiresAt: this.now() + pair.expiresIn * 1000 }; this.identity(pair.user.id);
    if (!readProfile) return true;
    try {
      const profile = await this.api.profile(pair.accessToken);
      this.checkProfile(profile, pair);
      this.publish({ phase: 'ready', hasSession: true, profile, profileError: null, email: profile.email, notice: '', canRestore: false, logoutPending: false });
      return true;
    } catch (error) {
      if (asApiError(error).status === 401) throw error;
      this.publish({ phase: 'ready', hasSession: true, profile: null, profileError: asApiError(error), email: pair.user.email, notice: '', canRestore: false, logoutPending: false });
      return false;
    }
  }
  private checkProfile(profile: AccountProfile, pair: LoginResult) {
    if (profile.id !== pair.user.id) throw new ApiError('Chưa xác nhận được đúng hồ sơ. Hãy đăng nhập lại.', 'PROFILE_MISMATCH');
  }
  private async pending(record: SessionRecord, notice: string) {
    await this.store.write({ ...record, kind: 'logout-pending' });
    this.clear(notice, true); this.coordinator.notify();
  }
  private async quarantine(record: SessionRecord, notice: string) {
    // The durable inflight journal was written before POST. Even if saving the
    // result now fails, discard the in-memory identity; next boot must not replay.
    try { await this.store.write({ ...record, kind: 'logout-pending' }); }
    finally { this.clear(notice, true); this.coordinator.notify(); }
  }
  private async finishLogout(record: SessionRecord): Promise<boolean> {
    try {
      await this.api.logout(record.refreshToken);
      await this.store.write({ kind: 'signed-out' });
      this.clear('Đã đăng xuất.'); this.coordinator.notify(); return true;
    } catch {
      this.clear('Đã thoát trên thiết bị này. Chưa xác nhận được đăng xuất với máy chủ; hãy thử lại khi có mạng.', true);
      return false;
    }
  }
  restore = (): Promise<void> => {
    if (this.restoreFlight) return this.restoreFlight;
    this.publish({ phase: 'restoring', profileError: null });
    const work = this.coordinator.run(async () => {
      const record = await this.store.read();
      if (!record || record.kind === 'signed-out') { this.clear(); return; }
      if (record.kind !== 'active') {
        await this.pending(record, 'Phiên trước chưa được xác nhận. Hãy đăng nhập lại.');
        await this.finishLogout(record); return;
      }
      await this.rotate(record, true);
    }).catch(error => {
      if (!this.state.logoutPending && this.state.phase !== 'ready') {
        this.clear(); this.publish({ phase: 'unavailable', profileError: asApiError(error), canRestore: true });
      }
    });
    this.restoreFlight = work.finally(() => { this.restoreFlight = null; });
    return this.restoreFlight;
  };
  private async rotate(record: SessionRecord, readProfile = false): Promise<LoginResult> {
    let sent = false;
    try {
      const pair = await this.api.refresh(record.refreshToken, async () => {
        await this.store.write({ ...record, kind: 'inflight' }); sent = true;
      });
      if (record.userId && pair.user.id !== record.userId) throw new ApiError('Phiên đã thay đổi. Hãy đăng nhập lại.', 'PROFILE_MISMATCH');
      await this.accept(pair, readProfile); return pair;
    } catch (failure) {
      const error = asApiError(failure);
      if (error.status === 401) {
        try { await this.store.write({ kind: 'signed-out' }); }
        finally { this.clear('Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại.'); this.coordinator.notify(); }
      } else if (sent) {
        await this.quarantine(record, 'Chưa xác nhận được việc làm mới phiên. Hãy đăng nhập lại để tiếp tục.');
        // Never repeat the refresh token. An old consumed token is still safe for idempotent logout.
      }
      throw error;
    }
  }
  private refresh(failedToken: string): Promise<LoginResult> {
    if (this.refreshFlight) return this.refreshFlight;
    const work = this.coordinator.run(async () => {
      if (this.current && this.current.pair.accessToken !== failedToken) return this.current.pair;
      const record = await this.store.read();
      if (!record || record.kind !== 'active') {
        this.clear('Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.', record?.kind === 'logout-pending');
        throw new ApiError('Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.', 'INVALID_ACCESS_TOKEN', 401);
      }
      return this.rotate(record);
    });
    this.refreshFlight = work.finally(() => { this.refreshFlight = null; }); return this.refreshFlight;
  }
  signIn = async (input: LoginInput, signal: AbortSignal): Promise<boolean> => this.coordinator.run(async () => {
    assertNotCancelled(signal);
    let previous = await this.store.read();
    if (previous && previous.kind !== 'active' && previous.kind !== 'signed-out') {
      if (!await this.finishLogout(previous)) throw new ApiError('Cần hoàn tất đăng xuất phiên trước khi đăng nhập. Kiểm tra mạng và thử lại.', 'LOGOUT_PENDING');
      previous = null;
    }
    let sent = false, received: LoginResult | null = null;
    const version = ++this.epoch;
    try {
      const pair = await this.api.login(input, signal, async () => {
        assertNotCancelled(signal);
        await this.store.write({ ...(previous ?? {}), kind: 'inflight' }); sent = true;
      });
      received = pair;
      if (signal.aborted) {
        await this.pending(this.record(pair), 'Đăng nhập đã được hủy.'); await this.finishLogout(this.record(pair)); throw cancelledRequest();
      }
      const loaded = await this.accept(pair);
      if (version !== this.epoch) throw cancelledRequest();
      this.coordinator.notify(); return loaded;
    } catch (failure) {
      const error = asApiError(failure);
      if (sent && !received && error.status >= 400 && error.status < 500) await this.store.write(previous ?? { kind: 'signed-out' });
      else if (sent && version === this.epoch) await this.quarantine(received ? this.record(received) : previous ?? { kind: 'inflight' },
        'Chưa xác nhận được đăng nhập. Hãy đăng nhập lại khi có mạng.');
      throw failure;
    }
  });
  reloadProfile = async (signal: AbortSignal): Promise<void> => {
    assertNotCancelled(signal);
    const version = this.epoch;
    let renewed = false;
    let current = this.current;
    if (!current) throw new ApiError('Bạn cần đăng nhập để xem hồ sơ.', 'AUTHENTICATION_REQUIRED', 401);
    try {
      if (current.expiresAt <= this.now() + 30_000) { await this.refresh(current.pair.accessToken); current = this.current; renewed = true; }
      assertNotCancelled(signal);
      if (!current || version !== this.epoch) throw cancelledRequest();
      let profile: AccountProfile;
      try { profile = await this.api.profile(current.pair.accessToken, signal); }
      catch (error) {
        if (asApiError(error).status !== 401 || renewed) throw error;
        const next = await this.refresh(current.pair.accessToken);
        assertNotCancelled(signal);
        if (version !== this.epoch) throw cancelledRequest();
        profile = await this.api.profile(next.accessToken, signal);
        current = this.current;
      }
      if (!current || version !== this.epoch) throw cancelledRequest();
      this.checkProfile(profile, current.pair); assertNotCancelled(signal);
      this.publish({ profile, profileError: null });
    } catch (error) {
      if (!signal.aborted && version === this.epoch && this.current) {
        if (asApiError(error).status === 401) await this.coordinator.run(async () => {
          if (version !== this.epoch) return;
          await this.pending(this.record(this.current!.pair), 'Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.');
        });
        else this.publish({ profile: null, profileError: asApiError(error) });
      }
      throw error;
    }
  };
  logout = async (): Promise<void> => this.coordinator.run(async () => {
    const record = await this.store.read();
    await this.pending(record ?? { kind: 'logout-pending' }, '');
    this.publish({ phase: 'signing-out' });
    await this.finishLogout(record ?? { kind: 'logout-pending' });
  });
  skipRestore = () => { this.clear('Chưa kiểm tra được phiên. Bạn đang xem giao diện chưa đăng nhập.'); this.publish({ canRestore: true }); };
  tick = async () => {
    const current = this.current;
    if (this.state.phase !== 'ready' || !current || current.expiresAt > this.now() + 30_000) return;
    try { await this.refresh(current.pair.accessToken); }
    catch (error) { if (this.current) this.publish({ profileError: asApiError(error) }); }
  };
  listen = () => this.coordinator.listen(() => {
    void this.store.read().then(record => {
      if (!record || record.kind === 'signed-out' || record.kind === 'logout-pending') this.clear('Bạn đã đăng xuất ở một cửa sổ khác.', record?.kind === 'logout-pending');
      else if (record.kind === 'active' && record.userId !== this.owner) void this.restore();
    }).catch(() => {});
  });
}
