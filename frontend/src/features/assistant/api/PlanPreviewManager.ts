import { asApiError, cancelledRequest, type ApiError } from '../../../shared/api/http';
import type { PlanInput, PlanSnapshot, StudyPlansApi } from './studyPlansApi';

export type PlanPreviewState={loading:boolean;key:string|null;value:PlanSnapshot|null;error:ApiError|null};
export const emptyPlanPreview=():PlanPreviewState=>({loading:false,key:null,value:null,error:null});
export class PlanPreviewManager {
  state=emptyPlanPreview();private listeners=new Set<()=>void>();private controller:AbortController|null=null;private generation=0;private disposed=false;private pending:Promise<PlanSnapshot>|null=null;
  constructor(private api:StudyPlansApi){}
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private publish(patch:Partial<PlanPreviewState>){if(this.disposed)return;this.state={...this.state,...patch};for(const listener of this.listeners)listener();}
  clear=()=>{this.controller?.abort();this.generation++;this.pending=null;this.publish(emptyPlanPreview());};
  generate=(input:PlanInput):Promise<PlanSnapshot>=>{
    if(this.disposed)return Promise.reject(cancelledRequest());
    const captured={...input,weekdays:[...input.weekdays]},key=JSON.stringify(captured);
    if(this.pending&&key===this.state.key)return this.pending;
    this.controller?.abort();const controller=new AbortController(),seq=++this.generation;this.controller=controller;
    this.publish({key,loading:true,value:null,error:null});
    const work=(async()=>{try{
      const value=await this.api.preview(captured,controller.signal);if(this.disposed||seq!==this.generation)throw cancelledRequest();
      this.publish({loading:false,value});return value;
    }catch(error){if(this.disposed||seq!==this.generation)throw cancelledRequest();const failure=asApiError(error);this.publish({loading:false,value:null,error:failure});throw failure;}})();
    this.pending=work;void work.finally(()=>{if(this.pending===work){this.pending=null;this.controller=null;}}).catch(()=>{});return work;
  };
  dispose(){this.disposed=true;this.controller?.abort();this.generation++;this.pending=null;this.listeners.clear();}
}
