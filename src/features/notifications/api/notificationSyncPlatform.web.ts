import { API_BASE_URL } from '../../../shared/api/config';
import { createSourceSync, type SyncSource } from '../../../shared/sync/SourceSync';
export const notificationSignalKey = (owner: string) => 'focus-study-notification-read-v1:' + JSON.stringify([API_BASE_URL,owner]);
export function notifyNotificationRead(owner: string) {
  try {window.localStorage.setItem(notificationSignalKey(owner),Date.now()+':'+Math.random());}catch { /* Foreground/polling still query the server. */ }
}
export function startNotificationSync(source: SyncSource,owner: string) {
  const sync=createSourceSync(source,()=>document.visibilityState==='visible'),check=()=>sync.request();
  const storage=(e: StorageEvent)=>{if(e.key===notificationSignalKey(owner))check();};
  window.addEventListener('storage',storage);window.addEventListener('focus',check);window.addEventListener('online',check);document.addEventListener('visibilitychange',check);
  const timer=setInterval(check,30000);
  return()=>{clearInterval(timer);window.removeEventListener('storage',storage);window.removeEventListener('focus',check);window.removeEventListener('online',check);document.removeEventListener('visibilitychange',check);sync.dispose();};
}
