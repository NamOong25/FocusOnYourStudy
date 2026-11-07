import {ApiError,asApiError,createHttpClient} from '../../../shared/api/http';
import type {Authorized} from '../../academics/api/semestersApi';
import {gradeScoresInput,scoreBasis,type ConfiguredGrade,type GradeScoresInput} from '../gradeScoresDraft';
import {courseGradeKey,type CourseRef} from './gradesReadApi';
import {parseSavedConfiguration} from './gradeConfigurationsApi';

export type SavedGradeScores={configurationId:string;courseId:string;version:number;hasScores:boolean;parts:GradeScoresInput['parts']};
const bad=()=>new ApiError('Chưa xác nhận được phản hồi lưu điểm. Kiểm tra điểm đã lưu trước khi gửi lại.','INVALID_RESPONSE');
function definition(parts:ConfiguredGrade['parts']){return parts.map(p=>({id:p.id,name:p.name,kind:p.kind,project:p.project??null,weight:p.weight,weightNumerator:p.weightNumerator,weightDenominator:p.weightDenominator}));}
export function parseSavedGradeScores(input:unknown,original:ConfiguredGrade,sent:GradeScoresInput):SavedGradeScores{
  if(!input||typeof input!=='object'||Array.isArray(input))throw bad();const v=input as Record<string,unknown>;
  if(!Array.isArray(v.parts)||v.parts.some(p=>!p||typeof p!=='object'||Array.isArray(p))||typeof v.hasScores!=='boolean')throw bad();
  const parts=v.parts as Record<string,unknown>[];
  const header=parseSavedConfiguration({id:v.configurationId,courseId:v.courseId,version:v.version,assessment:v.assessment,state:v.configurationState,missingGroups:v.missingGroups,
    parts:parts.map(p=>({id:p.id,name:p.name,kind:p.kind,project:p.project,weight:p.weight,weightNumerator:p.weightNumerator,weightDenominator:p.weightDenominator}))},original.courseId);
  if(header.id!==original.configurationId||header.version!==original.gradeVersion+1||header.assessment!==original.assessment||header.state!==original.configurationState
    ||JSON.stringify(header.missingGroups)!==JSON.stringify(original.result.missingGroups)||JSON.stringify(definition(header.parts as ConfiguredGrade['parts']))!==JSON.stringify(definition(original.parts)))throw bad();
  let values:GradeScoresInput;
  try{values=gradeScoresInput({parts:parts.map(p=>{if(!Object.prototype.hasOwnProperty.call(p,'score')||!Object.prototype.hasOwnProperty.call(p,'remainderScore'))throw bad();return {id:p.id,score:p.score,remainderScore:p.remainderScore};})} as GradeScoresInput,original);}catch{throw bad();}
  if(JSON.stringify(values)!==JSON.stringify(sent)||v.hasScores!==values.parts.some(p=>p.score!==null||p.remainderScore!==null))throw bad();
  return {configurationId:header.id,courseId:header.courseId,version:header.version,hasScores:v.hasScores,parts:values.parts};
}
export function createGradeScoresApi(baseUrl:string,authorized:Authorized,options?:Parameters<typeof createHttpClient>[1]){
  const http=createHttpClient(baseUrl,options);
  return {async save(course:CourseRef,input:GradeScoresInput,original:ConfiguredGrade){
    courseGradeKey(course);const basis=scoreBasis(original);if(basis.courseId.toLowerCase()!==course.id.toLowerCase())throw new ApiError('Bảng điểm không khớp môn đang mở.','INVALID_GRADE_QUERY');
    const data=gradeScoresInput(input,basis);let raw:unknown;
    try{raw=await authorized(token=>http<unknown>('/api/v1/grade-configurations/'+encodeURIComponent(basis.configurationId)+'/scores',{
      method:'PUT',headers:{Authorization:`Bearer ${token}`},body:{version:basis.gradeVersion,parts:data.parts}}));}
    catch(failure){const e=asApiError(failure);const messages:Record<string,string>={INVALID_GRADE_SCORES:'Bộ điểm chưa hợp lệ. Kiểm tra đủ cột, khoảng điểm và phần còn lại của BTL.',GRADE_CONFIGURATION_VERSION_CONFLICT:'Điểm hoặc bộ cột đã thay đổi ở nơi khác. Bản nháp của bạn vẫn được giữ.',GRADE_CONFIGURATION_NOT_FOUND:'Bảng điểm đã bị xóa hoặc thay thế. Cần đọc lại trước khi nhập tiếp.'};throw messages[e.code]?new ApiError(messages[e.code]!,e.code,e.status,e.fields):e;}
    return parseSavedGradeScores(raw,basis,data);
  }};
}
