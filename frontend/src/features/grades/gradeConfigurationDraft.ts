import { ApiError } from '../../shared/api/http';
import { gradeAssessments, type Assessment, type ServerGradeDetail } from './api/gradesReadApi';

export const configurationKinds = ['REGULAR','REGULAR_TEST','MIDTERM','PRACTICE_REGULAR','PRACTICE_TEST','FINAL','PROJECT'] as const;
export type ConfigurationKind = typeof configurationKinds[number];
export type ConfigurationPart = {id:string;name:string;kind:ConfigurationKind;project?:{target:'PRACTICE'|'FINAL';share:number}|null};
export type ConfigurationInput = {assessment:Assessment;theoryCredits?:number;practiceCredits?:number;parts:ConfigurationPart[]};
export type ConfigurationDraft = {assessment:Assessment;theoryCredits?:string;practiceCredits?:string;parts:{id:string;name:string;kind:ConfigurationKind;project:{target:'PRACTICE'|'FINAL';share:string}|null}[]};
const fail=(message:string,field='parts'):never=>{throw new ApiError(message,'INVALID_GRADE_CONFIGURATION',0,{[field]:message});};
function object(value:unknown):Record<string,unknown>{if(!value||typeof value!=='object'||Array.isArray(value))fail('Cấu hình cột điểm chưa hợp lệ.');return value as Record<string,unknown>;}
function only(value:Record<string,unknown>,keys:string[]){if(Object.keys(value).some(key=>!keys.includes(key)))fail('Chỉ gửi cấu hình cột; điểm số và trọng số không thuộc biểu mẫu này.');}
export function allowedConfigurationKinds(assessment:Assessment):readonly ConfigurationKind[]{
  if(assessment==='INTEGRATED')return configurationKinds;
  return assessment==='THEORY'?['REGULAR','REGULAR_TEST','MIDTERM','FINAL','PROJECT']:['PRACTICE_REGULAR','PRACTICE_TEST','MIDTERM','FINAL','PROJECT'];
}
export function configurationInput(value:ConfigurationInput,courseCredits?:number):ConfigurationInput {
  const v=object(value);only(v,['assessment','parts','theoryCredits','practiceCredits']);
  if(!gradeAssessments.includes(v.assessment as Assessment))fail('Chọn loại học phần.','assessment');
  const assessment=v.assessment as Assessment;
  const theoryCredits=Number(v.theoryCredits),practiceCredits=Number(v.practiceCredits);
  if(assessment==='INTEGRATED'){
    if(!Number.isInteger(v.theoryCredits)||!Number.isInteger(v.practiceCredits)||theoryCredits<1||practiceCredits<1||theoryCredits+practiceCredits>30)
      fail('Nhập tín chỉ lý thuyết và thực hành là số nguyên dương.','theoryCredits');
    if(courseCredits!==undefined&&theoryCredits+practiceCredits!==courseCredits)
      fail('Tổng tín chỉ lý thuyết và thực hành phải bằng số tín chỉ của môn.','theoryCredits');
  }else if(v.theoryCredits!==undefined||v.practiceCredits!==undefined)fail('Chỉ học phần tích hợp cần tín chỉ từng phần.','theoryCredits');
  if(!Array.isArray(v.parts)||v.parts.length>10)fail('Mỗi bảng điểm có tối đa 10 cột.');
  const keys=new Set<string>();let finals=0,mids=0;
  const parts=(v.parts as unknown[]).map((item,i):ConfigurationPart=>{
    const p=object(item),field=`parts[${i}]`;only(p,['id','name','kind','project']);
    if(typeof p.id!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(p.id)||keys.has(p.id))fail('Mỗi cột cần một mã riêng hợp lệ.',field+'.id');
    const id=p.id as string;keys.add(id);
    if(typeof p.name!=='string'||!p.name.trim()||p.name.trim().length>200)fail(`Nhập tên cột ${i+1}, tối đa 200 ký tự.`,field+'.name');
    if(!allowedConfigurationKinds(assessment).includes(p.kind as ConfigurationKind))fail(`Chọn loại cột ${i+1} phù hợp với học phần.`,field+'.kind');
    const kind=p.kind as ConfigurationKind;let project:ConfigurationPart['project']=null;
    if(kind==='PROJECT'){
      const pr=object(p.project);only(pr,['target','share']);
      if(pr.target!=='PRACTICE'&&pr.target!=='FINAL')fail(`Chọn cách quy bài tập lớn ở cột ${i+1}.`,field+'.project.target');
      if(typeof pr.share!=='number'||!Number.isFinite(pr.share)||pr.share<=0||pr.share>100||!/^\d{1,3}(?:\.\d{1,4})?$/.test(String(pr.share)))fail(`Tỷ lệ BTL cột ${i+1} phải lớn hơn 0, không quá 100%, tối đa 4 số thập phân.`,field+'.project.share');
      if(pr.target==='PRACTICE'&&(assessment==='THEORY'||pr.share!==100))fail('BTL thay một cột thực hành phải thuộc học phần có thực hành và chiếm 100% cột đó.',field+'.project');
      project={target:pr.target as 'PRACTICE'|'FINAL',share:pr.share as number};
    }else if(p.project!==undefined&&p.project!==null)fail('Chỉ cột Bài tập lớn có cấu hình quy đổi.',field+'.project');
    if(kind==='FINAL'||project?.target==='FINAL')finals++;
    if(kind==='MIDTERM')mids++;
    return {id,name:(p.name as string).trim(),kind,...(project?{project}:{})};
  });
  if(finals>1)fail('Chỉ một cột làm điểm cuối kỳ; BTL làm hoặc góp vào cuối kỳ thay cho cột cuối kỳ riêng.');
  if(assessment!=='PRACTICAL'&&mids>1)fail('Phần lý thuyết chỉ có một cột giữa kỳ.');
  return {assessment,...(assessment==='INTEGRATED'?{theoryCredits,practiceCredits}:{}),parts};
}
export function draftFromDetail(detail:ServerGradeDetail):ConfigurationDraft {
  return detail.kind==='unconfigured'?{assessment:'THEORY',parts:[]}:draftFromInput({
    assessment:detail.assessment,theoryCredits:detail.theoryCredits,practiceCredits:detail.practiceCredits,
    parts:detail.parts.map(p=>({id:p.id,name:p.name,kind:p.kind as ConfigurationKind,project:p.project})),
  });
}
export function inputFromDraft(draft:ConfigurationDraft,courseCredits?:number):ConfigurationInput {
  return configurationInput({assessment:draft.assessment,
    ...(draft.assessment==='INTEGRATED'?{theoryCredits:Number(draft.theoryCredits),practiceCredits:Number(draft.practiceCredits)}:{}),
    parts:draft.parts.map(p=>({id:p.id,name:p.name,kind:p.kind,...(p.project?{project:{target:p.project.target,share:/^\d+(?:[.,]\d{1,4})?$/.test(p.project.share.trim())?Number(p.project.share.trim().replace(',','.')):NaN}}:{})}))},courseCredits);
}
export function draftFromInput(input:ConfigurationInput):ConfigurationDraft {
  return {assessment:input.assessment,...(input.assessment==='INTEGRATED'?{theoryCredits:String(input.theoryCredits??''),practiceCredits:String(input.practiceCredits??'')}:{}),
    parts:input.parts.map(p=>({...p,project:p.project?{target:p.project.target,share:String(p.project.share)}:null}))};
}
let sequence=0;
export function newConfigurationPart(kind:ConfigurationKind='REGULAR',name='Cột điểm mới'):ConfigurationDraft['parts'][number]{
  return {id:`col_${Date.now().toString(36)}_${(++sequence).toString(36)}_${Math.random().toString(36).slice(2,8)}`,name,kind,project:kind==='PROJECT'?{target:'FINAL',share:''}:null};
}
export function suggestedConfiguration(assessment:Assessment):ConfigurationDraft {
  const numbered = (kind:ConfigurationKind, name:string) =>
    Array.from({length:3},(_,i)=>newConfigurationPart(kind,`${name} ${i+1}`));
  const parts = assessment==='THEORY'
    ? numbered('REGULAR','Điểm thường kỳ')
    : [...numbered(assessment==='INTEGRATED'?'REGULAR':'PRACTICE_REGULAR','Thường xuyên'), ...numbered('PRACTICE_TEST','Thực hành')];
  return {assessment,...(assessment==='INTEGRATED'?{theoryCredits:'',practiceCredits:''}:{}),
    parts:[...parts,newConfigurationPart('MIDTERM','Giữa kỳ'),newConfigurationPart('FINAL','Cuối kỳ')]};
}
export function changeConfigurationAssessment(draft:ConfigurationDraft,assessment:Assessment):ConfigurationDraft {
  if(assessment==='INTEGRATED')return {assessment,theoryCredits:draft.theoryCredits??'',practiceCredits:draft.practiceCredits??'',parts:draft.parts};
  return {assessment,parts:draft.parts.map(p=>({...p,kind:assessment==='THEORY'?(p.kind==='PRACTICE_REGULAR'?'REGULAR':p.kind==='PRACTICE_TEST'?'REGULAR_TEST':p.kind):(p.kind==='REGULAR'?'PRACTICE_REGULAR':p.kind==='REGULAR_TEST'?'PRACTICE_TEST':p.kind),project:p.project?assessment==='THEORY'&&p.project.target==='PRACTICE'?{target:'FINAL',share:''}:{...p.project}:null}))};
}
export function scoredConfigurationColumns(detail:ServerGradeDetail):Set<string>{return new Set(detail.kind==='configured'?detail.parts.filter(p=>p.score!==null||p.remainderScore!==null).map(p=>p.id):[]);}
export const configurationDraftKey=(draft:ConfigurationDraft)=>JSON.stringify(draft);
