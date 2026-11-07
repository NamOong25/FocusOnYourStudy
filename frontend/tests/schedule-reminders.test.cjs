const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
process.env.TZ = 'Asia/Ho_Chi_Minh';
const { buildServerClassReminders, mergeReminders, pruneKnownReceipts } = require('../src/features/notifications/serverClassReminders.ts');
const { applyReadReceipts, markRemindersRead, notificationTargetExists, reminderOpenLabel } = require('../src/features/notifications/notifications.ts');
const { createOverviewApi } = require('../src/features/schedule/overview/overviewApi.ts');
const { overviewKey } = require('../src/features/schedule/overview/overview.ts');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444';
const courses=[{id:B,semesterId:C,code:'JAVA',name:'Java'},{id:D,semesterId:A,code:'REACT',name:'React'}],semesters=[{id:C,name:'Học kỳ 1',academicYear:'2026 – 2027'},{id:A,name:'Học kỳ 2',academicYear:'2026 – 2027'}];
const row=(patch={})=>({scheduleId:A,courseId:B,date:'2026-10-25',startTime:'14:00',endTime:'16:00',timeZone:'Asia/Ho_Chi_Minh',startsAt:'2026-10-25T07:00:00Z',endsAt:'2026-10-25T09:00:00Z',room:'A1',teacher:'GV',notes:'',reminderMinutes:15,scheduleVersion:0,cancelled:false,changed:false,reason:'',exceptionId:null,...patch});
const build=(rows,at='2026-10-25T06:45:00Z',catalog=courses,terms=semesters)=>buildServerClassReminders({rules:[],rows},catalog,terms,new Date(at));
test('a reminder appears exactly at start minus configured minutes, not throughout the seven-day agenda',()=>{
 assert.equal(build([row()],'2026-10-25T06:44:59.999Z').length,0);const item=build([row()])[0];assert.equal(item.kind,'saved-class');assert.equal(item.when,'Còn 15 phút');assert.equal(item.target.date,'2026-10-25');assert.equal(item.target.semesterId,C);assert.equal(item.at,Date.parse(row().startsAt));assert.match(item.subtitle,/JAVA.*Học kỳ 1/);
});
test('zero minutes means exactly the start, not disabled and not an early reminder',()=>{
 assert.equal(build([row({reminderMinutes:0})],'2026-10-25T06:59:59.999Z').length,0);const item=build([row({reminderMinutes:0})],'2026-10-25T07:00:00Z')[0];assert.equal(item.when,'Đang học');assert.equal(item.urgency,'ongoing');
});
test('ongoing stays visible and an exact end boundary removes it',()=>{
 assert.equal(build([row()],'2026-10-25T08:59:59.999Z').length,1);assert.equal(build([row()],'2026-10-25T09:00:00Z').length,0);
});
test('each source date in a recurring series is a different reminder and receipt',()=>{
 const other=row({date:'2026-10-26',startTime:'07:00',endTime:'09:00',startsAt:'2026-10-26T00:00:00Z',endsAt:'2026-10-26T02:00:00Z',reminderMinutes:1440});const items=build([row(),other]);assert.equal(items.length,2);assert.equal(new Set(items.map(x=>x.id)).size,2);const receipts=markRemindersRead({},[items[0]]);assert.deepEqual(applyReadReceipts(items,receipts).map(x=>x.read),[true,false]);
});
test('the maximum seven-day lead is inclusive and respects its minute boundary',()=>{
 const far=row({date:'2026-11-01',startsAt:'2026-11-01T07:00:00Z',endsAt:'2026-11-01T09:00:00Z',reminderMinutes:10080});assert.equal(build([far],'2026-10-25T06:59:59Z').length,0);assert.equal(build([far],'2026-10-25T07:00:00Z').length,1);
});
test('cancelled is removed, restore is reconsidered, and observed removal prunes old receipts',()=>{
 const original=build([row()]),read=markRemindersRead({},original),cancelled=build([row({cancelled:true,exceptionId:C})]);assert.equal(cancelled.length,0);const pruned=pruneKnownReceipts(read,cancelled,true);assert.equal(applyReadReceipts(original,pruned)[0].read,false);
});
test('a changed start moves its trigger; moving it later can remove an already due reminder',()=>{
 const moved=row({changed:true,exceptionId:C,startTime:'15:00',endTime:'17:00',startsAt:'2026-10-25T08:00:00Z',endsAt:'2026-10-25T10:00:00Z'});assert.equal(build([moved]).length,0);assert.equal(build([moved],'2026-10-25T07:45:00Z')[0].when,'Còn 15 phút');
});
test('changed effective fields are shown; stable ID gets a new receipt revision',()=>{
 const old=build([row()])[0],changed=build([row({changed:true,exceptionId:C,room:'B9',teacher:'GV mới',reason:'Đổi phòng'})])[0];assert.equal(changed.id,old.id);assert.notEqual(changed.revision,old.revision);assert.match(changed.subtitle,/B9.*GV mới/);assert.equal(changed.reason,'Đổi phòng');assert.equal(changed.changed,true);assert.equal(applyReadReceipts([changed],markRemindersRead({},[old]))[0].read,false);
});
test('editing an unrelated date increments parent version without resetting this receipt',()=>{
 const old=build([row()])[0],next=build([row({scheduleVersion:5})])[0];assert.equal(next.revision,old.revision);assert.equal(applyReadReceipts([next],markRemindersRead({},[old]))[0].read,true);
});
test('minute ticks and a transition to ongoing do not reset read state',()=>{
 const old=build([row()])[0],next=build([row()],'2026-10-25T07:15:00Z')[0];assert.notEqual(next.when,old.when);assert.equal(next.revision,old.revision);
});
for(const field of ['room','teacher','reminderMinutes'])test(`changing displayed ${field} or trigger resets this reminder only`,()=>{
 const old=build([row()])[0],next=build([row({[field]:field==='reminderMinutes'?30:'New value'})])[0];assert.equal(old.id,next.id);assert.notEqual(old.revision,next.revision);
});
test('course name/code and semester labels are part of visible content revision',()=>{
 const old=build([row()])[0],renamed=build([row()],undefined,[{...courses[0],name:'Java mới'},courses[1]])[0];assert.equal(renamed.title,'Java mới');assert.notEqual(renamed.revision,old.revision);
});
test('whole-account sources include reminders from distinct semesters',()=>{
 const items=build([row(),row({scheduleId:D,courseId:D})]);assert.equal(items.length,2);assert.deepEqual(new Set(items.map(x=>x.target.semesterId)),new Set([A,C]));
});
test('unknown course/semester is an error, not a fabricated destination or successful empty result',()=>{
 assert.throws(()=>build([row({courseId:C})]),e=>e.code==='REMINDER_CATALOG_RELOAD_REQUIRED');assert.throws(()=>build([row()],undefined,courses,[]),e=>e.code==='REMINDER_CATALOG_RELOAD_REQUIRED');
});
test('an exception-free empty room is shown honestly, not replaced by course room',()=>{
 assert.match(build([row({room:'',teacher:''})])[0].subtitle,/Chưa có phòng/);assert.doesNotMatch(build([row({room:'',teacher:''})])[0].subtitle,/undefined/);
});
test('viewer date may differ from source; target always retains the source date and timezone explanation',()=>{
 const foreign=row({date:'2026-10-24',startTime:'22:30',endTime:'23:30',timeZone:'America/New_York',startsAt:'2026-10-25T02:30:00Z',endsAt:'2026-10-25T03:30:00Z'});const item=build([foreign],'2026-10-25T02:15:00Z')[0];assert.match(item.detail,/25\/10\/2026 · 09:30/);assert.match(item.origin,/24\/10\/2026.*22:30.*America\/New_York/);assert.equal(item.target.date,'2026-10-24');
});
test('server targets cannot fall through to the RAM ClassDialog identity check',()=>{
 const item=build([row()])[0];assert.equal(notificationTargetExists(item.target,{tasks:[],classes:[{id:A}],exams:[],exceptions:[],courses:[]}),false);assert.match(reminderOpenLabel(item),/^Mở nhắc lịch học Java,/);
});
test('pending/error reads preserve server receipts; a known empty result removes them',()=>{
 const items=build([row()]),receipts=markRemindersRead({},items);assert.equal(pruneKnownReceipts(receipts,[],false),receipts);assert.equal(applyReadReceipts(items,pruneKnownReceipts(receipts,[],false))[0].read,true);assert.deepEqual(pruneKnownReceipts(receipts,[],true),{});
});
test('marking all read only covers current reminders, not future undued instances',()=>{
 const items=build([row()]);const future=row({date:'2026-10-26',startsAt:'2026-10-26T07:00:00Z',endsAt:'2026-10-26T09:00:00Z'}),receipt=markRemindersRead({},items);assert.equal(applyReadReceipts(build([future],'2026-10-26T06:45:00Z'),receipt)[0].read,false);
});
test('task and exam items remain separate, sorted with server classes, without mutation or duplicate RAM classes',()=>{
 const saved=build([row()]),task={id:'task:a',kind:'task',urgency:'overdue',at:0,revision:'r'},exam={id:'exam:b',kind:'exam',urgency:'upcoming',at:Date.parse('2026-10-26T07:00:00Z'),revision:'r'};assert.deepEqual(mergeReminders([task,exam],saved).map(x=>x.kind),['task','saved-class','exam']);assert.equal(saved.length,1);
});
const rule=(patch={})=>({id:A,courseId:B,weekdays:[7],startsOn:'2026-10-25',endsOn:'2026-12-27',startTime:'14:00',endTime:'16:00',timeZone:'Asia/Ho_Chi_Minh',room:'A1',teacher:'GV',notes:'',reminderMinutes:15,version:0,...patch});
const q={reminders:true,today:'2026-10-25'};
function api({rules=[rule()],rows=[row(),row({date:'2026-11-01',startsAt:'2026-11-01T07:00:00Z',endsAt:'2026-11-01T09:00:00Z'})],after,fail=false}={}){
 const calls=[];let inv=0;const value=createOverviewApi('http://example.invalid',operation=>operation('access'),{fetcher:async(url,options)=>{calls.push({url,options});const u=new URL(url);let data;if(u.pathname.endsWith('/occurrences')){if(fail)throw Error('Offline');data=rows.filter(r=>r.date>=u.searchParams.get('from')&&r.date<=u.searchParams.get('to'));}else data=++inv===1||!after?rules:after;return new Response(JSON.stringify({data}),{status:200});}});return{value,calls};
}
test('reminder API reads the whole account, bounded source dates and both inventory snapshots',async()=>{
 const {value,calls}=api();const result=await value.read(q);assert.equal(result.rows.length,2);assert.equal(calls[0].url,'http://example.invalid/api/v1/class-schedules');assert.match(calls[1].url,/occurrences\?from=2026-10-25&to=2026-11-03$/);assert.equal(calls[2].url,calls[0].url);assert.equal(calls[1].options.headers.Authorization,'Bearer access');assert.equal(calls[1].options.method,'GET');assert.equal(overviewKey(q),'reminders:2026-10-25');
});
test('far-future rules are inventoried but not fetched as irrelevant notification instances',async()=>{
 const {value,calls}=api({rules:[rule({startsOn:'2027-03-14',endsOn:'2027-03-14'})],rows:[]});assert.equal((await value.read(q)).rows.length,0);assert.equal(calls.length,2);
});
test('a source-date occurrence yesterday is loaded for a due reminder today on the viewer device',async()=>{
 const foreignRule=rule({startsOn:'2026-10-24',endsOn:'2026-10-24',weekdays:[6],startTime:'22:30',endTime:'23:30',timeZone:'America/New_York'}),foreign=row({date:'2026-10-24',startTime:'22:30',endTime:'23:30',timeZone:'America/New_York',startsAt:'2026-10-25T02:30:00Z',endsAt:'2026-10-25T03:30:00Z'});assert.equal((await api({rules:[foreignRule],rows:[foreign]}).value.read(q)).rows.length,1);
});
test('global inventory changes, incomplete data and failed chunks reject rather than producing successful zero reminders',async()=>{
 await assert.rejects(api({after:[]}).value.read(q),e=>e.code==='SCHEDULE_OVERVIEW_CHANGED');await assert.rejects(api({rows:[]}).value.read(q),e=>e.code==='INVALID_RESPONSE');await assert.rejects(api({fail:true}).value.read(q));
});
test('the maximum date does not request past the supported source calendar',async()=>{
 const {value,calls}=api({rules:[],rows:[]});await value.read({reminders:true,today:'2099-12-31'});assert.equal(calls.length,2);assert.throws(()=>overviewKey({reminders:false,today:q.today}));
});
test('returning to the same mounted calendar day invalidates its stale read before loading the latest version',async()=>{
 const {ScheduleManager}=require('../src/features/schedule/api/ScheduleManager.ts');let version=0;const manager=new ScheduleManager({list:async()=>[row({scheduleVersion:version})]});const query={semesterId:C,from:'2026-10-25',to:'2026-10-25'};
 await manager.load(query);version=2;manager.invalidate();assert.equal(manager.state.loaded,false);assert.deepEqual(manager.state.rows,[]);assert.equal(manager.state.revision,1);await manager.load(query);assert.equal(manager.state.rows[0].scheduleVersion,2);
});
test('navigation invalidation never clears an uncertain one-day write or permits another write',async()=>{
 const {ScheduleManager}=require('../src/features/schedule/api/ScheduleManager.ts');const manager=new ScheduleManager({list:async()=>[row()]},{save:async()=>{throw Error('Lost reply');}});const query={semesterId:C,from:'2026-10-25',to:'2026-10-25'},target={scheduleId:A,date:'2026-10-25'};
 await manager.load(query);await assert.rejects(manager.saveException({rule:{id:A},occurrence:row()},{}));manager.invalidate();assert.equal(manager.state.needsReload,true);assert.deepEqual(manager.state.pendingOccurrence,target);await manager.load(query);assert.equal(manager.acknowledge(),false);assert.equal(manager.acknowledge(target),true);
});
