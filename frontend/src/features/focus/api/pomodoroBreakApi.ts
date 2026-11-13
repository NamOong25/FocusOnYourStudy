import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';
import { focusDurations } from '../focus';

export type BreakKind = 'SHORT' | 'LONG';
export type BreakAction = 'START' | 'PAUSE' | 'RESUME' | 'RESET';
export type BreakSnapshot = { kind: BreakKind; state: 'IDLE' | 'RUNNING' | 'PAUSED' | 'ELAPSED'; remainingMs: number; version: number };
export const breakMode = (kind: BreakKind) => kind === 'SHORT' ? 1 : 2;
export const breakActive = (snapshot?: BreakSnapshot | null) => snapshot?.state === 'RUNNING' || snapshot?.state === 'PAUSED';

export function breakRemaining(snapshot: BreakSnapshot, receivedAt: number, now: number) {
  const elapsed = snapshot.state === 'RUNNING' ? Math.max(0, now - receivedAt) : 0;
  return Math.max(0, snapshot.remainingMs - elapsed);
}

export function parseBreak(value: unknown): BreakSnapshot {
  const row = value as Partial<BreakSnapshot> | null;
  const invalid = () => new ApiError('Phản hồi giờ nghỉ chưa hợp lệ. Tải lại rồi thử tiếp.', 'INVALID_RESPONSE');
  if (!row || (row.kind !== 'SHORT' && row.kind !== 'LONG') || !row.state || !['IDLE', 'RUNNING', 'PAUSED', 'ELAPSED'].includes(row.state)
    || !Number.isSafeInteger(row.version) || row.version! < 0 || !Number.isInteger(row.remainingMs)) throw invalid();
  const max = focusDurations[breakMode(row.kind)] * 1000;
  const remaining = row.remainingMs!;
  if (remaining < 0 || remaining > max || (remaining === 0) !== (row.state === 'ELAPSED')
    || row.state === 'IDLE' && remaining !== max || row.version === 0 && (row.kind !== 'SHORT' || row.state !== 'IDLE')) throw invalid();
  return { kind: row.kind, state: row.state, remainingMs: remaining, version: row.version! };
}

export function createPomodoroBreakApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const request = createHttpClient(baseUrl, options);
  const path = '/api/v1/pomodoro-break';
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  return {
    async read(signal: AbortSignal) {
      return parseBreak(await authorized(token => request(path, { headers: headers(token), signal }), signal));
    },
    async change(action: BreakAction, version: number, signal: AbortSignal, kind?: BreakKind) {
      const value = parseBreak(await authorized(token => request(path, {
        method: 'PUT', headers: headers(token), body: { action, version, ...(kind ? { kind } : {}) }, signal,
      }), signal));
      const expected = { START: 'RUNNING', PAUSE: 'PAUSED', RESUME: 'RUNNING', RESET: 'IDLE' } as const;
      if (value.version !== version + 1 || value.state !== expected[action] || kind && value.kind !== kind)
        throw new ApiError('Chưa xác nhận được thay đổi giờ nghỉ. Tải lại rồi thử tiếp.', 'INVALID_RESPONSE');
      return value;
    },
  };
}
