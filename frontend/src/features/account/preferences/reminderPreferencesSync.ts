import { AppState } from 'react-native';

export function notifyReminderPreferences(_owner: string) { }
export function startReminderPreferencesSync(reload: () => Promise<unknown>, _owner: string) {
  const check = () => { if (AppState.currentState === 'active') void reload().catch(() => { }); };
  const listener = AppState.addEventListener('change', check);
  const timer = setInterval(check, 30_000);
  return () => { clearInterval(timer); listener.remove(); };
}
