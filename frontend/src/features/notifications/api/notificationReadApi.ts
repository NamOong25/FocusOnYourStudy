import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';
import { isValidDate } from '../../../shared/utils/dates';
import { instantMicros } from '../../../shared/utils/instantMicros';

export type ReadTarget = { kind: 'ASSIGNMENT' | 'EXAM' | 'CLASS'; sourceId: string; occurrenceDate: string | null };
export type ReadBasis = { sourceVersion: number; courseVersion: number; semesterVersion: number; milestoneMinutes?: number };
export type ReadState = { target: ReadTarget; available: boolean; revision: string | null; basis: ReadBasis | null; read: boolean; readAt: string | null };
export type ReadSnapshot = { asOf: string; items: ReadState[] };
export type ReadInput = { target: ReadTarget; revision: string };
const uuid = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const version = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0;
const instant = (v: unknown): v is string => typeof v === 'string' && v.endsWith('Z') && instantMicros(v) !== null;
const invalid = () => new ApiError('Chưa xác nhận được trạng thái đã đọc. Tải lại nhắc việc để đối chiếu.', 'INVALID_NOTIFICATION_RESPONSE');
export function targetKey(t: ReadTarget) { return JSON.stringify([t.kind,t.sourceId.toLowerCase(),t.occurrenceDate]); }
export function validTarget(v: unknown): v is ReadTarget {
  return object(v) && ['ASSIGNMENT','EXAM','CLASS'].includes(String(v.kind)) && typeof v.sourceId === 'string' && uuid.test(v.sourceId)
    && (v.kind === 'CLASS' ? typeof v.occurrenceDate === 'string' && isValidDate(v.occurrenceDate) && v.occurrenceDate >= '1900-01-01' && v.occurrenceDate <= '2099-12-31' : v.occurrenceDate === null);
}
export function validBasis(v: unknown): v is ReadBasis {
  return object(v) && version(v.sourceVersion) && version(v.courseVersion) && version(v.semesterVersion)
    && (v.milestoneMinutes === undefined || Number.isInteger(v.milestoneMinutes) && Number(v.milestoneMinutes) >= 0 && Number(v.milestoneMinutes) <= 10080);
}
export function sameBasis(a: ReadBasis | null, b: ReadBasis) {
  return !!a && a.sourceVersion === b.sourceVersion && a.courseVersion === b.courseVersion && a.semesterVersion === b.semesterVersion && a.milestoneMinutes === b.milestoneMinutes;
}
export function parseReadSnapshot(value: unknown, expected: ReadTarget[], writing = false): ReadSnapshot {
  if (!object(value) || !instant(value.asOf) || !Array.isArray(value.items) || value.items.length !== expected.length) throw invalid();
  const items = value.items.map((v: unknown,index: number): ReadState => {
    if (!object(v) || !validTarget(v.target) || targetKey(v.target) !== targetKey(expected[index]!) || typeof v.available !== 'boolean' || typeof v.read !== 'boolean') throw invalid();
    if (!v.available) {
      if (writing || v.revision !== null || v.basis !== null || v.read || v.readAt !== null) throw invalid();
    } else {
      if (typeof v.revision !== 'string' || !/^[a-f\d]{64}$/.test(v.revision) || !validBasis(v.basis)
        || v.target.kind !== 'EXAM' && v.basis.milestoneMinutes !== undefined) throw invalid();
      if (v.read ? !instant(v.readAt) : v.readAt !== null) throw invalid();
    }
    if (writing && !v.read) throw invalid();
    return v as unknown as ReadState;
  });
  return { asOf: value.asOf, items };
}
function validateTargets(targets: ReadTarget[], writing = false) {
  if (targets.length > 200 || writing && !targets.length || targets.some(t => !validTarget(t)) || new Set(targets.map(targetKey)).size !== targets.length) throw invalid();
}
export function createNotificationReadApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options), root = '/api/v1/notification-read-states';
  return {
    async query(targets: ReadTarget[], signal?: AbortSignal) {
      validateTargets(targets);
      const result = await authorized(token => http<unknown>(root + '/query', { method:'POST', headers:{ Authorization:`Bearer ${token}` }, body:{ targets }, signal }),signal);
      return parseReadSnapshot(result,targets);
    },
    async mark(items: ReadInput[], signal?: AbortSignal) {
      validateTargets(items.map(x => x.target),true);
      if (items.some(x => !/^[a-f\d]{64}$/.test(x.revision))) throw invalid();
      const result = await authorized(token => http<unknown>(root, { method:'PUT', headers:{ Authorization:`Bearer ${token}` }, body:{ items }, signal }),signal);
      const parsed = parseReadSnapshot(result,items.map(x => x.target),true);
      if (parsed.items.some((s,i) => s.revision !== items[i]!.revision)) throw invalid();
      return parsed;
    },
  };
}
export type NotificationReadApi = ReturnType<typeof createNotificationReadApi>;
