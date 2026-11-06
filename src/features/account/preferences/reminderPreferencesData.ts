import { ApiError } from '../../../shared/api/http';
import type { AccountPreferences } from '../account';

export type ReminderDraft = Pick<AccountPreferences, 'assignments' | 'classes' | 'exams' | 'reminderMinutes' | 'quiet' | 'quietStart' | 'quietEnd'>;
export type ReminderPreferences = ReminderDraft & { version: number };
const fields = ['assignments', 'classes', 'exams', 'reminderMinutes', 'quiet', 'quietStart', 'quietEnd'] as const;
const clock = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export const reminderDraft = (value: ReminderDraft): ReminderDraft => ({
  assignments: value.assignments, classes: value.classes, exams: value.exams,
  reminderMinutes: value.reminderMinutes, quiet: value.quiet, quietStart: value.quietStart, quietEnd: value.quietEnd,
});
export const sameReminderPreferences = (a: ReminderDraft, b: ReminderDraft) => fields.every(field => a[field] === b[field]);

export function reminderPreferencesInput(value: ReminderDraft, version: number): ReminderPreferences {
  const errors: Record<string, string> = {};
  for (const field of ['assignments', 'classes', 'exams', 'quiet'] as const) {
    if (typeof value[field] !== 'boolean') errors[field] = 'Chọn bật hoặc tắt tùy chọn này.';
  }
  if (![5, 15, 30, 60].includes(value.reminderMinutes)) errors.reminderMinutes = 'Chọn nhắc trước 5, 15, 30 hoặc 60 phút.';
  if (typeof value.quietStart !== 'string' || !clock.test(value.quietStart)) errors.quietStart = 'Chọn giờ bắt đầu hợp lệ.';
  if (typeof value.quietEnd !== 'string' || !clock.test(value.quietEnd)) errors.quietEnd = 'Chọn giờ kết thúc hợp lệ.';
  if (value.quiet && value.quietStart === value.quietEnd) errors.quietEnd = 'Giờ bắt đầu và kết thúc cần khác nhau.';
  if (!Number.isSafeInteger(version) || version < 0) errors.version = 'Đọc lại tùy chọn trước khi lưu.';
  if (Object.keys(errors).length) throw new ApiError('Kiểm tra các lựa chọn được báo lỗi.', 'INVALID_REMINDER_PREFERENCES', 400, errors);
  return { ...reminderDraft(value), version };
}

export function parseReminderPreferences(value: unknown): ReminderPreferences {
  try {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    const preferences = value as ReminderPreferences;
    return reminderPreferencesInput(preferences, preferences.version);
  } catch {
    throw new ApiError('Chưa đọc được cấu hình nhắc học hợp lệ. Hãy tải lại để kiểm tra.', 'INVALID_REMINDER_PREFERENCES_RESPONSE');
  }
}
