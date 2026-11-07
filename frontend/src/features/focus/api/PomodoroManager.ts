import {ApiError,asApiError,cancelledRequest} from '../../../shared/api/http';
import {terminal,targetStatus,validateStart,type PomodoroApi,type PomodoroSession,type PomodoroAction,type PomodoroStart} from './pomodoroApi';
import {parseCommand,type PomodoroCommand,type PomodoroCommandStore} from './pomodoroCommand';

export type AnchoredPomodoro={row:PomodoroSession;receivedAt:number};
export type PomodoroState={active:AnchoredPomodoro|null;last:PomodoroSession|null;pending:PomodoroCommand|null;
  loaded:boolean;loading:boolean;busy:boolean;needsReload:boolean;error:ApiError|null;notice:string};
export const emptyPomodoro=():PomodoroState=>({active:null,last:null,pending:null,loaded:false,loading:false,busy:false,needsReload:false,error:null,notice:''});
export type PomodoroSnapshot={owner:string|null;manager:PomodoroManager|null;state:PomodoroState};
export function visiblePomodoro(snapshot:PomodoroSnapshot,owner:string|null):PomodoroSnapshot{return owner&&snapshot.owner===owner?snapshot:{owner,manager:null,state:emptyPomodoro()};}
export const monotonicNow=()=>typeof performance!=='undefined'?performance.now():Date.now();
export function pomodoroRemaining(value:AnchoredPomodoro|null,now:number){if(!value)return 1500000;return Math.max(0,value.row.remainingMillis-(value.row.status==='RUNNING'?Math.max(0,now-value.receivedAt):0));}
export class PomodoroManager{
  state=emptyPomodoro();
  private listeners=new Set<()=>void>();private disposed=false;private hydrated=false;
  private readFlight:Promise<void>|null=null;private readController:AbortController|null=null;private writeController:AbortController|null=null;
  private uncertain=false;private dueCheckAt=-Infinity;private autoAttempts=new Set<string>();
  constructor(private api:PomodoroApi,private store:PomodoroCommandStore,private now:()=>number=monotonicNow,private notify:()=>void=()=>{}){}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
  private publish(change:Partial<PomodoroState>){if(!this.disposed){this.state={...this.state,...change};this.listeners.forEach(fn=>fn());}}
  private valid(){if(this.disposed)throw cancelledRequest();}
  private async clearPending(){this.valid();await this.store.write(null);this.valid();this.uncertain=false;this.publish({pending:null});}
  reload=():Promise<void>=>{if(this.state.busy)return Promise.reject(new ApiError('Đang xử lý phiên học. Chờ một chút.','REQUEST_BUSY'));return this.load();};
  private load():Promise<void>{
    if(this.disposed)return Promise.reject(cancelledRequest());if(this.readFlight)return this.readFlight;
    const controller=new AbortController();this.readController=controller;this.publish({loading:true});
    const work=(async()=>{
      if(!this.hydrated){const pending=parseCommand(await this.store.read());this.valid();this.hydrated=true;this.uncertain=!!pending;this.publish({pending});}
      const pending=this.state.pending;let active=await this.api.active(controller.signal);this.valid();
      let resolved=false,last=this.state.last;
      if(pending?.kind==='start'){
        resolved=active?.clientRequestId===pending.input.clientRequestId;
        if(resolved&&active&&(active.context.courseId!==pending.input.courseId||active.context.assignmentId!==pending.input.assignmentId||active.context.studySessionId!==pending.input.studySessionId||active.timeZone!==pending.input.timeZone))
          throw new ApiError('Phiên trả về chưa khớp nội dung yêu cầu đã lưu. Giữ thông tin đối chiếu và thử lại.','INVALID_RESPONSE');
      }
      else if(pending){
        let row:PomodoroSession|null=null;
        try{row=await this.api.get(pending.id,controller.signal);this.valid();}
        catch(e){if(asApiError(e).status!==404)throw e;resolved=true;if(active?.id===pending.id)active=null;}
        if(row){
          if(row.version<pending.version)throw new ApiError('Phiên trả về đang cũ hơn yêu cầu đã gửi. Hãy đối chiếu lại.','POMODORO_STALE_RESPONSE');
          resolved=row.version>pending.version||(terminal(row)&&row.status===targetStatus[pending.kind]);
          if(terminal(row))last=row;
          if(active?.id===row.id&&row.version>=active.version)active=terminal(row)?null:row;
        }
      }
      this.publish({active:active?{row:active,receivedAt:this.now()}:null,last,loaded:true,needsReload:false,error:null});
      if(resolved){await this.clearPending();this.publish({notice:'Đã đối chiếu với phiên lưu trong tài khoản.'});}
    })().catch(e=>{this.publish({error:asApiError(e),needsReload:true});throw e;})
      .finally(()=>{this.readFlight=null;this.readController=null;this.publish({loading:false});});
    this.readFlight=work;return work;
  }
  private ready(){this.valid();if(this.state.busy||this.state.loading)throw new ApiError('Đang xử lý phiên học. Chờ một chút.','REQUEST_BUSY');
    if(!this.hydrated||!this.state.loaded||this.state.needsReload)throw new ApiError('Đối chiếu phiên đã lưu trước khi thao tác tiếp.','POMODORO_RELOAD_REQUIRED');}
  start=(input:PomodoroStart)=>{this.ready();if(this.state.pending)throw new ApiError('Cần xử lý yêu cầu chưa rõ kết quả trước.','POMODORO_RECOVERY_REQUIRED');
    if(this.state.active)throw new ApiError('Đang có phiên học. Hoàn tất hoặc hủy trước khi đổi nội dung.','POMODORO_ALREADY_ACTIVE');return this.write({kind:'start',input:validateStart(input)});};
  change=(kind:PomodoroAction,id:string,version:number)=>{this.ready();if(this.state.pending)throw new ApiError('Cần đối chiếu yêu cầu trước trước khi thao tác tiếp.','POMODORO_RECOVERY_REQUIRED');
    if(this.state.active?.row.id!==id||this.state.active.row.version!==version)throw new ApiError('Phiên đã thay đổi. Kiểm tra lại nội dung đang mở.','POMODORO_VERSION_CONFLICT');return this.write({kind,id,version});};
  retry=()=>{this.ready();if(!this.state.pending)throw new ApiError('Không có yêu cầu cần gửi lại.','POMODORO_RECOVERY_REQUIRED');return this.write(this.state.pending);};
  private async write(command:PomodoroCommand){
    const wasUncertain=this.uncertain;this.publish({busy:true,error:null,notice:'',pending:command});
    const controller=new AbortController();this.writeController=controller;
    let sent=false;
    try{
      await this.store.write(JSON.stringify(command));this.valid();sent=true;
      const row=command.kind==='start'?await this.api.start(command.input,controller.signal):await this.api.change(command.kind,command.id,command.version,controller.signal);
      this.valid();this.publish(terminal(row)?{last:row,active:this.state.active?.row.id===row.id?null:this.state.active}:{active:{row,receivedAt:this.now()}});
      await this.clearPending();this.notify();
      this.publish({notice:row.status==='COMPLETED'?'Đã lưu phiên học hoàn tất 25 phút.':row.status==='CANCELLED'?'Đã hủy phiên. Phần học dở được giữ để tra cứu.':row.status==='PAUSED'?'Đã tạm dừng phiên học.':'Phiên học đã được lưu trong tài khoản.'});
      try{await this.load();}catch{/* The mutation is confirmed; retain its result and expose the GET failure. */}return row;
    }catch(failure){
      const error=asApiError(failure);this.uncertain=wasUncertain||sent&&(!error.status||error.status>=500);
      if(sent&&!this.uncertain&&error.status>=400&&error.status<500){try{await this.clearPending();}catch{/* Preserve command if storage cannot be cleared. */}}
      this.publish({error,needsReload:true});throw error;
    }finally{this.writeController=null;this.publish({busy:false});}
  }
  confirmElapsed=async()=>{
    if(this.disposed||!this.state.loaded||this.state.busy||this.state.loading||this.state.error||this.state.pending||this.state.needsReload)return;
    const active=this.state.active;if(!active||active.row.status!=='RUNNING'||pomodoroRemaining(active,this.now())>0||this.now()-this.dueCheckAt<1000)return;
    this.dueCheckAt=this.now();
    try{await this.reload();const row=this.state.active?.row;
      if(!row||row.status!=='RUNNING'||!row.timeUp||this.state.pending||this.state.error||this.state.busy)return;
      const key=`${row.id}:${row.version}`;if(this.autoAttempts.has(key))return;this.autoAttempts.add(key);await this.change('complete',row.id,row.version);
    }catch{/* A read or write error is visible; an uncertain mutation is never replayed automatically. */}
  };
  dispose=()=>{this.disposed=true;this.readController?.abort();this.writeController?.abort();this.listeners.clear();this.state=emptyPomodoro();};
}
