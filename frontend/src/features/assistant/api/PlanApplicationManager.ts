import { ApiError, asApiError, cancelledRequest } from '../../../shared/api/http';
import { parsePlanCommand, type PlanApplicationsApi, type PlanCommand, type PlanReceipt } from './planApplicationsApi';
import { parsePlanRecovery, type PlanApplicationStore, type PlanRecovery } from './planApplicationStore';
export const emptyPlanApplication=()=>({loaded:false,busy:false,checking:false,command:null as PlanCommand|null,receipt:null as PlanReceipt|null,rejected:false,missing:false,error:null as ApiError|null});
export class PlanApplicationManager{
  state=emptyPlanApplication();private disposed=false;private listeners=new Set<()=>void>();private flight:Promise<unknown>|null=null;private controller:AbortController|null=null;
  constructor(private api:PlanApplicationsApi,private store:PlanApplicationStore){}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
  private valid(){if(this.disposed)throw cancelledRequest();}
  private publish(patch:Partial<typeof this.state>){if(!this.disposed){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn());}}
  private record():PlanRecovery{return{v:1,command:this.state.command!,receipt:this.state.receipt,rejected:this.state.rejected};}
  private run<T>(fn:()=>Promise<T>):Promise<T>{if(this.flight)return this.flight as Promise<T>;const work=fn();this.flight=work;void work.finally(()=>{if(this.flight===work)this.flight=null;}).catch(()=>{});return work;}
  restore=()=>this.run(async()=>{this.valid();this.publish({checking:true,error:null});try{const saved=parsePlanRecovery(await this.store.read());this.valid();this.publish({...saved,command:saved?.command??null,receipt:saved?.receipt??null,rejected:saved?.rejected??false,loaded:true,missing:false});}catch(e){this.publish({error:e instanceof Error&&e.message==='PLAN_RECOVERY_INVALID'?new ApiError('Không đọc được yêu cầu đối chiếu đã lưu. Giữ dữ liệu và kiểm tra kho lưu trữ.','PLAN_RECOVERY_INVALID'):asApiError(e)});throw e;}finally{this.publish({checking:false});}});
  start=(command:PlanCommand)=>{
    if(this.flight)return this.flight as Promise<PlanReceipt>;
    return this.run(async()=>{this.valid();if(!this.state.loaded||this.state.command)throw new ApiError('Cần xử lý yêu cầu đang giữ trước khi lưu kế hoạch mới.','PLAN_RECOVERY_REQUIRED');const body=parsePlanCommand(command);this.publish({busy:true,error:null,command:body,rejected:false,receipt:null,missing:false});let sent=false;
      try{await this.store.write(JSON.stringify(this.record()));this.valid();sent=true;return await this.send(body,false);}
      catch(e){if(!sent)this.publish({rejected:true,error:asApiError(e)});throw e;}finally{this.publish({busy:false});}});
  };
  private async send(command:PlanCommand,wasUncertain:boolean){
    this.controller=new AbortController();
    try{const receipt=await this.api.apply(command,this.controller.signal);this.valid();this.publish({receipt,error:null,rejected:false,missing:false});try{await this.store.write(JSON.stringify(this.record()));this.valid();}catch(e){this.publish({error:asApiError(e)});}this.valid();return receipt;}
    catch(e){this.valid();const error=asApiError(e),rejected=!wasUncertain&&[400,404,409,422].includes(error.status)&&error.code!=='STUDY_PLAN_REQUEST_REUSED';this.publish({error,rejected,missing:false});if(rejected)try{await this.store.write(JSON.stringify(this.record()));this.valid();}catch{/* Keep the older unresolved record if the update cannot be persisted. */}throw e;}
    finally{this.controller=null;}
  }
  check=()=>this.run(async()=>{this.valid();const command=this.state.command;if(!command)throw cancelledRequest();this.publish({checking:true,error:null,missing:false});this.controller=new AbortController();
    try{const receipt=await this.api.get(command,this.controller.signal);this.valid();this.publish({receipt,rejected:false,error:null});try{await this.store.write(JSON.stringify(this.record()));this.valid();}catch(e){this.publish({error:asApiError(e)});}this.valid();return receipt;}
    catch(e){this.valid();const error=asApiError(e);this.publish({error,missing:error.status===404&&error.code==='STUDY_PLAN_APPLICATION_NOT_FOUND'});throw e;}
    finally{this.controller=null;this.publish({checking:false});}});
  retry=()=>this.run(async()=>{this.valid();if(!this.state.command||!this.state.missing||this.state.receipt||this.state.rejected)throw new ApiError('Kiểm tra kết quả trước khi gửi lại đúng yêu cầu cũ.','PLAN_RECOVERY_REQUIRED');this.publish({busy:true,error:null});try{return await this.send(this.state.command,true);}finally{this.publish({busy:false});}});
  acknowledge=()=>this.run(async()=>{this.valid();if(!this.state.receipt&&!this.state.rejected)throw new ApiError('Kết quả chưa rõ. Giữ yêu cầu để đối chiếu; chưa thể bắt đầu lần lưu khác.','PLAN_RECOVERY_REQUIRED');this.publish({checking:true});try{await this.store.write(null);this.valid();this.publish({...emptyPlanApplication(),loaded:true});}catch(e){this.publish({error:asApiError(e)});throw e;}finally{this.publish({checking:false});}});
  dispose=()=>{this.disposed=true;this.controller?.abort();this.listeners.clear();};
}
