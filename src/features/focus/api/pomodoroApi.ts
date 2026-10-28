import {ApiError,createHttpClient} from '../../../shared/api/http';

export type PomodoroStatus='RUNNING'|'PAUSED'|'COMPLETED'|'CANCELLED';
export type PomodoroAction='pause'|'resume'|'complete'|'cancel';
export type PomodoroStart={clientRequestId:string;courseId:string;assignmentId:string|null;studySessionId:string|null;timeZone:string};
export type PomodoroSession={id:string;clientRequestId:string;status:PomodoroStatus;durationSeconds:1500;version:number;
  startedAt:string;stateChangedAt:string;serverTime:string;timeZone:string;elapsedMillis:number;pausedMillis:number;
  remainingMillis:number;remainingSeconds:number;endsAt:string|null;endedAt:string|null;finalizedAt:string|null;timeUp:boolean;creditedStudyMillis:number;
  context:{courseId:string;courseCode:string;courseName:string;semesterId:string;semesterTerm:number;semesterStartYear:number;
    assignmentId:string|null;assignmentTitle:string|null;studySessionId:string|null;studyTitle:string|null}};
export type Authorized=<T>(operation:(token:string)=>Promise<T>,signal?:AbortSignal)=>Promise<T>;
export const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const text=(v:unknown,max:number):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max;
const instant=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(v)&&Number.isFinite(Date.parse(v));
const invalid=()=>new ApiError('Phản hồi đồng hồ chưa hợp lệ. Đối chiếu phiên đã lưu trước khi thao tác tiếp.','INVALID_RESPONSE');
export const terminal=(row:PomodoroSession)=>row.status==='COMPLETED'||row.status==='CANCELLED';
export const targetStatus:Record<PomodoroAction,PomodoroStatus>={pause:'PAUSED',resume:'RUNNING',complete:'COMPLETED',cancel:'CANCELLED'};
export function validateStart(v:PomodoroStart){
  if(!object(v)||!uuid(v.clientRequestId)||!uuid(v.courseId)||(v.assignmentId!==null&&!uuid(v.assignmentId))
    ||(v.studySessionId!==null&&!uuid(v.studySessionId))||!text(v.timeZone,100))throw new ApiError('Chọn đúng môn, bài và buổi học trước khi bắt đầu.','INVALID_POMODORO_INPUT');
  return {clientRequestId:v.clientRequestId,courseId:v.courseId,assignmentId:v.assignmentId,studySessionId:v.studySessionId,timeZone:v.timeZone};
}
export function parsePomodoro(v:unknown):PomodoroSession{
  if(!object(v)||!uuid(v.id)||!uuid(v.clientRequestId)||!['RUNNING','PAUSED','COMPLETED','CANCELLED'].includes(v.status as string)
    ||v.durationSeconds!==1500||!integer(v.version)||!instant(v.startedAt)||!instant(v.stateChangedAt)||!instant(v.serverTime)||!text(v.timeZone,100)
    ||!integer(v.elapsedMillis,0,1500000)||!integer(v.pausedMillis)||!integer(v.remainingMillis,0,1500000)||!integer(v.remainingSeconds,0,1500)
    ||v.remainingMillis!==1500000-v.elapsedMillis||v.remainingSeconds!==Math.ceil(v.remainingMillis/1000)||v.timeUp!==(v.remainingMillis===0)
    ||!integer(v.creditedStudyMillis,0,1500000)||!object(v.context))throw invalid();
  const c=v.context;
  if(!uuid(c.courseId)||!uuid(c.semesterId)||!text(c.courseCode,64)||!text(c.courseName,200)||!integer(c.semesterTerm,1,3)||!integer(c.semesterStartYear,1900,2099))throw invalid();
  for(const [id,title] of [['assignmentId','assignmentTitle'],['studySessionId','studyTitle']] as const){
    if(c[id]===null?c[title]!==null:!uuid(c[id])||!text(c[title],200))throw invalid();
  }
  const start=Date.parse(v.startedAt),changed=Date.parse(v.stateChangedAt),now=Date.parse(v.serverTime);
  if(start>changed||changed>now)throw invalid();
  if(v.status==='RUNNING'){
    if(!instant(v.endsAt)||v.endedAt!==null||v.finalizedAt!==null||v.creditedStudyMillis!==0||Date.parse(v.endsAt)<changed
      ||(v.timeUp?Date.parse(v.endsAt)>now:Date.parse(v.endsAt)!==now+v.remainingMillis))throw invalid();
  }else if(v.status==='PAUSED'){
    if(v.endsAt!==null||v.endedAt!==null||v.finalizedAt!==null||v.timeUp||v.creditedStudyMillis!==0)throw invalid();
  }else{
    if(v.endsAt!==null||!instant(v.endedAt)||!instant(v.finalizedAt)||Date.parse(v.endedAt)<start||Date.parse(v.endedAt)>Date.parse(v.finalizedAt)||Date.parse(v.finalizedAt)!==changed)throw invalid();
    if(v.status==='COMPLETED'?(v.elapsedMillis!==1500000||v.creditedStudyMillis!==1500000):(v.timeUp||v.creditedStudyMillis!==0||v.endedAt!==v.finalizedAt))throw invalid();
  }
  return {id:v.id,clientRequestId:v.clientRequestId,status:v.status,durationSeconds:v.durationSeconds,version:v.version,
    startedAt:v.startedAt,stateChangedAt:v.stateChangedAt,serverTime:v.serverTime,timeZone:v.timeZone,elapsedMillis:v.elapsedMillis,pausedMillis:v.pausedMillis,
    remainingMillis:v.remainingMillis,remainingSeconds:v.remainingSeconds,endsAt:v.endsAt,endedAt:v.endedAt,finalizedAt:v.finalizedAt,timeUp:v.timeUp,creditedStudyMillis:v.creditedStudyMillis,
    context:{courseId:c.courseId,courseCode:c.courseCode,courseName:c.courseName,semesterId:c.semesterId,semesterTerm:c.semesterTerm,semesterStartYear:c.semesterStartYear,assignmentId:c.assignmentId,assignmentTitle:c.assignmentTitle,studySessionId:c.studySessionId,studyTitle:c.studyTitle}} as PomodoroSession;
}
export function createPomodoroApi(baseUrl:string,authorized:Authorized,options:Parameters<typeof createHttpClient>[1]={}){
  const request=createHttpClient(baseUrl,options),root='/api/v1/pomodoro-sessions';
  const read=(path:string,signal?:AbortSignal)=>authorized(token=>request<unknown>(path,{signal,headers:{Authorization:`Bearer ${token}`}}),signal);
  return {
    async active(signal?:AbortSignal){const raw=await read(root+'/active',signal);if(raw===null)return null;const row=parsePomodoro(raw);if(terminal(row))throw invalid();return row;},
    async get(id:string,signal?:AbortSignal){if(!uuid(id))throw invalid();const row=parsePomodoro(await read(root+'/'+id,signal));if(row.id!==id)throw invalid();return row;},
    async start(input:PomodoroStart,signal?:AbortSignal){input=validateStart(input);const row=parsePomodoro(await authorized(token=>request<unknown>(root,{method:'POST',body:input,signal,headers:{Authorization:`Bearer ${token}`}}),signal));
      if(row.clientRequestId!==input.clientRequestId||row.context.courseId!==input.courseId||row.context.assignmentId!==input.assignmentId||row.context.studySessionId!==input.studySessionId||row.timeZone!==input.timeZone)throw invalid();return row;},
    async change(action:PomodoroAction,id:string,version:number,signal?:AbortSignal){
      if(!uuid(id)||!integer(version)||!Object.hasOwn(targetStatus,action))throw invalid();
      const row=parsePomodoro(await authorized(token=>request<unknown>(`${root}/${id}/${action}`,{method:'POST',body:{version},signal,headers:{Authorization:`Bearer ${token}`}}),signal));
      if(row.id!==id||row.status!==targetStatus[action]||(row.version!==version+1&&(!terminal(row)||row.version!==version)))throw invalid();return row;
    },
  };
}
export type PomodoroApi=ReturnType<typeof createPomodoroApi>;
