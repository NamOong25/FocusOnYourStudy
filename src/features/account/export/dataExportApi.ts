import { ApiError, createHttpClient, type JsonFileResponse } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';

export const exportSections = ['semesters', 'courses', 'assignments', 'studySessions', 'classSchedules',
  'classExceptions', 'exams', 'gradeConfigurations', 'pomodoroSessions'] as const;
export type ExportSection = typeof exportSections[number];
export type ExportInfo = { filename: string; exportedAt: string; bytes: number; counts: Record<ExportSection, number> };
export type PreparedExport = ExportInfo & { text: string };
const MAX_BYTES = 20 * 1024 * 1024;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const invalid = () => new ApiError('Tệp dữ liệu nhận được chưa hợp lệ. Hãy chuẩn bị lại tệp.', 'INVALID_EXPORT_RESPONSE');

export function parseDataExport(response: JsonFileResponse, owner: string): PreparedExport {
  const value = response.value;
  if (response.contentType?.split(';')[0]?.trim().toLowerCase() !== 'application/json' || !object(value)
    || value.format !== 'focusyourstudy-personal-data' || value.formatVersion !== 1
    || typeof value.exportedAt !== 'string' || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,9})?Z$/.test(value.exportedAt)
    || !Number.isFinite(Date.parse(value.exportedAt))
    || !object(value.profile) || value.profile.id !== owner || typeof value.profile.email !== 'string'
    || !object(value.notificationPreferences) || !object(value.pomodoroGoal)
    || exportSections.some(section => !Array.isArray(value[section]))) throw invalid();
  const counts = Object.fromEntries(exportSections.map(section => [section, (value[section] as unknown[]).length])) as Record<ExportSection, number>;
  const byteCounter = new Blob([response.text]);
  const bytes = byteCounter.size;
  (byteCounter as Blob & { close?: () => void }).close?.();
  if (bytes > MAX_BYTES || Object.values(counts).reduce((sum, count) => sum + count, 0) > 10_000) {
    throw new ApiError('Tệp vượt giới hạn 10.000 bản ghi hoặc 20 MiB.', 'EXPORT_TOO_LARGE', 413);
  }
  const safeName = response.disposition?.match(/(?:^|;)\s*filename\s*=\s*"?(focusyourstudy-[0-9]{8}-[0-9]{6}\.json)"?\s*(?:;|$)/i)?.[1];
  const iso = new Date(value.exportedAt).toISOString();
  const fallback = 'focusyourstudy-' + iso.slice(0, 10).replace(/-/g, '') + '-' + iso.slice(11, 19).replace(/:/g, '') + '.json';
  const filename = safeName ?? fallback;
  return { filename, exportedAt: value.exportedAt, bytes, counts, text: response.text };
}

export function createDataExportApi(baseUrl: string, authorized: Authorized, owner: string, options?: Parameters<typeof createHttpClient>[1]) {
  const request = createHttpClient(baseUrl, { timeoutMs: 45_000, ...options });
  return {
    async prepare(signal: AbortSignal) {
      const response = await authorized(token => request<JsonFileResponse>('/api/v1/users/me/export', {
        signal, credentials: 'omit', headers: { Authorization: 'Bearer ' + token }, expectedStatus: 200, jsonFile: true,
      }), signal);
      return parseDataExport(response, owner);
    },
  };
}
