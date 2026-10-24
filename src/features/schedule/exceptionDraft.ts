import { exceptionInput, type ExceptionInput, type ExceptionSnapshot } from './api/classExceptionsApi';
export type ExceptionMode = 'change' | 'cancel' | 'restore' | 'review';
export const exceptionFields = ['startTime', 'endTime', 'room', 'teacher'] as const;
export type ExceptionField = typeof exceptionFields[number];
export function exceptionDraft(snapshot: ExceptionSnapshot) {
  const e = snapshot.exception, row = snapshot.occurrence;
  return { reason: e?.reason ?? '', startTime: { override: e?.startTime != null, value: e?.startTime ?? row.startTime },
    endTime: { override: e?.endTime != null, value: e?.endTime ?? row.endTime }, room: { override: e?.room != null, value: e?.room ?? row.room },
    teacher: { override: e?.teacher != null, value: e?.teacher ?? row.teacher } };
}
export type ExceptionDraft = ReturnType<typeof exceptionDraft>;
export function draftException(draft: ExceptionDraft, mode: ExceptionMode, basis: ExceptionSnapshot): ExceptionInput {
  const value = (key: ExceptionField) => mode === 'change' && draft[key].override ? draft[key].value : null;
  return exceptionInput({ kind: mode === 'cancel' ? 'CANCELLED' : 'CHANGED', startTime: value('startTime'), endTime: value('endTime'), room: value('room'), teacher: value('teacher'), reason: draft.reason }, basis.rule);
}
