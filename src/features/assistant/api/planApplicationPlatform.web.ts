import { API_BASE_URL } from '../../../shared/api/config';
import { serializePlanStore, type PlanApplicationStore } from './planApplicationStore';
import { planRecoveryError } from './planApplicationsApi';
export function planApplicationStore(owner:string):PlanApplicationStore{
  const key='focus-study-plan-apply-v1:'+API_BASE_URL+':'+owner;
  return serializePlanStore(key,{async read(){try{return window.sessionStorage.getItem(key);}catch{throw planRecoveryError();}},async write(value){try{if(value===null)window.sessionStorage.removeItem(key);else window.sessionStorage.setItem(key,value);}catch{throw planRecoveryError();}}});
}
