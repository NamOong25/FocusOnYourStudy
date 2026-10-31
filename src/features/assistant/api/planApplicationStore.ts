import { parsePlanCommand, parsePlanReceipt, planRecoveryError, newPlanRequestId, type PlanCommand, type PlanReceipt } from './planApplicationsApi';
export interface PlanApplicationStore{read():Promise<string|null>;write(value:string|null):Promise<void>}
export type PlanRecovery={v:1;command:PlanCommand;receipt:PlanReceipt|null;rejected:boolean};
export function parsePlanRecovery(text:string|null):PlanRecovery|null{
  if(text===null)return null;
  try{if(text.length>250000)throw Error();const v=JSON.parse(text);if(v?.v!==1||typeof v.rejected!=='boolean'||v.receipt!==null&&v.rejected)throw Error();const command=parsePlanCommand(v.command);return{v:1,command,receipt:v.receipt===null?null:parsePlanReceipt(v.receipt,command),rejected:v.rejected};}
  catch{throw new Error('PLAN_RECOVERY_INVALID');}
}
const tails=new Map<string,Promise<unknown>>();
export function serializePlanStore(key:string,store:PlanApplicationStore):PlanApplicationStore{
  const run=<T>(fn:()=>Promise<T>)=>{const result=(tails.get(key)??Promise.resolve()).then(fn);const tail=result.catch(()=>{});tails.set(key,tail);void tail.finally(()=>{if(tails.get(key)===tail)tails.delete(key);});return result;};
  return{read:()=>run(()=>store.read()),write:value=>run(()=>store.write(value))};
}
/** Write a generation's small chunks before atomically publishing its manifest. */
export function chunkedPlanStore(key:string,raw:{get(key:string):Promise<string|null>;set(key:string,value:string):Promise<void>;remove(key:string):Promise<void>}):PlanApplicationStore{
  const head=key+'.head';
  const manifest=(text:string|null)=>{if(text===null)return null;const v=JSON.parse(text);if(!/^[a-f0-9-]{36}$/i.test(v.id)||!Number.isInteger(v.count)||v.count<1||v.count>625)throw Error();return v as {id:string;count:number};};
  const clean=async(v:{id:string;count:number}|null)=>{if(v)for(let i=0;i<v.count;i++)try{await raw.remove(key+'.'+v.id+'.'+i);}catch{/* Old orphan chunks do not replace the active manifest. */}};
  return serializePlanStore(key,{async read(){try{const v=manifest(await raw.get(head));if(!v)return null;let text='';for(let i=0;i<v.count;i++){const part=await raw.get(key+'.'+v.id+'.'+i);if(part===null)throw Error();text+=part;}return text;}catch{throw planRecoveryError();}},
    async write(text){let fresh:{id:string;count:number}|null=null;try{const previous=manifest(await raw.get(head));if(text===null){await raw.remove(head);await clean(previous);return;}
      if(text.length>250000)throw Error();const points=Array.from(text);fresh={id:newPlanRequestId(),count:Math.ceil(points.length/400)};if(!fresh.count||fresh.count>625)throw Error();
      for(let i=0;i<fresh.count;i++)await raw.set(key+'.'+fresh.id+'.'+i,points.slice(i*400,(i+1)*400).join(''));
      await raw.set(head,JSON.stringify(fresh));await clean(previous);
    }catch{throw planRecoveryError();}}});
}
