import { API_BASE_URL } from '../api/config';
import { academicSignalKey, createSourceSync, type SyncSource } from './SourceSync';

export function notifyAcademicChange(owner: string) {
  try { window.localStorage.setItem(academicSignalKey(API_BASE_URL, owner), Date.now() + ':' + Math.random()); }
  catch { /* Foreground reads and polling remain available if storage is disabled. */ }
}
export function startAcademicSync(source: SyncSource, owner: string) {
  const sync = createSourceSync(source, () => document.visibilityState === 'visible');
  const check = () => sync.request();
  const storage = (event: StorageEvent) => { if (event.key === academicSignalKey(API_BASE_URL, owner)) check(); };
  window.addEventListener('storage', storage); window.addEventListener('focus', check); window.addEventListener('online', check);
  document.addEventListener('visibilitychange', check);
  const timer = setInterval(check, 30000);
  return () => { clearInterval(timer); window.removeEventListener('storage', storage); window.removeEventListener('focus', check); window.removeEventListener('online', check); document.removeEventListener('visibilitychange', check); sync.dispose(); };
}
