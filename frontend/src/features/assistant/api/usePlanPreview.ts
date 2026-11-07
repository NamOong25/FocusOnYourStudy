import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../account/auth/AuthProvider';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { createStudyPlansApi, type PlanInput } from './studyPlansApi';
import { emptyPlanPreview, PlanPreviewManager } from './PlanPreviewManager';

export function usePlanPreview(){
  const auth=useAuth(),owner=auth.hasSession&&auth.profile?`${auth.revision}:${auth.profile.id}`:null;
  const api=useMemo(()=>createStudyPlansApi(API_BASE_URL,auth.authorized),[auth.authorized]);
  const ref=useRef<{owner:string;manager:PlanPreviewManager}|null>(null),[snapshot,setSnapshot]=useState({owner:null as string|null,state:emptyPlanPreview()});
  useEffect(()=>{if(!owner)return;const manager=new PlanPreviewManager(api);ref.current={owner,manager};
    const update=()=>setSnapshot({owner,state:manager.state});const stop=manager.subscribe(update);update();
    return()=>{stop();manager.dispose();if(ref.current?.manager===manager)ref.current=null;};
  },[owner,api]);
  const generate=useCallback((input:PlanInput)=>ref.current?.owner===owner?ref.current.manager.generate(input):Promise.reject(cancelledRequest()),[owner,api]);
  const clear=useCallback(()=>{if(ref.current?.owner===owner)ref.current.manager.clear();},[owner,api]);
  return{state:snapshot.owner===owner?snapshot.state:emptyPlanPreview(),generate,clear};
}
