import { AppState } from 'react-native';
import { createSourceSync, type SyncSource } from '../../../shared/sync/SourceSync';
export function notifyNotificationRead(_owner: string) { }
export function startNotificationSync(source: SyncSource,_owner: string) {
  const sync=createSourceSync(source,()=>AppState.currentState==='active');
  const listener=AppState.addEventListener('change',s=>{if(s==='active')sync.request();});
  const timer=setInterval(()=>sync.request(),30000);
  return()=>{clearInterval(timer);listener.remove();sync.dispose();};
}
