import type { ApiError } from '../../../shared/api/http';
import type { AccountProfile } from '../api/types';

export type SessionRecord = { kind: 'active' | 'inflight' | 'logout-pending' | 'signed-out'; userId?: string; refreshToken?: string };
export type SessionStore = { read: () => Promise<SessionRecord | null>; write: (record: SessionRecord) => Promise<void> };
export type SessionCoordinator = { run: <T>(operation: () => Promise<T>) => Promise<T>;
  notify: () => void; listen: (callback: () => void) => () => void };
export type SessionState = { phase: 'restoring' | 'ready' | 'unavailable' | 'signing-out'; hasSession: boolean;
  profile: AccountProfile | null; profileError: ApiError | null; email: string; notice: string; logoutPending: boolean; canRestore: boolean; revision: number };
