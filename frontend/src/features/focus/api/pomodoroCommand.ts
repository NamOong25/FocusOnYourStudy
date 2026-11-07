import {ApiError} from '../../../shared/api/http';
import {uuid,validateStart,type PomodoroAction,type PomodoroStart} from './pomodoroApi';

export type PomodoroCommand={kind:'start';input:PomodoroStart}|{kind:PomodoroAction;id:string;version:number};
export interface PomodoroCommandStore{read():Promise<string|null>;write(value:string|null):Promise<void>}
const tails=new Map<string,Promise<unknown>>();
export function serializeCommandStore(key:string,store:PomodoroCommandStore):PomodoroCommandStore{
  const run=<T>(operation:()=>Promise<T>):Promise<T>=>{const result=(tails.get(key)??Promise.resolve()).then(operation);const tail=result.catch(()=>{});tails.set(key,tail);void tail.finally(()=>{if(tails.get(key)===tail)tails.delete(key);});return result;};
  return{read:()=>run(()=>store.read()),write:value=>run(()=>store.write(value))};
}
export const recoveryError=()=>new ApiError('Chưa truy cập được thông tin đối chiếu trên thiết bị. Kiểm tra quyền lưu trữ rồi thử lại.','POMODORO_RECOVERY_UNAVAILABLE');
export function parseCommand(text:string|null):PomodoroCommand|null{
  if(text===null)return null;
  try{
    const v=JSON.parse(text);
    if(!v||typeof v!=='object'||Array.isArray(v))throw Error();
    if(v.kind==='start')return{kind:'start',input:validateStart(v.input)};
    if(!['pause','resume','complete','cancel'].includes(v.kind)||!uuid(v.id)||!Number.isSafeInteger(v.version)||v.version<0)throw Error();
    return{kind:v.kind,id:v.id,version:v.version};
  }catch{throw new ApiError('Thông tin yêu cầu chưa rõ kết quả không đọc được. Giữ nguyên dữ liệu và kiểm tra lại kho lưu trữ.','POMODORO_RECOVERY_INVALID');}
}
// A non-secret idempotency identity; authorization always uses the bearer token.
export function newPomodoroRequestId(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  const bytes=Array.from({length:16},()=>Math.floor(Math.random()*256));bytes[6]=(bytes[6]!&15)|64;bytes[8]=(bytes[8]!&63)|128;
  const s=bytes.map(v=>v.toString(16).padStart(2,'0')).join('');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
