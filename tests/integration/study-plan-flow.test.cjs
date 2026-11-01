// Run through backend/scripts/Test-StudyPlanFlow.ps1, never against a user server.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {createStudyPlansApi}=require('../../src/features/assistant/api/studyPlansApi.ts');
const {buildPlanCommand,createPlanApplicationsApi}=require('../../src/features/assistant/api/planApplicationsApi.ts');
const {PlanApplicationManager}=require('../../src/features/assistant/api/PlanApplicationManager.ts');
const {planDrafts}=require('../../src/features/assistant/api/planDrafts.ts');
const {planDay}=require('../../src/features/assistant/api/planTime.ts');
const {createStudyApi}=require('../../src/features/study/api/studyApi.ts');
const {StudyManager}=require('../../src/features/study/api/StudyManager.ts');
const {ApiError}=require('../../src/shared/api/http.ts');
const base=process.env.STUDY_PLAN_QA_BASE,schema=process.env.STUDY_PLAN_QA_SCHEMA;
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base??'')||new URL(base).port==='8080'||!/^qa_planflow8a3c_[a-f0-9]{32}$/.test(schema??''))throw Error('Use the isolated Test-StudyPlanFlow.ps1 runner.');
const dayOffset=(n)=>new Date(Date.parse(planDay(Date.now(),'Asia/Ho_Chi_Minh')+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
const zone='Asia/Ho_Chi_Minh',authorized=a=>async fn=>fn(a.token),clone=v=>JSON.parse(JSON.stringify(v));
const code=expected=>e=>e.code===expected;
const gate=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const memory=(initial=null)=>{let value=initial;return{read:async()=>value,write:async v=>{value=v;}};};
async function raw(route,method='GET',body,a){
 const r=await fetch(base+route,{method,headers:{'X-Auth-Transport':'body',...(body?{'Content-Type':'application/json'}:{}),...(a?{Authorization:'Bearer '+a.token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 const v=r.status===204?null:await r.json();if(!r.ok)throw new ApiError('QA API rejected request',v?.code??'HTTP_ERROR',r.status);return v?.data;
}
async function account(){const email='planflow-'+crypto.randomUUID()+'@example.test',password='PlanFlow!'+crypto.randomUUID();await raw('/api/v1/auth/register','POST',{email,password,confirmPassword:password,fullName:'Kiểm thử kế hoạch'});const login=await raw('/api/v1/auth/login','POST',{email,password});return{token:login.accessToken};}
async function fixture(){const a=await account(),term=await raw('/api/v1/semesters','POST',{term:1,startYear:Number(dayOffset(1).slice(0,4)),status:'CURRENT'},a),course=await raw('/api/v1/courses','POST',{semesterId:term.id,code:'REACT-QA',name:'Lập trình React',credits:3},a);return{a,term,course};}
const conditions=(f,patch={})=>({courseId:f.course.id,goal:'Ôn React',fromDate:dayOffset(1),toDate:dayOffset(6),timeZone:zone,availableStart:'19:00',availableEnd:'21:00',weekdays:[1,2,3,4,5,6,7],totalMinutes:180,sessionMinutes:45,breakMinutes:10,...patch});
async function proposal(f,patch={}){const input=conditions(f,patch),snapshot=await createStudyPlansApi(base,authorized(f.a)).preview(input);return{input,snapshot,drafts:planDrafts(snapshot)};}
const command=p=>buildPlanCommand(p.input,p.snapshot,p.drafts);
const applications=(a,options)=>createPlanApplicationsApi(base,authorized(a),options);
const studies=a=>createStudyApi(base,authorized(a));
async function manager(a,store=memory(),api=applications(a)){const m=new PlanApplicationManager(api,store);await m.restore();return m;}
async function task(f){return raw('/api/v1/assignments','POST',{courseId:f.course.id,title:'Bài tập lớn React',dueAt:dayOffset(6)+'T21:00:00+07:00',status:'TODO'},f.a);}
const taskInput=(t,patch)=>({...Object.fromEntries(['courseId','title','dueAt','priority','status','notes','version'].map(k=>[k,t[k]])),...patch});
const studyInput=(s,patch={})=>({courseId:s.courseId,assignmentId:s.assignmentId,title:s.title,startsAt:s.startsAt,timeZone:s.timeZone,durationMinutes:s.durationMinutes,status:s.status,notes:s.notes,version:s.version,...patch});

test('real preview → edit/deselect → atomic apply → current list; assignment stays unfinished',async()=>{
 const f=await fixture(),t=await task(f),p=await proposal(f,{assignmentId:t.id});assert.equal(p.drafts.length,4);
 p.drafts[0].title='Ôn React — buổi đã chỉnh';p.drafts[0].duration='30';p.drafts[3].selected=false;
 const m=await manager(f.a),r=await m.start(command(p));assert.equal(r.sessions.length,3);assert.equal(r.savedMinutes,120);assert.equal(r.remainingMinutes,60);
 const rows=await studies(f.a).list();assert.equal(rows.length,3);assert.equal(rows.reduce((n,s)=>n+s.duration,0),120);assert.ok(rows.every(s=>s.taskId===t.id&&s.status==='Đã lên lịch'));
 assert.ok(rows.some(s=>s.title==='Ôn React — buổi đã chỉnh'&&s.duration===30));assert.equal((await raw('/api/v1/assignments/'+t.id,'GET',null,f.a)).status,'TODO');
 const next=await proposal(f,{assignmentId:t.id});for(const s of next.snapshot.sessions)for(const old of rows)assert.ok(Date.parse(s.endsAt)<=Date.parse(old.startsAt)||Date.parse(s.startsAt)>=Date.parse(old.endsAt));
 m.dispose();
});
test('deadline changed after preview rejects the whole old selection; new preview honors new limit',async()=>{
 const f=await fixture(),t=await task(f),p=await proposal(f,{assignmentId:t.id}),c=command(p);
 await raw('/api/v1/assignments/'+t.id,'PUT',taskInput(t,{dueAt:dayOffset(1)+'T19:30:00+07:00'}),f.a);
 const m=await manager(f.a);await assert.rejects(m.start(c),code('STUDY_PLAN_SOURCE_CHANGED'));assert.equal(m.state.rejected,true);assert.equal((await studies(f.a).list()).length,0);
 const next=await proposal(f,{assignmentId:t.id});assert.equal(next.snapshot.sessions.length,0);assert.equal(next.snapshot.unscheduledMinutes,180);m.dispose();
});
test('a class added in another semester after preview blocks the entire group',async()=>{
 const f=await fixture(),p=await proposal(f),c=command(p),term=await raw('/api/v1/semesters','POST',{term:2,startYear:Number(dayOffset(1).slice(0,4)),status:'UPCOMING'},f.a),course=await raw('/api/v1/courses','POST',{semesterId:term.id,code:'JAVA-QA',name:'Java',credits:3},f.a);
 const weekday=new Date(dayOffset(1)+'T00:00:00Z').getUTCDay()||7;
 await raw('/api/v1/class-schedules','POST',{courseId:course.id,weekdays:[weekday],startsOn:dayOffset(1),endsOn:dayOffset(6),startTime:'19:00',endTime:'20:00',timeZone:zone},f.a);
 const m=await manager(f.a);await assert.rejects(m.start(c),code('STUDY_PLAN_TIME_CONFLICT'));assert.equal((await studies(f.a).list()).length,0);m.dispose();
});
test('lost response after a real commit → file restore → GET receipt, without a second POST',async()=>{
 const f=await fixture(),p=await proposal(f),c=command(p),folder=fs.mkdtempSync(path.join(os.tmpdir(),'planflow8a3c-')),file=path.join(folder,'recovery.json');let posts=0;
 const store={read:async()=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null,write:async v=>{if(v===null){if(fs.existsSync(file))fs.unlinkSync(file);}else fs.writeFileSync(file,v);}};
 const real=applications(f.a),api={get:real.get,apply:async body=>{posts++;await real.apply(body);throw new ApiError('Lost confirmation','REQUEST_TIMEOUT');}};
 let a,b;try{a=await manager(f.a,store,api);await assert.rejects(a.start(c));a.dispose();b=await manager(f.a,store,api);assert.equal(posts,1);assert.equal(b.state.command.clientRequestId,c.clientRequestId);await b.check();assert.equal(posts,1);assert.equal((await studies(f.a).list()).length,4);await b.acknowledge();assert.equal(await store.read(),null);}finally{a?.dispose();b?.dispose();const resolved=path.resolve(folder);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert.ok(path.basename(resolved).startsWith('planflow8a3c-'));fs.rmSync(resolved,{recursive:true,force:true});}
});
test('request never reached backend → GET 404 → explicit retry of exact body creates one group',async()=>{
 const f=await fixture(),c=command(await proposal(f)),real=applications(f.a);let attempts=0;const sent=[];
 const api={get:real.get,apply:async body=>{sent.push(clone(body));if(++attempts===1)throw new ApiError('Offline before send','NETWORK_ERROR');return real.apply(body);}};
 const m=await manager(f.a,memory(),api);await assert.rejects(m.start(c));await assert.rejects(m.check(),code('STUDY_PLAN_APPLICATION_NOT_FOUND'));assert.equal(m.state.missing,true);assert.equal((await studies(f.a).list()).length,0);
 await m.retry();assert.deepEqual(sent[0],sent[1]);assert.equal((await studies(f.a).list()).length,4);m.dispose();
});
test('GET 404 while first request is still pending → same-key concurrent retry never duplicates',async()=>{
 const f=await fixture(),c=command(await proposal(f)),real=applications(f.a),hold=gate(),started=gate(),store=memory();let posts=0;
 const delayed={get:real.get,apply:async body=>{posts++;started.resolve();await hold.promise;return real.apply(body);}};
 const a=await manager(f.a,store,delayed),first=a.start(c),firstHandled=first.catch(e=>e);await started.promise;a.dispose();
 const b=await manager(f.a,store,{get:real.get,apply:async body=>{posts++;return real.apply(body);}});await assert.rejects(b.check(),code('STUDY_PLAN_APPLICATION_NOT_FOUND'));
 hold.resolve();await b.retry();assert.equal((await firstHandled).code,'REQUEST_CANCELLED');assert.equal(posts,2);assert.equal((await studies(f.a).list()).length,4);assert.equal((await real.get(c)).applicationId,b.state.receipt.applicationId);b.dispose();
});
test('edited/deleted saved sessions stay current after historical receipt restore/replay',async()=>{
 const f=await fixture(),c=command(await proposal(f)),api=applications(f.a),r=await api.apply(c),first=r.sessions[0].session,second=r.sessions[1].session;
 await raw('/api/v1/study-sessions/'+first.id,'PUT',studyInput(first,{title:'Tên đã sửa sau khi lưu',status:'COMPLETED'}),f.a);
 await raw('/api/v1/study-sessions/'+second.id+'?version=0','DELETE',null,f.a);
 const store=memory(JSON.stringify({v:1,command:c,receipt:r,rejected:false})),m=await manager(f.a,store);assert.equal(m.state.receipt.sessions.length,4);
 assert.deepEqual(await api.get(c),r);assert.deepEqual(await api.apply(c),r);
 const list=new StudyManager(studies(f.a));await list.reloadFresh();assert.equal(list.state.sessions.length,3);assert.ok(!list.state.sessions.some(s=>s.id===second.id));assert.ok(list.state.sessions.some(s=>s.id===first.id&&s.title==='Tên đã sửa sau khi lưu'&&s.status==='Hoàn thành'));
 list.dispose();m.dispose();
});
test('A/B data and receipt ownership remain isolated, including independent identical keys',async()=>{
 const a=await fixture(),b=await fixture(),ca=command(await proposal(a)),cb=command(await proposal(b));cb.clientRequestId=ca.clientRequestId;
 const ma=await manager(a.a),mb=await manager(b.a);await ma.start(ca);assert.equal((await studies(b.a).list()).length,0);await assert.rejects(applications(b.a).get(ca),code('STUDY_PLAN_APPLICATION_NOT_FOUND'));
 await mb.start(cb);assert.notEqual(ma.state.receipt.applicationId,mb.state.receipt.applicationId);assert.equal((await studies(a.a).list()).length,4);assert.equal((await studies(b.a).list()).length,4);ma.dispose();mb.dispose();
});
test('exam target keeps its true cutoff and metadata while saving independent study rows',async()=>{
 const f=await fixture(),e=await raw('/api/v1/exams','POST',{courseId:f.course.id,kind:'FINAL',format:'PRACTICAL',startsAt:dayOffset(1)+'T20:00:00+07:00',endsAt:dayOffset(1)+'T21:00:00+07:00',timeZone:zone,reminder:false,reminderMinutes:[]},f.a),p=await proposal(f,{examId:e.id});
 assert.equal(p.snapshot.sessions.length,1);const r=await applications(f.a).apply(command(p));assert.equal(r.target.kind,'EXAM');assert.equal(r.target.id,e.id);assert.equal(r.savedMinutes,45);assert.equal(r.remainingMinutes,135);assert.equal(r.sessions[0].session.assignmentId,null);
 assert.ok(Date.parse(r.sessions[0].session.endsAt)<=Date.parse(e.startsAt));
});
test('an actual pre-commit HTTP response cannot satisfy the post-commit list refresh',async()=>{
 const f=await fixture(),c=command(await proposal(f)),hold=gate(),captured=gate();let reads=0;
 const api=createStudyApi(base,authorized(f.a),{fetcher:async(...args)=>{const response=await fetch(...args);if(++reads===1){await response.clone().json();captured.resolve();await hold.promise;}return response;}});
 const list=new StudyManager(api),before=list.reload();await captured.promise;const receipt=await applications(f.a).apply(c),after=list.reloadFresh();hold.resolve();await before;const rows=await after;
 assert.equal(reads,2);assert.equal(rows.length,receipt.sessions.length);assert.equal(rows.length,4);list.dispose();
});
