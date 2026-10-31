import { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE_URL } from '../../../shared/api/config';
import { useAuth } from '../../account/auth/AuthProvider';
import { createPlanApplicationsApi } from './planApplicationsApi';
import { planApplicationStore } from './planApplicationPlatform';
import { emptyPlanApplication, PlanApplicationManager } from './PlanApplicationManager';
export function usePlanApplication(){
  const auth=useAuth(),id=auth.hasSession?auth.profile?.id:null,owner=id?`${auth.revision}:${id}`:null;
  const api=useMemo(()=>createPlanApplicationsApi(API_BASE_URL,auth.authorized),[auth.authorized]);
  const [snapshot,setSnapshot]=useState({owner:null as string|null,manager:null as PlanApplicationManager|null,state:emptyPlanApplication()});
  const current=useRef<PlanApplicationManager|null>(null);
  useEffect(()=>{if(!owner||!id)return;const manager=new PlanApplicationManager(api,planApplicationStore(id));current.current=manager;const update=()=>setSnapshot({owner,manager,state:manager.state});const stop=manager.subscribe(update);update();void manager.restore().catch(()=>{});return()=>{stop();manager.dispose();if(current.current===manager)current.current=null;};},[owner,id,api]);
  return owner&&snapshot.owner===owner?snapshot:{owner,manager:null,state:emptyPlanApplication()};
}
