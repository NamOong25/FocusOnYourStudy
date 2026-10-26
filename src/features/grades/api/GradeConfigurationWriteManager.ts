import {ApiError,asApiError,cancelledRequest} from '../../../shared/api/http';
import {configurationInput,type ConfigurationInput} from '../gradeConfigurationDraft';
import {courseGradeKey,type CourseRef,type ServerGradeDetail} from './gradesReadApi';
import type {createGradeConfigurationsApi} from './gradeConfigurationsApi';

export type ConfigurationPending={operation:'create'|'update'|'delete';course:CourseRef;original:ServerGradeDetail;input?:ConfigurationInput;reason:'uncertain'|'stale'|'gone'|'protected'};
export type ConfigurationCheck={courseExists:boolean;current:ServerGradeDetail|null};
export const emptyConfigurationWrite=()=>({busy:false,checking:false,revision:0,error:null as ApiError|null,pending:null as ConfigurationPending|null,checked:null as ConfigurationCheck|null});
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));
export class GradeConfigurationWriteManager {
  state=emptyConfigurationWrite();private disposed=false;private listeners=new Set<()=>void>();private read:AbortController|null=null;
  constructor(private api:ReturnType<typeof createGradeConfigurationsApi>){}
  subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
  private publish(patch:Partial<typeof this.state>){if(!this.disposed){this.state={...this.state,...patch};this.listeners.forEach(fn=>fn());}}
  private async write<T>(pending:Omit<ConfigurationPending,'reason'>,operation:()=>Promise<T>):Promise<T>{
    if(this.disposed)throw cancelledRequest();
    if(this.state.busy||this.state.checking)throw new ApiError('Đang xử lý bảng điểm. Đợi một chút nhé.','REQUEST_BUSY');
    if(this.state.pending)throw new ApiError('Kiểm tra kết quả lần lưu trước trước khi tiếp tục.','GRADE_REVIEW_REQUIRED');
    this.publish({busy:true,error:null,checked:null});
    try{const result=await operation();if(this.disposed)throw cancelledRequest();this.publish({revision:this.state.revision+1});return result;}
    catch(failure){const error=asApiError(failure);const reason:ConfigurationPending['reason']|null=
      ['GRADE_CONFIGURATION_VERSION_CONFLICT','GRADE_CONFIGURATION_ALREADY_EXISTS'].includes(error.code)?'stale'
      :['GRADE_CONFIGURATION_NOT_FOUND','COURSE_NOT_FOUND'].includes(error.code)?'gone'
      :['GRADE_COLUMN_HAS_SCORES','GRADE_CONFIGURATION_HAS_SCORES'].includes(error.code)?'protected'
      :!error.status||error.status>=500||error.code==='DATA_CONFLICT'?'uncertain':null;
      this.publish({error,...(reason?{pending:{...pending,reason},revision:this.state.revision+1}:{})});throw error;
    }finally{this.publish({busy:false});}
  }
  save=(course:CourseRef,input:ConfigurationInput,original:ServerGradeDetail)=>{
    courseGradeKey(course);if(original.courseId.toLowerCase()!==course.id.toLowerCase())throw new ApiError('Bảng điểm không khớp môn đang mở.','INVALID_GRADE_QUERY');
    const data=configurationInput(input),basis=clone(original),scope=clone(course);
    return this.write({operation:basis.kind==='configured'?'update':'create',course:scope,original:basis,input:data},()=>this.api.save(scope,data,basis.kind==='configured'?basis:undefined));
  };
  remove=(course:CourseRef,original:ServerGradeDetail)=>{
    courseGradeKey(course);if(original.kind!=='configured'||original.courseId.toLowerCase()!==course.id.toLowerCase())throw new ApiError('Cần mở bảng điểm đã lưu trước khi xóa.','INVALID_GRADE_QUERY');
    const scope=clone(course),basis=clone(original);return this.write({operation:'delete',course:scope,original:basis},()=>this.api.remove(scope,basis));
  };
  check=async(course?:CourseRef):Promise<ConfigurationCheck>=>{
    if(this.disposed)throw cancelledRequest();
    const pending=this.state.pending;if(!pending||this.state.busy||this.state.checking)throw new ApiError('Chưa thể kiểm tra lúc này.','REQUEST_BUSY');
    const scope=course??pending.course;courseGradeKey(scope);if(scope.id.toLowerCase()!==pending.course.id.toLowerCase())throw new ApiError('Chọn đúng môn của lần lưu cần kiểm tra.','INVALID_GRADE_QUERY');
    const controller=new AbortController();this.read=controller;this.publish({checking:true,error:null,checked:null});
    try{
      let checked:ConfigurationCheck;
      try{checked={courseExists:true,current:await this.api.current(scope,controller.signal)};}
      catch(failure){const e=asApiError(failure);if(e.status===404&&e.code==='COURSE_NOT_FOUND')checked={courseExists:false,current:null};else throw failure;}
      if(this.disposed||controller.signal.aborted)throw cancelledRequest();this.publish({checked});return checked;
    }catch(failure){this.publish({error:asApiError(failure)});throw failure;}
    finally{this.read=null;this.publish({checking:false});}
  };
  acknowledge=()=>{if(this.disposed||this.state.busy||this.state.checking||!this.state.checked)return false;this.publish({pending:null,checked:null,error:null,revision:this.state.revision+1});return true;};
  clearError=()=>{if(!this.disposed&&!this.state.pending&&!this.state.busy)this.publish({error:null});};
  dispose=()=>{this.disposed=true;this.read?.abort();this.listeners.clear();this.state=emptyConfigurationWrite();};
}
