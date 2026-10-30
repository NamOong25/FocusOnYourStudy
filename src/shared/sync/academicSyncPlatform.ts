import { AppState } from 'react-native';
import { createSourceSync, type SyncSource } from './SourceSync';

export function notifyAcademicChange(_owner: string) { }
export function startAcademicSync(source: SyncSource, _owner: string) {
  const sync = createSourceSync(source, () => AppState.currentState === 'active');
  const subscription = AppState.addEventListener('change', state => { if (state === 'active') sync.request(); });
  const timer = setInterval(() => sync.request(), 30000);
  return () => { clearInterval(timer); subscription.remove(); sync.dispose(); };
}
