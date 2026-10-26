import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '../../account/auth/AuthProvider';
import { API_BASE_URL } from '../../../shared/api/config';
import { asApiError, cancelledRequest } from '../../../shared/api/http';
import { GradeReadManager, emptyGradeRead, visibleGradeRead, type GradeReadState } from './GradeReadManager';
import { createGradesReadApi, semesterGradesKey, courseGradeKey, type SemesterGradeQuery, type CourseRef } from './gradesReadApi';
import {useGradeConfigurationWrites} from './GradeConfigurationWritesProvider';

function useGradeRead<Q,T>(query:Q|null,active:boolean,read:(query:Q,signal:AbortSignal)=>Promise<T>,keyOf:(q:Q)=>string) {
  const auth=useAuth(),owner=auth.hasSession?`${auth.revision}:${auth.profile?.id??''}`:null;
  const {state:writes}=useGradeConfigurationWrites();
  let key:string|null=null,queryError=null;
  try { if(query!==null) key=keyOf(query); } catch(e) {queryError=asApiError(e);}
  const ref=useRef<{owner:string;manager:GradeReadManager<Q,T>}|null>(null);
  const [snapshot,setSnapshot]=useState<{owner:string|null;state:GradeReadState<T>}>({owner:null,state:emptyGradeRead<T>()});
  useEffect(()=>{
    if(!owner)return;
    const manager=new GradeReadManager(read,keyOf);ref.current={owner,manager};
    const update=()=>setSnapshot({owner,state:manager.state});update();const unsubscribe=manager.subscribe(update);
    return()=>{unsubscribe();manager.dispose();if(ref.current?.manager===manager)ref.current=null;};
  },[owner,read,keyOf]);
  const reload=useCallback(()=>query!==null&&key&&ref.current?.owner===owner?ref.current.manager.load(query):Promise.reject(cancelledRequest()),[owner,key,read]);
  useEffect(()=>{
    if(!active||!key||!owner)return;
    void reload().catch(()=>{});
    const check=()=>{if(Platform.OS!=='web'||document.visibilityState==='visible')void reload().catch(()=>{});};
    const listener=AppState.addEventListener('change',state=>{if(state==='active')check();});
    if(Platform.OS==='web'){document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);}
    const manager=ref.current?.manager;
    return()=>{listener.remove();if(Platform.OS==='web'){document.removeEventListener('visibilitychange',check);window.removeEventListener('focus',check);}manager?.cancel();};
  },[active,key,owner,reload,writes.revision]);
  return {...visibleGradeRead(snapshot,owner,key),...(queryError?{error:queryError}:{}),reload};
}
export function useServerSemesterGrades(query:SemesterGradeQuery|null,active:boolean){
  const auth=useAuth(),api=useMemo(()=>createGradesReadApi(API_BASE_URL,auth.authorized),[auth.authorized]);
  return useGradeRead(query,active,api.semester,semesterGradesKey);
}
export function useServerCourseGrades(course:CourseRef|null,active:boolean){
  const auth=useAuth(),api=useMemo(()=>createGradesReadApi(API_BASE_URL,auth.authorized),[auth.authorized]);
  return useGradeRead(course,active,api.detail,courseGradeKey);
}
