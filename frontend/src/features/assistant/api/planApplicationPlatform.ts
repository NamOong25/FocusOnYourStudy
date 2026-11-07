import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../../../shared/api/config';
import { chunkedPlanStore } from './planApplicationStore';
const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
export function planApplicationStore(owner:string){
  const endpoint=Array.from(String(API_BASE_URL)).map(c=>c.codePointAt(0)!.toString(16)).join('_'),key='focus-plan-apply-v1-'+endpoint+'-'+owner;
  return chunkedPlanStore(key,{get:k=>SecureStore.getItemAsync(k,options),set:(k,v)=>SecureStore.setItemAsync(k,v,options),remove:k=>SecureStore.deleteItemAsync(k,options)});
}
