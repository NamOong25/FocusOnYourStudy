import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const channel = 'focus-timer';
const identifier = 'focus-study-timer-expired';
const android = Platform.OS === 'android';
let revision = 0;
let pending = Promise.resolve();
let fallback: ReturnType<typeof setTimeout> | undefined;
let permissionRequested = false;

Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const focus = notification.request.content.data?.focusTimer === true;
    return { shouldShowBanner: focus, shouldShowList: focus, shouldPlaySound: focus, shouldSetBadge: false };
  },
});

function enqueue(work: () => Promise<void>) {
  pending = pending.then(work).catch(() => {});
}

async function canNotify() {
  if (android) await Notifications.setNotificationChannelAsync(channel, {
    name: 'Hết giờ tập trung', importance: Notifications.AndroidImportance.HIGH,
    sound: 'default', enableVibrate: true, vibrationPattern: [0, 220, 120, 220],
  });
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return true;
  if (!settings.canAskAgain || permissionRequested || AppState.currentState !== 'active') return false;
  permissionRequested = true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

export function cancelFocusAlarm() {
  revision++;
  if (fallback !== undefined) clearTimeout(fallback);
  enqueue(() => Notifications.cancelScheduledNotificationAsync(identifier));
}

export function scheduleFocusAlarm(milliseconds: number, title: string) {
  const request = ++revision;
  const deadline = Date.now() + milliseconds;
  if (fallback !== undefined) clearTimeout(fallback);
  enqueue(async () => {
    if (request !== revision) return;
    await Notifications.cancelScheduledNotificationAsync(identifier);
    if (request !== revision || !await canNotify() || request !== revision) return;
    await Notifications.dismissNotificationAsync(identifier);
    if (request !== revision) return;
    const content = { title, sound: 'default', data: { focusTimer: true } } as const;
    const immediate = () => Notifications.scheduleNotificationAsync({
      identifier, content, trigger: android ? { channelId: channel } : null,
    });
    if (Date.now() >= deadline) {
      if (AppState.currentState === 'active') await immediate();
      return;
    }
    await Notifications.scheduleNotificationAsync({
      identifier, content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: deadline, ...(android ? { channelId: channel } : {}) },
    });
    if (!android || request !== revision) return;
    // Android can defer scheduled alarms without exact-alarm permission. If the app
    // is still open and the alarm remains pending, deliver it from the foreground.
    fallback = setTimeout(() => enqueue(async () => {
      if (request !== revision || AppState.currentState !== 'active') return;
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      if (request !== revision || !scheduled.some(item => item.identifier === identifier)) return;
      await Notifications.cancelScheduledNotificationAsync(identifier);
      const alreadyShown = (await Notifications.getPresentedNotificationsAsync()).some(item => item.request.identifier === identifier);
      if (!alreadyShown && request === revision) await immediate();
    }), Math.max(0, deadline - Date.now()) + 600);
  });
}
