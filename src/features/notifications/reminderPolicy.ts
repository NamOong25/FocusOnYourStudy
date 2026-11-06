import type { ReminderDraft } from '../account/preferences/reminderPreferencesData';
import type { InAppReminder } from './notifications';

export function filterReminderTypes<T extends InAppReminder>(items: T[], preferences: ReminderDraft | null): T[] {
  if (!preferences) return [];
  return items.filter(item => item.kind === 'task' ? preferences.assignments
    : item.kind === 'class' || item.kind === 'saved-class' ? preferences.classes : preferences.exams);
}

export function inQuietHours(preferences: ReminderDraft | null, now: Date, timeZone: string): boolean {
  if (!preferences?.quiet) return false;
  const parts = new Intl.DateTimeFormat('en', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const clock = parts.find(part => part.type === 'hour')!.value + ':' + parts.find(part => part.type === 'minute')!.value;
  const start = preferences.quietStart, end = preferences.quietEnd;
  return start < end ? clock >= start && clock < end : clock >= start || clock < end;
}
