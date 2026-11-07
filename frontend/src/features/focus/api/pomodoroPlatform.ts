import * as SecureStore from 'expo-secure-store';
import {API_BASE_URL} from '../../../shared/api/config';
import {recoveryError,serializeCommandStore,type PomodoroCommandStore} from './pomodoroCommand';
const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
export function pomodoroCommandStore(owner:string):PomodoroCommandStore{
  const key='focus-pomodoro-command-v1-'+API_BASE_URL.replace(/[^a-zA-Z0-9.-]/g,'_')+'-'+owner;
  return serializeCommandStore(key,{async read(){try{return await SecureStore.getItemAsync(key,options);}catch{throw recoveryError();}},
    async write(value){try{if(value===null)await SecureStore.deleteItemAsync(key,options);else await SecureStore.setItemAsync(key,value,options);}catch{throw recoveryError();}}});
}
export function notifyPomodoro(){}
export function listenPomodoro(_check:()=>void){return()=>{};}
