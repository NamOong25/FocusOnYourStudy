import React,{createContext,useContext,useEffect,useState,type ReactNode} from 'react';
import {useAuth} from '../../account/auth/AuthProvider';
import {API_BASE_URL} from '../../../shared/api/config';
import {createGradeConfigurationsApi} from './gradeConfigurationsApi';
import {GradeConfigurationWriteManager,emptyConfigurationWrite} from './GradeConfigurationWriteManager';

type Snapshot={owner:string|null;manager:GradeConfigurationWriteManager|null;state:ReturnType<typeof emptyConfigurationWrite>};
const Context=createContext<Snapshot|null>(null);
export function GradeConfigurationWritesProvider({children}:{children:ReactNode}){
  const auth=useAuth(),owner=auth.hasSession?`${auth.revision}:${auth.profile?.id??''}`:null;
  const [snapshot,setSnapshot]=useState<Snapshot>({owner:null,manager:null,state:emptyConfigurationWrite()});
  useEffect(()=>{
    if(!owner)return;
    const manager=new GradeConfigurationWriteManager(createGradeConfigurationsApi(API_BASE_URL,auth.authorized));
    const update=()=>setSnapshot({owner,manager,state:manager.state});update();const unsubscribe=manager.subscribe(update);
    return()=>{unsubscribe();manager.dispose();};
  },[owner,auth.authorized]);
  const value=owner&&snapshot.owner===owner?snapshot:{owner,manager:null,state:emptyConfigurationWrite()};
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useGradeConfigurationWrites(){const value=useContext(Context);if(!value)throw new Error('Missing GradeConfigurationWritesProvider');return value;}
