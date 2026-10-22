import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../shared/api/config';
import { ApiError } from '../../../shared/api/http';
import type { SessionCoordinator, SessionStore } from './sessionTypes';

// Key names permit alphanumeric/dot/dash/underscore. Separate development servers.
const key = 'focus-study-session-v1-' + API_BASE_URL.replace(/[^a-zA-Z0-9.-]/g, '_');
const options = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };
const storageError = () => new ApiError('Không thể truy cập kho bảo mật của thiết bị. Hãy thử lại.', 'SESSION_STORAGE_ERROR');
export const sessionStore: SessionStore = {
  async read() {
    try {
      const text = await SecureStore.getItemAsync(key, options); if (!text) return null;
      const value = JSON.parse(text);
      if (!value || !['active', 'inflight', 'logout-pending', 'signed-out'].includes(value.kind)) return { kind: 'signed-out' };
      return { kind: value.kind, userId: typeof value.userId === 'string' ? value.userId : undefined,
        refreshToken: typeof value.refreshToken === 'string' ? value.refreshToken : undefined };
    } catch { throw storageError(); }
  },
  async write(record) {
    try {
      if (record.kind === 'signed-out') await SecureStore.deleteItemAsync(key, options);
      else await SecureStore.setItemAsync(key, JSON.stringify(record), options);
    } catch { throw storageError(); }
  },
};
let tail: Promise<unknown> = Promise.resolve();
export const sessionCoordinator: SessionCoordinator = {
  run(operation) { const result = tail.then(operation); tail = result.catch(() => {}); return result; },
  notify() {}, listen() { return () => {}; },
};
