import { ApiError, createHttpClient } from '../../../shared/api/http';
import { isValidDate } from '../../../shared/utils/dates';
import type { Authorized } from '../../academics/api/semestersApi';
import { planClock, planDay, planZone, utcNanos } from './planTime';

export type PlanInput = {courseId:string;assignmentId?:string;examId?:string;goal:string;fromDate:string;toDate:string;timeZone:string;availableStart:string;availableEnd:string;weekdays:number[];totalMinutes:number;sessionMinutes:number;breakMinutes:number};
export type PlanSession = {index:number;title:string;courseId:string;assignmentId:string|null;startsAt:string;endsAt:string;timeZone:string;durationMinutes:number};
export type PlanSnapshot = {engine:'RULE_BASED_V1';persisted:false;asOf:string;courseId:string;courseVersion:number;target:{kind:'SELF_STUDY'|'ASSIGNMENT'|'EXAM';id:string|null;version:number|null;deadline:string|null};goal:string;fromDate:string;toDate:string;timeZone:string;requestedMinutes:number;scheduledMinutes:number;unscheduledMinutes:number;complete:boolean;warnings:string[];sessions:PlanSession[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const planId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v);
const integer=(v:unknown,min:number,max:number):v is number=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const sameId=(a:unknown,b:string)=>typeof a==='string'&&a.toLowerCase()===b.toLowerCase();
const badInput=(message:string)=>new ApiError(message,'INVALID_STUDY_PLAN');
const invalid=()=>new ApiError('Bản đề xuất từ server chưa hợp lệ. Giữ điều kiện và thử tạo lại.','INVALID_PLAN_RESPONSE');
export function validatePlanInput(input:PlanInput,now=Date.now()) {
  if(!planId(input.courseId)||input.assignmentId!==undefined&&!planId(input.assignmentId)||input.examId!==undefined&&!planId(input.examId)||input.assignmentId&&input.examId)throw badInput('Chọn môn và tối đa một bài tập hoặc kỳ thi.');
  if(!input.goal.trim()||input.goal.trim().length>120)throw badInput('Mục tiêu cần từ 1 đến 120 ký tự.');
  if(!planZone(input.timeZone))throw badInput('Múi giờ chưa hợp lệ. Ví dụ Asia/Ho_Chi_Minh.');
  if(!isValidDate(input.fromDate)||!isValidDate(input.toDate)||input.fromDate<planDay(now,input.timeZone)||input.toDate<input.fromDate||input.toDate>'2099-12-31'||(Date.parse(input.toDate+'T00:00:00Z')-Date.parse(input.fromDate+'T00:00:00Z'))/86400000>13)throw badInput('Chọn tối đa 14 ngày từ hôm nay theo múi giờ kế hoạch.');
  if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.availableStart)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.availableEnd)||input.availableStart>=input.availableEnd)throw badInput('Giờ rảnh kết thúc phải sau bắt đầu trong cùng ngày.');
  if(!Array.isArray(input.weekdays)||!input.weekdays.length||input.weekdays.length>7||input.weekdays.some(x=>!integer(x,1,7))||new Set(input.weekdays).size!==input.weekdays.length)throw badInput('Chọn ít nhất một thứ trong tuần, không lặp.');
  if(!integer(input.totalMinutes,1,1440)||!integer(input.sessionMinutes,15,240)||!integer(input.breakMinutes,0,60))throw badInput('Tổng phút cần 1–1440; mỗi buổi 15–240; nghỉ 0–60 phút.');
}
export function parsePlanSnapshot(value:unknown,input:PlanInput):PlanSnapshot {
  if(!object(value)||value.engine!=='RULE_BASED_V1'||value.persisted!==false||utcNanos(value.asOf)===null||!sameId(value.courseId,input.courseId)||!integer(value.courseVersion,0,Number.MAX_SAFE_INTEGER)
    ||value.goal!==input.goal.trim()||value.fromDate!==input.fromDate||value.toDate!==input.toDate||value.timeZone!==input.timeZone||value.requestedMinutes!==input.totalMinutes
    ||!integer(value.scheduledMinutes,0,input.totalMinutes)||!integer(value.unscheduledMinutes,0,input.totalMinutes)||value.scheduledMinutes+value.unscheduledMinutes!==input.totalMinutes||value.complete!==(value.unscheduledMinutes===0)
    ||!Array.isArray(value.warnings)||value.warnings.some(x=>!['DST_WINDOW_SKIPPED','DEADLINE_LIMIT','INSUFFICIENT_CONTIGUOUS_TIME'].includes(x))||new Set(value.warnings).size!==value.warnings.length
    ||!Array.isArray(value.sessions)||value.sessions.length>97||!object(value.target))throw invalid();
  const target=value.target,kind=input.assignmentId?'ASSIGNMENT':input.examId?'EXAM':'SELF_STUDY',id=input.assignmentId??input.examId;
  if(target.kind!==kind)throw invalid();
  if(id){if(!sameId(target.id,id)||!integer(target.version,0,Number.MAX_SAFE_INTEGER)||utcNanos(target.deadline)===null)throw invalid();}
  else if(target.id!==null||target.version!==null||target.deadline!==null)throw invalid();
  if(id&&utcNanos(target.deadline)!<=utcNanos(value.asOf)!)throw invalid();
  let total=0,previous:bigint|null=null;
  for(let index=0;index<value.sessions.length;index++){
    const s:unknown=value.sessions[index];if(!object(s)||s.index!==index+1||typeof s.title!=='string'||!s.title.trim()||s.title.length>200||!sameId(s.courseId,input.courseId)||(input.assignmentId?!sameId(s.assignmentId,input.assignmentId):s.assignmentId!==null)||s.timeZone!==input.timeZone||!integer(s.durationMinutes,1,input.sessionMinutes))throw invalid();
    const start=utcNanos(s.startsAt),end=utcNanos(s.endsAt);if(start===null||end===null||start%60_000_000_000n!==0n||end-start!==BigInt(s.durationMinutes)*60_000_000_000n||start<utcNanos(value.asOf)!
      ||start<BigInt(Date.UTC(1900,0,1))*1_000_000n||end>=BigInt(Date.UTC(2100,0,1))*1_000_000n||previous!==null&&start<previous+BigInt(input.breakMinutes)*60_000_000_000n||id&&end>utcNanos(target.deadline)!)throw invalid();
    const date=planDay(Date.parse(s.startsAt as string),input.timeZone),endDate=planDay(Date.parse(s.endsAt as string),input.timeZone),weekday=new Date(date+'T00:00:00Z').getUTCDay()||7;
    if(date<input.fromDate||date>input.toDate||date!==endDate||!input.weekdays.includes(weekday)||planClock(s.startsAt as string,input.timeZone)<input.availableStart||planClock(s.endsAt as string,input.timeZone)>input.availableEnd)throw invalid();
    total+=s.durationMinutes;previous=end;
    if(index<value.sessions.length-1&&s.durationMinutes!==input.sessionMinutes)throw invalid();
  }
  if(total!==value.scheduledMinutes||value.unscheduledMinutes>0&&!value.warnings.includes('INSUFFICIENT_CONTIGUOUS_TIME')||value.unscheduledMinutes>0&&value.sessions.some(s=>(s as PlanSession).durationMinutes!==input.sessionMinutes))throw invalid();
  return value as unknown as PlanSnapshot;
}
export function createStudyPlansApi(baseUrl:string,authorized:Authorized,options?:Parameters<typeof createHttpClient>[1]) {
  const http=createHttpClient(baseUrl,options);
  return {async preview(input:PlanInput,signal?:AbortSignal){validatePlanInput(input);const body:PlanInput={courseId:input.courseId,...(input.assignmentId?{assignmentId:input.assignmentId}:{}),...(input.examId?{examId:input.examId}:{}),goal:input.goal.trim(),fromDate:input.fromDate,toDate:input.toDate,timeZone:input.timeZone,availableStart:input.availableStart,availableEnd:input.availableEnd,weekdays:[...input.weekdays],totalMinutes:input.totalMinutes,sessionMinutes:input.sessionMinutes,breakMinutes:input.breakMinutes};
    const value=await authorized(token=>http<unknown>('/api/v1/study-plans/preview',{method:'POST',headers:{Authorization:`Bearer ${token}`},body,signal}),signal);
    return parsePlanSnapshot(value,body);
  }};
}
export type StudyPlansApi=ReturnType<typeof createStudyPlansApi>;
