import {API_BASE_URL} from '../../../shared/api/config';
import {recoveryError,type PomodoroCommandStore} from './pomodoroCommand';
const signalKey='focus-study-pomodoro-sync-v1';
export function pomodoroCommandStore(owner:string):PomodoroCommandStore{
  const key='focus-study-pomodoro-command-v1-'+API_BASE_URL+'-'+owner;
  return{async read(){try{return window.sessionStorage.getItem(key);}catch{throw recoveryError();}},
    async write(value){try{if(value===null)window.sessionStorage.removeItem(key);else window.sessionStorage.setItem(key,value);}catch{throw recoveryError();}}};
}
export function notifyPomodoro(){try{window.localStorage.setItem(signalKey,Date.now()+':'+Math.random());}catch{/* Polling remains available. */}}
export function listenPomodoro(check:()=>void){const listener=(e:StorageEvent)=>{if(e.key===signalKey)check();};window.addEventListener('storage',listener);return()=>window.removeEventListener('storage',listener);}
