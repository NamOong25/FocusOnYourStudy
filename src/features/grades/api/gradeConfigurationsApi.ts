import {ApiError,asApiError,createHttpClient} from '../../../shared/api/http';
import type {Authorized} from '../../academics/api/semestersApi';
import {configurationInput,type ConfigurationInput} from '../gradeConfigurationDraft';
import {courseGradeKey,createGradesReadApi,validGradeId,type CourseRef} from './gradesReadApi';

export type ConfigurationBasis={configurationId:string;gradeVersion:number};
export type SavedConfiguration={id:string;courseId:string;version:number;state:'DRAFT'|'READY';missingGroups:string[];
  assessment:ConfigurationInput['assessment'];parts:(ConfigurationInput['parts'][number]&{weight:number;weightNumerator:number;weightDenominator:number})[]};
const bad=()=>new ApiError('Chưa xác nhận được phản hồi lưu cấu hình. Kiểm tra dữ liệu đã lưu trước khi gửi lại.','INVALID_RESPONSE');
const errors:Record<string,string>={
  GRADE_CONFIGURATION_ALREADY_EXISTS:'Môn đã có bảng điểm được tạo ở nơi khác. Kiểm tra bản đã lưu trước khi tiếp tục.',
  GRADE_CONFIGURATION_VERSION_CONFLICT:'Bảng điểm đã thay đổi ở nơi khác. Bản nháp vẫn được giữ để bạn đối chiếu.',
  GRADE_CONFIGURATION_NOT_FOUND:'Bảng điểm này đã bị xóa hoặc thay thế. Kiểm tra lại dữ liệu của môn.',
  COURSE_NOT_FOUND:'Môn học không còn tồn tại hoặc không còn truy cập được trong tài khoản.',
  GRADE_COLUMN_HAS_SCORES:'Có cột đã có điểm, kể cả 0. Chỉ đổi tên/thứ tự; muốn đổi loại, cách quy BTL hoặc xóa cột, cần xử lý điểm trước.',
  GRADE_CONFIGURATION_HAS_SCORES:'Bảng điểm còn điểm đã nhập, kể cả 0, nên chưa thể xóa.',
  INVALID_GRADE_CONFIGURATION:'Cấu hình cột chưa hợp lệ. Kiểm tra loại điểm, tỷ lệ BTL và các cột giữa kỳ/cuối kỳ bị trùng.',
};
function mapped(failure:unknown){const e=asApiError(failure);return errors[e.code]?new ApiError(errors[e.code]!,e.code,e.status,e.fields):e;}
export function configurationBasis(value:ConfigurationBasis):ConfigurationBasis{
  if(!validGradeId(value.configurationId)||!Number.isSafeInteger(value.gradeVersion)||value.gradeVersion<0)throw new ApiError('Cần tải bảng điểm đã lưu trước khi sửa hoặc xóa.','INVALID_GRADE_QUERY');
  return {configurationId:value.configurationId.toLowerCase(),gradeVersion:value.gradeVersion};
}
export function parseSavedConfiguration(input:unknown,courseId:string):SavedConfiguration{
  if(!input||typeof input!=='object'||Array.isArray(input))throw bad();const v=input as Record<string,unknown>;
  if(!validGradeId(v.id)||!validGradeId(v.courseId)||v.courseId.toLowerCase()!==courseId.toLowerCase()||!Number.isSafeInteger(v.version)||Number(v.version)<0
    ||v.state!=='DRAFT'&&v.state!=='READY'||!Array.isArray(v.parts)||!Array.isArray(v.missingGroups))throw bad();
  const groups=v.missingGroups;if(groups.length>4||new Set(groups).size!==groups.length||groups.some(g=>!['REGULAR','MIDTERM','FINAL','PRACTICAL_COLUMNS'].includes(String(g)))||(v.state==='READY')!==(groups.length===0))throw bad();
  const weighted=v.parts.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item))throw bad();const p=item as Record<string,unknown>;
    if('score'in p||'remainderScore'in p||typeof p.weight!=='number'||!Number.isFinite(p.weight)||p.weight<0||p.weight>100
      ||!Number.isInteger(p.weightNumerator)||Number(p.weightNumerator)<1||Number(p.weightNumerator)>100
      ||!Number.isInteger(p.weightDenominator)||Number(p.weightDenominator)<1||Number(p.weightDenominator)>10)throw bad();
    return p;
  });
  let parsed:ConfigurationInput;
  try{parsed=configurationInput({assessment:v.assessment,parts:weighted.map(p=>({id:p.id,name:p.name,kind:p.kind,project:p.project}))} as ConfigurationInput);}catch{throw bad();}
  return {id:v.id.toLowerCase(),courseId:v.courseId.toLowerCase(),version:Number(v.version),assessment:parsed.assessment,state:v.state,
    missingGroups:groups as string[],parts:parsed.parts.map((p,i)=>({...p,weight:Number(weighted[i]!.weight),weightNumerator:Number(weighted[i]!.weightNumerator),weightDenominator:Number(weighted[i]!.weightDenominator)}))};
}
export function createGradeConfigurationsApi(baseUrl:string,authorized:Authorized,options?:Parameters<typeof createHttpClient>[1]){
  const http=createHttpClient(baseUrl,options),reads=createGradesReadApi(baseUrl,authorized,options);
  return {
    async save(course:CourseRef,input:ConfigurationInput,original?:ConfigurationBasis){
      courseGradeKey(course);const data=configurationInput(input),basis=original?configurationBasis(original):undefined;
      let raw:unknown;
      try{raw=await authorized(token=>http<unknown>(basis?'/api/v1/grade-configurations/'+encodeURIComponent(basis.configurationId):'/api/v1/courses/'+encodeURIComponent(course.id)+'/grade-configuration',{
        method:basis?'PUT':'POST',headers:{Authorization:`Bearer ${token}`},body:basis?{...data,version:basis.gradeVersion}:data}));}catch(e){throw mapped(e);}
      const saved=parseSavedConfiguration(raw,course.id);
      const body={assessment:saved.assessment,parts:saved.parts.map(p=>({id:p.id,name:p.name,kind:p.kind,...(p.project?{project:p.project}:{})}))};
      if(basis?(saved.id!==basis.configurationId||saved.version!==basis.gradeVersion+1):saved.version!==0)throw bad();
      if(JSON.stringify(body)!==JSON.stringify(data))throw bad();
      return saved;
    },
    async remove(course:CourseRef,original:ConfigurationBasis){
      courseGradeKey(course);const basis=configurationBasis(original);
      try{await authorized(token=>http<void>('/api/v1/grade-configurations/'+encodeURIComponent(basis.configurationId)+'?version='+basis.gradeVersion,{method:'DELETE',headers:{Authorization:`Bearer ${token}`},empty:true}));}catch(e){throw mapped(e);}
    },
    current:reads.detail,
  };
}
