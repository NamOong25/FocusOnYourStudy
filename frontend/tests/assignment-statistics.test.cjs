const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {instantMicros}=require('../src/shared/utils/instantMicros.ts');
const {assignmentStatisticsKey,parseAssignmentStatistics,createAssignmentStatisticsApi}=require('../src/features/statistics/api/assignmentStatisticsApi.ts');
const {assignmentGroup,createAssignmentStatisticsLink,filterStatisticsAssignments,statisticsTaskTiming,statisticsTimeLabel}=require('../src/features/assignments/assignmentStatisticsLink.ts');
const {PomodoroReadManager,visiblePomodoroRead}=require('../src/features/focus/api/PomodoroReadManager.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,code=c=>e=>e.code===c;
const q={semesterId:id(1),timeZone:'Asia/Ho_Chi_Minh'};
function sample(overrides={}){return{semesterId:q.semesterId,courseId:null,asOf:'2026-10-28T18:00:00.123456Z',date:'2026-10-29',timeZone:q.timeZone,dueSoonThrough:'2026-11-04T18:00:00.123456Z',totalAssignments:5,todoAssignments:2,inProgressAssignments:1,completedAssignments:2,pendingAssignments:3,overdueAssignments:1,notDueAssignments:2,dueSoonAssignments:1,completionPercent:40,...overrides};}
const parse=(v=sample(),query=q)=>parseAssignmentStatistics(v,query);
const filters={query:'',status:'Tất cả',courseId:'',deadline:'Tất cả'};
const c=(n=2,semesterId=id(1))=>({id:id(n),semesterId,code:'JAVA',name:'Cùng tên môn'});
const task=(n,status='Chưa làm',dueAt='2026-10-28T18:00:00.123456Z',courseId=id(2))=>({id:id(n),courseId,course:'Cùng tên môn',title:`Bài ${n}`,status,dueAt,deadline:'2026-10-28',deadlineTime:'18:00',priority:'Trung bình',notes:'',version:0});
const link=(group='ALL',value=parse())=>createAssignmentStatisticsLink(value,group);
const scope=[c(),c(3,id(4))];
const response=data=>new Response(JSON.stringify({data,meta:{requestId:'qa'}}),{status:200,headers:{'Content-Type':'application/json'}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};

test('microseconds preserve one-microsecond differences and equivalent offsets',()=>{
 assert.equal(instantMicros('2026-10-28T18:00:00.123456Z')-instantMicros('2026-10-28T18:00:00.123455Z'),1);
 assert.equal(instantMicros('2026-10-29T01:00:00.123456+07:00'),instantMicros('2026-10-28T18:00:00.123456Z'));
 assert.equal(instantMicros('2026-10-28T14:00:00.1-04:00'),instantMicros('2026-10-28T18:00:00.100000Z'));
});
test('impossible dates, normalized times, offsets and excess precision do not silently normalize',()=>{
 for(const v of [null,'2026-02-30T00:00:00Z','2026-01-01T24:00:00Z','2026-01-01T00:00:60Z','2026-01-01T00:00:00+18:01','2026-01-01T00:00:00+00:60','2026-01-01T00:00:00.1234567Z','2026-10-29','2026-10-29T12:00:00'])assert.equal(instantMicros(v),null,String(v));
});
test('query requires explicit semester and normalizes UUID keys',()=>{
 assert.equal(assignmentStatisticsKey({...q,semesterId:q.semesterId.toUpperCase()}),assignmentStatisticsKey(q));
 assert.notEqual(assignmentStatisticsKey({...q,courseId:id(2)}),assignmentStatisticsKey(q));
 for(const v of [null,{...q,semesterId:''},{...q,courseId:'bad'},{...q,timeZone:'Bad/Zone'}])assert.throws(()=>assignmentStatisticsKey(v),code('INVALID_ASSIGNMENT_STATISTICS_FILTER'));
});
test('five tasks and two complete are40percent; parser copies only public fields',()=>{
 const v=parse(sample({userId:id(99),notes:'private'}));assert.equal(v.totalAssignments,5);assert.equal(v.completionPercent,40);assert.equal(v.pendingAssignments,3);assert.equal(v.userId,undefined);assert.equal(v.notes,undefined);
});
test('zero semester remains empty rather than100percent',()=>{
 const zero=Object.fromEntries(['totalAssignments','todoAssignments','inProgressAssignments','completedAssignments','pendingAssignments','overdueAssignments','notDueAssignments','dueSoonAssignments','completionPercent'].map(k=>[k,0]));
 assert.equal(parse(sample(zero)).completionPercent,0);assert.throws(()=>parse(sample({...zero,completionPercent:100})),code('INVALID_RESPONSE'));
});
test('malformed, negative, fractional, unsafe or inconsistent counts fail',()=>{
 for(const patch of [{totalAssignments:-1},{todoAssignments:2.5},{totalAssignments:NaN},{totalAssignments:Number.MAX_SAFE_INTEGER+1},{completedAssignments:'2'},{pendingAssignments:4},{notDueAssignments:3},{dueSoonAssignments:3},{completionPercent:39}])assert.throws(()=>parse(sample(patch)),code('INVALID_RESPONSE'));
 for(const v of [null,[],{},'text'])assert.throws(()=>parse(v),code('INVALID_RESPONSE'));
});
test('HALF_UP uses exact integer arithmetic at14.5 and12.5percent',()=>{
 const v=sample({totalAssignments:200,todoAssignments:171,inProgressAssignments:0,completedAssignments:29,pendingAssignments:171,overdueAssignments:0,notDueAssignments:171,dueSoonAssignments:0,completionPercent:15});assert.equal(parse(v).completionPercent,15);assert.throws(()=>parse({...v,completionPercent:14}),code('INVALID_RESPONSE'));
 assert.equal(parse({...v,totalAssignments:8,todoAssignments:7,completedAssignments:1,pendingAssignments:7,notDueAssignments:7,completionPercent:13}).completionPercent,13);
});
test('scope, selected zone and server local date must match the request',()=>{
 for(const patch of [{semesterId:id(4)},{courseId:id(2)},{timeZone:'UTC'},{date:'2026-10-28'},{asOf:'2026-02-30T12:00:00Z'},{dueSoonThrough:'2026-10-28T18:00:00Z'}])assert.throws(()=>parse(sample(patch)),code('INVALID_RESPONSE'));
 assert.equal(parse(sample({courseId:id(2)}),{...q,courseId:id(2)}).courseId,id(2));
});
test('DST bounds come from API and retain167/169hours rather than device timezone',()=>{
 for(const [start,end,date] of [['2026-03-04T15:00:00Z','2026-03-11T14:00:00Z','2026-03-04'],['2026-10-28T14:00:00Z','2026-11-04T15:00:00Z','2026-10-28']]){
  const query={...q,timeZone:'America/New_York'},v=parse(sample({asOf:start,dueSoonThrough:end,date,timeZone:query.timeZone}),query);
  assert.equal(v.dueSoonThrough,end);const ref=link('DUE_SOON',v),row=task(10,'Chưa làm',end);assert.equal(statisticsTaskTiming(row,ref).soon,true);assert.equal(statisticsTaskTiming({...row,dueAt:end.replace('Z','.000001Z')},ref).soon,false);
 }
});
test('request is authorized GET only with correct semester/course/zone and signal',async()=>{
 let url,options,tokenCalled=false;const controller=new AbortController(),query={...q,courseId:id(2)};
 const api=createAssignmentStatisticsApi('http://localhost:8080',async(fn,signal)=>{tokenCalled=true;assert.equal(signal,controller.signal);return fn('access-only')},{fetcher:async(u,o)=>{url=new URL(u);options=o;return response(sample({courseId:id(2)}));}});
 assert.equal((await api.read(query,controller.signal)).completionPercent,40);assert.equal(tokenCalled,true);assert.equal(url.pathname,'/api/v1/assignment-statistics');assert.equal(url.searchParams.get('semesterId'),q.semesterId);assert.equal(url.searchParams.get('courseId'),id(2));assert.equal(url.searchParams.get('timeZone'),q.timeZone);assert.equal(url.searchParams.has('date'),false);assert.equal(options.headers.Authorization,'Bearer access-only');assert.equal(options.method,'GET');
});
test('invalid query and aborted request never invoke fetch',async()=>{
 let calls=0;const api=createAssignmentStatisticsApi('http://localhost:8080',fn=>fn('t'),{fetcher:async()=>{calls++;return response(sample())}});
 await assert.rejects(api.read({...q,semesterId:''}),code('INVALID_ASSIGNMENT_STATISTICS_FILTER'));
 const controller=new AbortController();controller.abort();await assert.rejects(api.read(q,controller.signal),code('REQUEST_CANCELLED'));assert.equal(calls,0);
});
test('HTTP errors and unavailable network are errors, never empty statistics',async()=>{
 const api=createAssignmentStatisticsApi('http://localhost:8080',fn=>fn('t'),{fetcher:async()=>new Response(JSON.stringify({code:'SEMESTER_NOT_FOUND'}),{status:404})});await assert.rejects(api.read(q),code('SEMESTER_NOT_FOUND'));
 const offline=createAssignmentStatisticsApi('http://localhost:8080',fn=>fn('t'),{fetcher:async()=>{throw new TypeError('offline')}});await assert.rejects(offline.read(q));
});
test('every clickable group maps to fresh status/deadline filters',()=>{
 for(const [group,status,deadline] of [['ALL','Tất cả','Tất cả'],['TODO','Chưa làm','Tất cả'],['IN_PROGRESS','Đang làm','Tất cả'],['COMPLETED','Hoàn thành','Tất cả'],['OVERDUE','Tất cả','Quá hạn'],['DUE_SOON','Tất cả','Sắp hạn']]){
  const r=link(group);assert.equal(r.semesterId,q.semesterId);assert.equal(r.group,group);assert.equal(assignmentGroup(group).status,status);assert.equal(assignmentGroup(group).deadline,deadline);assert.equal(r.asOf,sample().asOf);
 }
 assert.throws(()=>link('BROKEN'),code('INVALID_REQUEST'));
});
test('overdue is strictly before exact microsecond and excludes completed',()=>{
 const r=link('OVERDUE'),rows=[task(10,'Chưa làm','2026-10-28T18:00:00.123455Z'),task(11),task(12,'Hoàn thành','2026-10-20T00:00:00Z')];
 assert.deepEqual(filterStatisticsAssignments(rows,scope,{...filters,deadline:'Quá hạn'},r).map(t=>t.id),[id(10)]);
});
test('soon includes both exact API bounds and excludes one microsecond beyond',()=>{
 const r=link('DUE_SOON'),rows=[task(10),task(11,'Đang làm',r.dueSoonThrough),task(12,'Chưa làm','2026-11-04T18:00:00.123457Z'),task(13,'Hoàn thành',r.asOf)];
 assert.deepEqual(new Set(filterStatisticsAssignments(rows,scope,{...filters,deadline:'Sắp hạn'},r).map(t=>t.id)),new Set([id(10),id(11)]));
});
test('course and semester stay scoped despite same labels and different attempts',()=>{
 const rows=[task(10),task(11,'Chưa làm',sample().asOf,id(3))];
 assert.deepEqual(filterStatisticsAssignments(rows,scope,filters,link()).map(t=>t.id),[id(10)]);
 assert.equal(filterStatisticsAssignments(rows,scope,{...filters,courseId:id(3)},link()).length,0);
});
test('query/status/course can combine without losing snapshot deadline',()=>{
 const rows=[task(10),task(11,'Đang làm'),task(12,'Đang làm','2026-11-08T00:00:00Z')];
 assert.deepEqual(filterStatisticsAssignments(rows,scope,{query:'Bài 11',status:'Đang làm',courseId:id(2),deadline:'Sắp hạn'},link()).map(t=>t.id),[id(11)]);
});
test('today uses server profile date even when device renders UTC previous day',()=>{
 const rows=[task(10),task(11,'Hoàn thành','2026-10-29T01:00:00Z'),task(12,'Chưa làm','2026-10-28T16:59:00Z')];
 assert.deepEqual(new Set(filterStatisticsAssignments(rows,scope,{...filters,deadline:'Hôm nay'},link()).map(t=>t.id)),new Set([id(10),id(11)]));
});
test('malformed linked deadlines fail instead of creating an apparently empty list',()=>{
 assert.throws(()=>filterStatisticsAssignments([task(10,'Chưa làm','bad')],scope,filters,link()),code('INVALID_RESPONSE'));
 assert.throws(()=>statisticsTaskTiming(task(10),{...link(),asOf:'bad'}),code('INVALID_RESPONSE'));
});
test('deadline labels follow profile timezone and include unambiguous calendar date',()=>{
 assert.equal(statisticsTimeLabel('2026-10-28T18:00:00Z','Asia/Ho_Chi_Minh'),'29/10/2026 · 01:00:00');
 assert.equal(statisticsTimeLabel('2026-10-28T18:00:00Z','UTC'),'28/10/2026 · 18:00:00');
});
test('mutation revision reloads counts instead of reusing previous value',async()=>{
 const manager=new PomodoroReadManager(async()=>parse(),assignmentStatisticsKey);await manager.load(q,'version0');const key=manager.state.key;
 const next=manager.load(q,'version1');assert.notEqual(manager.state.key,key);assert.equal(manager.state.value,null);await next;assert.equal(manager.state.loaded,true);manager.dispose();
});
test('old semester response cannot overwrite a newer semester selection',async()=>{
 const a=deferred(),b=deferred(),manager=new PomodoroReadManager(query=>query.semesterId===q.semesterId?a.promise:b.promise,assignmentStatisticsKey);
 const first=manager.load(q).catch(e=>e);await Promise.resolve();const other={...q,semesterId:id(4)},second=manager.load(other);await Promise.resolve();b.resolve(parse(sample({semesterId:id(4)}),other));await second;a.resolve(parse());await first;assert.equal(manager.state.value.semesterId,id(4));manager.dispose();
});
test('account guard hides previous account and a failed retry never displays zero',async()=>{
 let fail=false;const manager=new PomodoroReadManager(async()=>{if(fail)throw new Error('offline');return parse()},assignmentStatisticsKey);await manager.load(q);
 assert.equal(visiblePomodoroRead({owner:'A',state:manager.state},'B',manager.state.key).value,null);fail=true;await assert.rejects(manager.load(q));assert.equal(manager.state.value,null);assert.equal(manager.state.loaded,false);assert.ok(manager.state.error);manager.dispose();
});
test('disposed read cannot publish after leaving account or scope',async()=>{
 const d=deferred(),manager=new PomodoroReadManager(()=>d.promise,assignmentStatisticsKey);const loading=manager.load(q).catch(e=>e);await Promise.resolve();manager.dispose();d.resolve(parse());await loading;assert.equal(manager.state.value,null);assert.equal(manager.state.loaded,false);
});
