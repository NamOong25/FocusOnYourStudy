import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';
import { parseReminderPreferences, reminderPreferencesInput, sameReminderPreferences, type ReminderPreferences } from './reminderPreferencesData';

export function createReminderPreferencesApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const request = createHttpClient(baseUrl, options);
  const path = '/api/v1/notification-preferences';
  return {
    async read(signal: AbortSignal) {
      const value = await authorized(token => request<unknown>(path, {
        signal, credentials: 'omit', headers: { Authorization: 'Bearer ' + token }, expectedStatus: 200,
      }), signal);
      return parseReminderPreferences(value);
    },
    async save(input: ReminderPreferences, signal: AbortSignal) {
      const body = reminderPreferencesInput(input, input.version);
      const value = await authorized(token => request<unknown>(path, {
        method: 'PUT', body, signal, credentials: 'omit', headers: { Authorization: 'Bearer ' + token }, expectedStatus: 200,
      }), signal);
      const result = parseReminderPreferences(value);
      if (result.version !== body.version + 1 || !sameReminderPreferences(result, body)) {
        throw new ApiError('Chưa xác nhận được tùy chọn đã lưu. Đọc lại để đối chiếu.', 'INVALID_REMINDER_PREFERENCES_RESPONSE');
      }
      return result;
    },
  };
}
