import { API_BASE_URL } from '../../../shared/api/config';

export const reminderPreferencesSignalKey = (owner: string) => 'focus-study-reminder-preferences-v1:' + JSON.stringify([API_BASE_URL, owner]);
export function notifyReminderPreferences(owner: string) {
  try { window.localStorage.setItem(reminderPreferencesSignalKey(owner), Date.now() + ':' + Math.random()); }
  catch { /* Foreground and periodic reads still synchronize the preferences. */ }
}
export function startReminderPreferencesSync(reload: () => Promise<unknown>, owner: string) {
  const check = () => { if (document.visibilityState === 'visible') void reload().catch(() => { }); };
  const storage = (event: StorageEvent) => { if (event.key === reminderPreferencesSignalKey(owner)) check(); };
  window.addEventListener('storage', storage);
  window.addEventListener('focus', check);
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', check);
  const timer = setInterval(check, 30_000);
  return () => {
    clearInterval(timer);
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', check);
    window.removeEventListener('online', check);
    document.removeEventListener('visibilitychange', check);
  };
}
