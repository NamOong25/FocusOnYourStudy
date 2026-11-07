import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';
import { planId, validatePlanInput, type PlanInput, type PlanSnapshot } from './studyPlansApi';
import { draftReview, type PlanDraft } from './planDrafts';
import { planWall, utcNanos } from './planTime';

export type PlanCommand={clientRequestId:string;conditions:PlanInput;courseVersion:number;targetVersion:number|null;sessions:{index:number;title:string;startsAt:string;durationMinutes:number}[]};
export type PlanReceipt={applicationId:string;clientRequestId:string;persisted:true;appliedAt:string;courseId:string;courseVersion:number;target:PlanSnapshot['target'];requestedMinutes:number;savedMinutes:number;remainingMinutes:number;sessions:{index:number;session:{id:string;courseId:string;assignmentId:string|null;title:string;startsAt:string;endsAt:string;timeZone:string;durationMinutes:number;status:'PLANNED';notes:string;version:number;createdAt:string;updatedAt:string}}[]};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const int=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const same=(a:unknown,b:unknown)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
const invalid=()=>new ApiError('Biên nhận chưa khớp yêu cầu đã gửi. Giữ yêu cầu và kiểm tra kết quả trước khi thao tác tiếp.','INVALID_PLAN_RECEIPT');
export const planRecoveryError=()=>new ApiError('Chưa lưu/đọc được thông tin đối chiếu trên thiết bị. Kiểm tra quyền lưu trữ và thử lại.','PLAN_RECOVERY_STORAGE');
export function newPlanRequestId(){
  if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
  const bytes=Array.from({length:16},()=>Math.floor(Math.random()*256));bytes[6]=(bytes[6]!&15)|64;bytes[8]=(bytes[8]!&63)|128;
  const s=bytes.map(b=>b.toString(16).padStart(2,'0')).join('');return`${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}
/** Validate stored commands without today's cutoff: exact retry/lookup must work after time passes. */
export function parsePlanCommand(value:unknown):PlanCommand{
  try{
    if(!obj(value)||!planId(value.clientRequestId)||!obj(value.conditions)||!int(value.courseVersion)||!(value.targetVersion===null||int(value.targetVersion))||!Array.isArray(value.sessions)||!value.sessions.length||value.sessions.length>97)throw Error();
    const c=value.conditions as unknown as PlanInput;validatePlanInput(c,null);
    if(!!(c.assignmentId||c.examId)!==(value.targetVersion!==null))throw Error();
    const indices=new Set<number>();let total=0;
    const sessions=value.sessions.map(s=>{if(!obj(s)||!int(s.index,1,97)||indices.has(s.index)||typeof s.title!=='string'||!s.title.trim()||s.title.trim().length>200||utcNanos(s.startsAt)===null||utcNanos(s.startsAt)!%60_000_000_000n!==0n||!int(s.durationMinutes,1,240))throw Error();indices.add(s.index);total+=s.durationMinutes;return{index:s.index,title:s.title.trim(),startsAt:s.startsAt as string,durationMinutes:s.durationMinutes};});
    if(total>c.totalMinutes)throw Error();
    const conditions:PlanInput={courseId:c.courseId,...(c.assignmentId?{assignmentId:c.assignmentId}:{}),...(c.examId?{examId:c.examId}:{}),goal:c.goal.trim(),fromDate:c.fromDate,toDate:c.toDate,timeZone:c.timeZone,availableStart:c.availableStart,availableEnd:c.availableEnd,weekdays:[...c.weekdays],totalMinutes:c.totalMinutes,sessionMinutes:c.sessionMinutes,breakMinutes:c.breakMinutes};
    return{clientRequestId:value.clientRequestId,conditions,courseVersion:value.courseVersion,targetVersion:value.targetVersion as number|null,sessions};
  }catch{throw new ApiError('Thông tin yêu cầu đã lưu chưa hợp lệ. Giữ dữ liệu đối chiếu; không tự tạo lần lưu khác.','PLAN_RECOVERY_INVALID');}
}
export function buildPlanCommand(input:PlanInput,snapshot:PlanSnapshot,drafts:PlanDraft[],id=newPlanRequestId(),now=Date.now()):PlanCommand{
  validatePlanInput(input,now);const review=draftReview(drafts,input,snapshot,now);
  if(!review.selectedCount||review.overBudget||Object.keys(review.issues).length)throw new ApiError('Chọn ít nhất một buổi và sửa các mục được báo lỗi trước khi lưu.','INVALID_PLAN_SELECTION');
  if(snapshot.courseId!==input.courseId||snapshot.requestedMinutes!==input.totalMinutes)throw new ApiError('Bản xem trước không còn khớp điều kiện. Tạo lại đề xuất.','INVALID_PLAN_SELECTION');
  return parsePlanCommand({clientRequestId:id,conditions:input,courseVersion:snapshot.courseVersion,targetVersion:snapshot.target.version,sessions:drafts.filter(d=>d.selected).map(d=>({index:d.index,title:d.title.trim(),startsAt:planWall(d.date,d.start,input.timeZone,d.originalStartsAt),durationMinutes:Number(d.duration)}))});
}
export function parsePlanReceipt(value:unknown,command:PlanCommand):PlanReceipt{
  const c=command.conditions,kind=c.assignmentId?'ASSIGNMENT':c.examId?'EXAM':'SELF_STUDY',targetId=c.assignmentId??c.examId;
  if(!obj(value)||!planId(value.applicationId)||!same(value.clientRequestId,command.clientRequestId)||value.persisted!==true||utcNanos(value.appliedAt)===null||!same(value.courseId,c.courseId)||value.courseVersion!==command.courseVersion||!obj(value.target)||value.target.kind!==kind||value.requestedMinutes!==c.totalMinutes||!int(value.savedMinutes,1,c.totalMinutes)||!int(value.remainingMinutes,0,c.totalMinutes)||value.savedMinutes+value.remainingMinutes!==c.totalMinutes||!Array.isArray(value.sessions)||value.sessions.length!==command.sessions.length)throw invalid();
  const target=value.target;if(targetId?(!same(target.id,targetId)||target.version!==command.targetVersion||utcNanos(target.deadline)===null):(target.id!==null||target.version!==null||target.deadline!==null))throw invalid();
  const indices=new Set<number>(),ids=new Set<string>();let total=0;
  const sessions=value.sessions.map(row=>{
    if(!obj(row)||!int(row.index,1,97)||indices.has(row.index)||!obj(row.session))throw invalid();const wanted=command.sessions.find(s=>s.index===row.index),s=row.session;
    if(!wanted||!planId(s.id)||ids.has(s.id.toLowerCase())||!same(s.courseId,c.courseId)||(c.assignmentId?!same(s.assignmentId,c.assignmentId):s.assignmentId!==null)||s.title!==wanted.title||utcNanos(s.startsAt)===null||utcNanos(s.startsAt)!==utcNanos(wanted.startsAt)||utcNanos(s.endsAt)===null||utcNanos(s.endsAt)!-utcNanos(s.startsAt)!!==BigInt(wanted.durationMinutes)*60_000_000_000n||s.durationMinutes!==wanted.durationMinutes||s.timeZone!==c.timeZone||s.status!=='PLANNED'||s.notes!==''||s.version!==0||utcNanos(s.createdAt)===null||utcNanos(s.updatedAt)===null||targetId&&utcNanos(s.endsAt)!>utcNanos(target.deadline)!)throw invalid();
    indices.add(row.index);ids.add(s.id.toLowerCase());total+=wanted.durationMinutes;
    return{index:row.index,session:{id:s.id,courseId:s.courseId as string,assignmentId:s.assignmentId as string|null,title:s.title as string,startsAt:s.startsAt as string,endsAt:s.endsAt as string,timeZone:s.timeZone as string,durationMinutes:s.durationMinutes as number,status:'PLANNED' as const,notes:'',version:0,createdAt:s.createdAt as string,updatedAt:s.updatedAt as string}};
  });
  if(total!==value.savedMinutes)throw invalid();
  return{applicationId:value.applicationId,clientRequestId:value.clientRequestId as string,persisted:true,appliedAt:value.appliedAt as string,courseId:value.courseId as string,courseVersion:command.courseVersion,target:target as unknown as PlanSnapshot['target'],requestedMinutes:c.totalMinutes,savedMinutes:total,remainingMinutes:value.remainingMinutes,sessions};
}
export function createPlanApplicationsApi(baseUrl:string,authorized:Authorized,options?:Parameters<typeof createHttpClient>[1]){
  const http=createHttpClient(baseUrl,options);
  return{async apply(command:PlanCommand,signal?:AbortSignal){const body=parsePlanCommand(command);return parsePlanReceipt(await authorized(token=>http<unknown>('/api/v1/study-plans/apply',{method:'POST',headers:{Authorization:`Bearer ${token}`},body,signal}),signal),body);},
    async get(command:PlanCommand,signal?:AbortSignal){const body=parsePlanCommand(command);return parsePlanReceipt(await authorized(token=>http<unknown>('/api/v1/study-plans/applications/'+body.clientRequestId,{headers:{Authorization:`Bearer ${token}`},signal}),signal),body);}};
}
export type PlanApplicationsApi=ReturnType<typeof createPlanApplicationsApi>;
