import { ApiError } from '../../../shared/api/http';
import { API_BASE_URL } from '../../../shared/api/config';
import type { SessionCoordinator, SessionRecord, SessionStore } from './sessionTypes';

const key = 'focus-study.session.v1.' + encodeURIComponent(API_BASE_URL);
const storageError = () => new ApiError('Không thể lưu trạng thái phiên trên trình duyệt. Kiểm tra quyền lưu trữ rồi thử lại.', 'SESSION_STORAGE_ERROR');
export const sessionStore: SessionStore = {
  async read() {
    try {
      const text = localStorage.getItem(key); if (!text) return null;
      const value = JSON.parse(text);
      if (!value || !['active', 'inflight', 'logout-pending', 'signed-out'].includes(value.kind)) return { kind: 'signed-out' };
      return { kind: value.kind, ...(typeof value.userId === 'string' ? { userId: value.userId } : {}) };
    } catch { throw storageError(); }
  },
  async write(record: SessionRecord) {
    // Only a recovery journal/UUID, never tokens, passwords or the profile.
    try { localStorage.setItem(key, JSON.stringify({ kind: record.kind, userId: record.userId })); } catch { throw storageError(); }
  },
};
let channel: BroadcastChannel | null = null;
export const sessionCoordinator: SessionCoordinator = {
  async run(operation) {
    if (!navigator.locks) throw new ApiError('Trình duyệt chưa hỗ trợ giữ phiên an toàn. Hãy dùng phiên bản trình duyệt mới.', 'SESSION_LOCK_UNAVAILABLE');
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
    try { return await navigator.locks.request(key, { signal: controller.signal }, async () => { clearTimeout(timer); return operation(); }); }
    catch (error) { if (controller.signal.aborted) throw new ApiError('Một tab khác đang xử lý phiên. Đợi một chút rồi thử lại.', 'SESSION_LOCK_TIMEOUT'); throw error; }
    finally { clearTimeout(timer); }
  },
  notify() { channel?.postMessage('session-changed'); },
  listen(callback) {
    channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(key) : null;
    const current = channel; if (current) current.onmessage = callback;
    const changed = (event: StorageEvent) => { if (event.key === key) callback(); };
    window.addEventListener('storage', changed);
    return () => { window.removeEventListener('storage', changed); current?.close(); if (channel === current) channel = null; };
  },
};
