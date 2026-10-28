import {ApiError,createHttpClient} from '../../../shared/api/http';
import type {Authorized} from '../../academics/api/semestersApi';
import {core,courseGradeKey,validGradeId,type CourseRef,type ResultCore} from './gradesReadApi';

export type CumulativeQuery={semesters:{id:string;version:number}[];courses:CourseRef[]};
export type CumulativeUse='SELECTED'|'PENDING_RESULT'|'GROUP_REQUIRES_REVIEW'|'NOT_SELECTED_LOWER_PASS'|'NOT_SELECTED_OLDER_TIE'|'NOT_SELECTED_FAILED_ATTEMPT'|'NOT_SELECTED_OLDER_F';
export type CumulativeAttempt={id:string;name:string;semesterId:string;semesterName:string;academicYear:string;term:number;result:ResultCore;use:CumulativeUse};
export type CumulativeGroup={key:string;code:string;credits:number;included:boolean;selectedCourseId:string|null;reason:'HIGHEST_PASS'|'LATEST_COMPLETE_F'|'NO_COMPLETE_RESULT'|'REVIEW_REQUIRED';pendingAttempts:number;issues:string[];otherCredits:number[];attempts:CumulativeAttempt[]};
export type CumulativeGpa={groups:CumulativeGroup[];summary:{state:'EMPTY'|'NO_RESULTS'|'PARTIAL'|'COMPLETE';complete:boolean;gpa:number|null;weightedGradePoints:number;calculatedCredits:number;earnedCredits:number;failedCredits:number;registeredGroups:number;recordedAttempts:number;repeatedGroups:number;calculatedGroups:number;passedGroups:number;failedGroups:number;excludedGroups:number;reviewGroups:number;pendingAttempts:number}};
const invalid=()=>new ApiError('Phản hồi GPA tích lũy chưa hợp lệ. Hãy tải lại.','INVALID_RESPONSE');
const changed=()=>new ApiError('Danh sách học kỳ hoặc môn đã thay đổi. Tải lại để xem đúng GPA tích lũy.','GRADE_CATALOG_CHANGED');
const object=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw invalid();return v as Record<string,unknown>;};
const array=(v:unknown,max=10000):unknown[]=>{if(!Array.isArray(v)||v.length>max)throw invalid();return v;};
const count=(v:unknown):number=>{if(!Number.isSafeInteger(v)||Number(v)<0)throw invalid();return Number(v);};
const text=(v:unknown,max=200):string=>{if(typeof v!=='string'||!v.trim()||v.length>max)throw invalid();return v;};
const id=(v:unknown):string=>{if(!validGradeId(v))throw invalid();return v.toLowerCase();};
const choice=<T extends string>(v:unknown,values:readonly T[]):T=>{if(typeof v!=='string'||!values.includes(v as T))throw invalid();return v as T;};
const amount=(v:unknown,max=Number.MAX_SAFE_INTEGER):number=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>max)throw invalid();return v;};
export function cumulativeKey(q:CumulativeQuery){
  if(!q||!Array.isArray(q.semesters)||!Array.isArray(q.courses))throw new ApiError('Cần tải danh sách học kỳ và môn trước.','INVALID_GRADE_QUERY');
  const semesters=q.semesters.map(s=>{if(!validGradeId(s.id)||!Number.isSafeInteger(s.version)||s.version<0)throw new ApiError('Học kỳ chưa hợp lệ.','INVALID_GRADE_QUERY');return[s.id.toLowerCase(),s.version];});
  const ids=new Set(semesters.map(s=>s[0]));
  const courses=q.courses.map(c=>{const key=courseGradeKey(c);if(!ids.has(c.semesterId.toLowerCase()))throw new ApiError('Môn không thuộc học kỳ đã tải.','INVALID_GRADE_QUERY');return key;});
  if(ids.size!==semesters.length||new Set(q.courses.map(c=>c.id.toLowerCase())).size!==q.courses.length)throw new ApiError('Danh mục bị trùng.','INVALID_GRADE_QUERY');
  return JSON.stringify([semesters.sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),courses.sort()]);
}
export function parseCumulativeGpa(input:unknown,q:CumulativeQuery):CumulativeGpa{
  cumulativeKey(q);const root=object(input),policy=object(root.policy),summary=object(root.summary),expected=new Map(q.courses.map(c=>[c.id.toLowerCase(),c])),periods=new Map(q.semesters.map(s=>[s.id.toLowerCase(),s.version]));
  const required={id:'APP_CUMULATIVE_HIGHEST_PASS_V1',authority:'USER_CONFIRMED_APP_RULES',officialIuhCumulativeVerified:false,scope:'RECORDED_NUMERIC_THEORY_PRACTICAL_COURSES',coursePolicyId:'IUH_2023_REPORTED_V1',historyPolicyId:'COURSE_ATTEMPTS_V1',selection:'HIGHEST_PASSED_TOTAL_10',tieBreak:'LATEST_ACADEMIC_YEAR_THEN_TERM',noPassRule:'LATEST_COMPLETE_F_WITH_ZERO_POINTS_AND_FULL_CREDITS',decimals:2,rounding:'HALF_UP'};
  if(Object.entries(required).some(([k,v])=>policy[k]!==v))throw invalid();
  const seen=new Set<string>();
  const groups=array(root.groups).map(raw=>{
    const g=object(raw),h=object(g.history),code=text(h.code,64),credits=count(h.credits);if(credits<1||credits>30||typeof g.included!=='boolean'||typeof h.needsReview!=='boolean')throw invalid();
    const issues=array(h.issues,3).map(v=>choice(v,['CREDIT_VARIANTS','ASSESSMENT_VARIANTS','AMBIGUOUS_PERIOD'] as const));if(new Set(issues).size!==issues.length||h.needsReview!==(issues.length>0))throw invalid();
    const otherCredits=array(h.otherCreditVariants,30).map(v=>{const variant=object(v),n=count(variant.credits);if(n<1||n>30)throw invalid();for(const c of array(variant.courseIds)){if(!expected.has(id(c)))throw changed();}return n;});
    const decisions=new Map<string,CumulativeUse>();for(const item of array(g.decisions)){const d=object(item),key=id(d.courseId);if(decisions.has(key))throw invalid();decisions.set(key,choice(d.use,['SELECTED','PENDING_RESULT','GROUP_REQUIRES_REVIEW','NOT_SELECTED_LOWER_PASS','NOT_SELECTED_OLDER_TIE','NOT_SELECTED_FAILED_ATTEMPT','NOT_SELECTED_OLDER_F'] as const));}
    const attempts=array(h.attempts).map(rawAttempt=>{
      const a=object(rawAttempt),s=object(a.semester),c=object(a.course),courseId=id(c.id),semesterId=id(s.id),local=expected.get(courseId);
      if(seen.has(courseId))throw invalid();seen.add(courseId);
      if(!local||local.semesterId.toLowerCase()!==semesterId||local.version!==c.version||local.credits!==c.credits||periods.get(semesterId)!==s.version)throw changed();
      if(c.credits!==credits||![1,2,3].includes(Number(s.term)))throw invalid();
      const configurationId=c.configurationId===null?null:id(c.configurationId);
      if(configurationId===null?(c.gradeVersion!==null||c.assessment!==null):(!Number.isSafeInteger(c.gradeVersion)||Number(c.gradeVersion)<0||!['THEORY','PRACTICAL'].includes(String(c.assessment))))throw invalid();
      const result=core(c,c.resultStatus,c.resultReason);if(configurationId===null?(result.status!==null||result.reason!=='NO_CONFIGURATION'):result.status===null)throw invalid();
      const use=decisions.get(courseId);if(!use)throw invalid();
      return{id:courseId,name:text(c.name),semesterId,semesterName:text(s.name,100),academicYear:text(s.academicYear,50),term:Number(s.term),result,use};
    });
    if(!attempts.length||decisions.size!==attempts.length)throw invalid();
    const selectedCourseId=g.selectedCourseId===null?null:id(g.selectedCourseId),selected=attempts.find(a=>a.id===selectedCourseId),selectedCount=attempts.filter(a=>a.use==='SELECTED').length;
    const reason=choice(g.reason,['HIGHEST_PASS','LATEST_COMPLETE_F','NO_COMPLETE_RESULT','REVIEW_REQUIRED'] as const),pendingAttempts=count(g.pendingAttempts);
    if(pendingAttempts>attempts.length||(g.included?( !selected||!selected.result.complete||selected.use!=='SELECTED'||selectedCount!==1||h.needsReview||!['HIGHEST_PASS','LATEST_COMPLETE_F'].includes(reason)):(selectedCourseId!==null||selectedCount!==0||!['NO_COMPLETE_RESULT','REVIEW_REQUIRED'].includes(reason))))throw invalid();
    if(h.needsReview!==(reason==='REVIEW_REQUIRED')||reason==='HIGHEST_PASS'&&selected?.result.passed!==true||reason==='LATEST_COMPLETE_F'&&(selected?.result.passed!==false||selected.result.gradePoint!==0))throw invalid();
    if(g.included)amount(g.weightedGradePoints,credits*4);else if(g.weightedGradePoints!==null)throw invalid();
    return{key:JSON.stringify([code,credits]),code,credits,included:g.included,selectedCourseId,reason,pendingAttempts,issues,otherCredits,attempts};
  });
  if(seen.size!==expected.size)throw changed();if(new Set(groups.map(g=>g.key)).size!==groups.length)throw invalid();
  const state=choice(summary.state,['EMPTY','NO_RESULTS','PARTIAL','COMPLETE'] as const),gpa=summary.gpa===null?null:amount(summary.gpa,4);
  const fields=['calculatedCredits','earnedCredits','failedCredits','registeredGroups','recordedAttempts','repeatedGroups','calculatedGroups','passedGroups','failedGroups','excludedGroups','reviewGroups','pendingAttempts'] as const;
  const values=Object.fromEntries(fields.map(k=>[k,count(summary[k])])) as Record<typeof fields[number],number>;
  if(typeof summary.complete!=='boolean'||summary.complete!==(state==='COMPLETE')||values.registeredGroups!==groups.length||values.recordedAttempts!==seen.size||values.calculatedGroups!==groups.filter(g=>g.included).length||values.excludedGroups+values.calculatedGroups!==groups.length||values.passedGroups+values.failedGroups!==values.calculatedGroups||values.earnedCredits+values.failedCredits!==values.calculatedCredits||(values.calculatedCredits===0)!==(gpa===null)||values.reviewGroups!==groups.filter(g=>g.reason==='REVIEW_REQUIRED').length||values.pendingAttempts!==groups.reduce((sum,g)=>sum+g.pendingAttempts,0))throw invalid();
  if(state!==(groups.length===0?'EMPTY':values.calculatedGroups===0?'NO_RESULTS':values.excludedGroups>0||values.pendingAttempts>0?'PARTIAL':'COMPLETE'))throw invalid();
  return{groups,summary:{...values,state,complete:summary.complete,gpa,weightedGradePoints:amount(summary.weightedGradePoints)}};
}
export function createCumulativeGpaApi(baseUrl:string,authorized:Authorized,options?:Parameters<typeof createHttpClient>[1]){
  const http=createHttpClient(baseUrl,options);return{async read(query:CumulativeQuery,signal?:AbortSignal){cumulativeKey(query);const raw=await authorized(token=>http<unknown>('/api/v1/gpa/cumulative',{headers:{Authorization:`Bearer ${token}`},signal}),signal);return parseCumulativeGpa(raw,query);}};
}
