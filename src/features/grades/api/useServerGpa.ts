import {useMemo} from 'react';
import {useApp} from '../../../store/model';
import {useAuth} from '../../account/auth/AuthProvider';
import {API_BASE_URL} from '../../../shared/api/config';
import {useGradeRead} from './useServerGrades';
import {createCumulativeGpaApi,cumulativeKey,type CumulativeQuery} from './cumulativeGpaApi';

export function useGpaCatalog(){
  const {semesters,courseCatalog,courseConnection,semesterConnection}=useApp();
  const ready=(!courseConnection||courseConnection.loaded)&&(!semesterConnection||semesterConnection.loaded);
  const query:CumulativeQuery|null=ready?{semesters:semesters.map(s=>({id:s.id,version:s.version??-1})),courses:courseCatalog}:null;
  const reloadCatalog=()=>Promise.allSettled([courseConnection?.reload(),semesterConnection?.reload()]);
  return{semesters,courseCatalog,ready,query,error:semesterConnection?.error??courseConnection?.error??null,reloadCatalog};
}
export function useCumulativeGpa(active:boolean){
  const catalog=useGpaCatalog(),auth=useAuth(),api=useMemo(()=>createCumulativeGpaApi(API_BASE_URL,auth.authorized),[auth.authorized]);
  const read=useGradeRead(catalog.query,active,api.read,cumulativeKey);
  return{...read,error:catalog.error??read.error,reload:()=>Promise.allSettled([read.reload(),catalog.reloadCatalog()])};
}
