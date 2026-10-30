import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../account/auth/AuthProvider';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { createNotificationReadApi } from './notificationReadApi';
import { descriptorKey, type ReminderDescriptor } from './notificationDescriptors';
import { emptyNotificationReads, NotificationReadManager } from './NotificationReadManager';
import { notifyNotificationRead, startNotificationSync } from './notificationSyncPlatform';

export function useNotificationReads(frame: ReminderDescriptor[] | null,refreshNonce: number) {
  const auth=useAuth(),owner=auth.hasSession && auth.profile ? `${auth.revision}:${auth.profile.id}` : null;
  const api=useMemo(()=>createNotificationReadApi(API_BASE_URL,auth.authorized),[auth.authorized]);
  const ref=useRef<{owner:string;manager:NotificationReadManager}|null>(null);
  const [snapshot,setSnapshot]=useState<{owner:string|null;state:ReturnType<typeof emptyNotificationReads>}>({owner:null,state:emptyNotificationReads()});
  const key=frame===null ? null : descriptorKey(frame),lastRefresh=useRef(refreshNonce);
  useEffect(()=>{
    if(!owner || !auth.profile)return;
    const manager=new NotificationReadManager(api,()=>notifyNotificationRead(auth.profile!.id));ref.current={owner,manager};
    const update=()=>setSnapshot({owner,state:manager.state});const stop=manager.subscribe(update),stopSync=startNotificationSync(manager,auth.profile.id);update();
    return()=>{stopSync();stop();manager.dispose();if(ref.current?.manager===manager)ref.current=null;};
  },[owner,api]);
  useEffect(()=>{
    const current=ref.current;if(!current || current.owner!==owner)return;
    current.manager.setFrame(frame);
    if(frame!==null){const manual=lastRefresh.current!==refreshNonce;lastRefresh.current=refreshNonce;void current.manager.reload(manual).catch(()=>{});}
  },[key,owner,api,refreshNonce]);
  const valid=snapshot.owner===owner && snapshot.state.key===key;
  return {state:valid ? snapshot.state : emptyNotificationReads(),
    mark:(seen:{id:string;localRevision:string}[])=>ref.current?.owner===owner ? ref.current.manager.mark(seen) : Promise.reject(cancelledRequest()),
  };
}
