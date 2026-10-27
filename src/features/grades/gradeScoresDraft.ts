import {ApiError} from '../../shared/api/http';
import {configurationInput,type ConfigurationKind} from './gradeConfigurationDraft';
import {validGradeId,type ServerGradeDetail} from './api/gradesReadApi';

export type ConfiguredGrade=Extract<ServerGradeDetail,{kind:'configured'}>;
export type GradeScoresInput={parts:{id:string;score:number|null;remainderScore:number|null}[]};
export type GradeScoresDraft={parts:{id:string;score:string;remainderScore:string}[]};
const fail=(message:string,field='parts'):never=>{throw new ApiError(message,'INVALID_GRADE_SCORES',0,{[field]:message});};
const own=(v:Record<string,unknown>,key:string)=>Object.prototype.hasOwnProperty.call(v,key);
function object(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))fail('Dữ liệu điểm chưa hợp lệ.');return v as Record<string,unknown>;}
export const hasRemainder=(p:ConfiguredGrade['parts'][number])=>p.kind==='PROJECT'&&p.project?.target==='FINAL'&&p.project.share<100;
function value(v:unknown,field:string):number|null{
  if(v===null)return null;
  if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10||!/^\d{1,2}(?:\.\d{1,4})?$/.test(String(v)))fail('Điểm phải từ 0 đến 10, tối đa 4 số thập phân.',field);
  return v===0?0:v as number;
}
export function scoreBasis(original:ServerGradeDetail):ConfiguredGrade{
  if(original.kind!=='configured'||!validGradeId(original.configurationId)||!validGradeId(original.courseId)||!Number.isSafeInteger(original.gradeVersion)||original.gradeVersion<0)
    throw new ApiError('Cần tải bộ cột đã lưu trước khi nhập điểm.','INVALID_GRADE_QUERY');
  configurationInput({assessment:original.assessment,parts:original.parts.map(p=>({id:p.id,name:p.name,kind:p.kind as ConfigurationKind,...(p.project?{project:p.project}:{})}))});
  original.parts.forEach((p,i)=>{value(p.score,`parts[${i}].score`);value(p.remainderScore,`parts[${i}].remainderScore`);if(!hasRemainder(p)&&p.remainderScore!==null)fail('Cột này không dùng điểm phần còn lại.',`parts[${i}].remainderScore`);});
  return original;
}
export function gradeScoresInput(input:GradeScoresInput,original:ServerGradeDetail):GradeScoresInput{
  const basis=scoreBasis(original),v=object(input);
  if(Object.keys(v).some(k=>k!=='parts')||!Array.isArray(v.parts)||v.parts.length!==basis.parts.length)fail('Gửi đủ bộ cột đã lưu; không gửi cấu hình hoặc trường khác qua biểu mẫu điểm.');
  const items=new Map<string,{id:string;score:number|null;remainderScore:number|null}>();
  (v.parts as unknown[]).forEach((part,i)=>{
    const p=object(part);if(Object.keys(p).some(k=>!['id','score','remainderScore'].includes(k))||!own(p,'score')||!own(p,'remainderScore')||typeof p.id!=='string'||items.has(p.id))fail('Mỗi cột cần đúng mã và đủ hai trường điểm; dùng trống để chưa nhập hoặc xóa điểm.');
    const column=basis.parts.find(c=>c.id===p.id);if(!column)fail('Có cột không còn thuộc bảng điểm. Đọc lại bộ cột trước khi lưu.');
    const score=value(p.score,`parts[${i}].score`),remainderScore=value(p.remainderScore,`parts[${i}].remainderScore`);
    if(!hasRemainder(column!)&&remainderScore!==null)fail('Chỉ BTL góp một phần cuối kỳ mới nhập điểm phần còn lại.',`parts[${i}].remainderScore`);
    items.set(p.id as string,{id:p.id as string,score,remainderScore});
  });
  if(items.size!==basis.parts.length||basis.parts.some(p=>!items.has(p.id)))fail('Bộ cột điểm chưa khớp dữ liệu đã lưu.');
  return {parts:basis.parts.map(p=>items.get(p.id)!)};
}
export function draftFromScores(original:ConfiguredGrade):GradeScoresDraft{return {parts:original.parts.map(p=>({id:p.id,score:p.score===null?'':String(p.score),remainderScore:p.remainderScore===null?'':String(p.remainderScore)}))};}
export function draftFromScoreInput(input:GradeScoresInput):GradeScoresDraft{return {parts:input.parts.map(p=>({id:p.id,score:p.score===null?'':String(p.score),remainderScore:p.remainderScore===null?'':String(p.remainderScore)}))};}
function entered(text:string,field:string){const s=text.trim();if(!s)return null;if(!/^\d+(?:[.,]\d{1,4})?$/.test(s))fail('Nhập điểm 0–10, tối đa 4 số thập phân; để trống khi chưa có điểm.',field);return value(Number(s.replace(',','.')),field);}
export function inputFromScoresDraft(draft:GradeScoresDraft,basis:ConfiguredGrade):GradeScoresInput{
  return gradeScoresInput({parts:draft.parts.map((p,i)=>({id:p.id,score:entered(p.score,`parts[${i}].score`),remainderScore:entered(p.remainderScore,`parts[${i}].remainderScore`)}))},basis);
}
export function matchingSavedScores(current:ServerGradeDetail,original:ServerGradeDetail,input?:GradeScoresInput){
  if(!input||current.kind!=='configured'||original.kind!=='configured'||current.configurationId!==original.configurationId)return false;
  const saved=new Map(current.parts.map(p=>[p.id,p]));return current.parts.length===input.parts.length&&input.parts.every(p=>{const c=saved.get(p.id);return c&&c.score===p.score&&c.remainderScore===p.remainderScore;});
}
export const scoresDraftKey=(draft:GradeScoresDraft)=>JSON.stringify(draft);
