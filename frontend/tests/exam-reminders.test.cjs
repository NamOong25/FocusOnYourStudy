const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {buildServerExamReminders,projectServerReminders}=require('../src/features/notifications/serverExamReminders.ts');
const {pruneKnownReceipts,mergeReminders}=require('../src/features/notifications/serverClassReminders.ts');
const {applyReadReceipts,markRemindersRead,notificationTargetExists,reminderOpenLabel}=require('../src/features/notifications/notifications.ts');
const {ApiError}=require('../src/shared/api/http.ts');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333',D='44444444-4444-4444-8444-444444444444';
const courses=[{id:B,semesterId:C,code:'JAVA',name:'Java'},{id:D,semesterId:A,code:'JAVA',name:'Java'}],semesters=[{id:C,name:'Học kỳ 1',academicYear:'2026 – 2027'},{id:A,name:'Học kỳ 2',academicYear:'2026 – 2027'}];
const exam=(p={})=>({id:A,courseId:B,kind:'FINAL',format:'PRACTICAL',startsAt:'2026-11-10T07:00:00Z',endsAt:'2026-11-10T09:00:00Z',timeZone:'Asia/Ho_Chi_Minh',room:'A1',reminder:true,reminderMinutes:[1440,180,45,0],notes:'',version:0,createdAt:'2026-10-25T00:00:00Z',updatedAt:'2026-10-25T00:00:00Z',...p});
const build=(rows,at='2026-11-10T04:00:00Z',catalog=courses,terms=semesters)=>buildServerExamReminders(rows,catalog,terms,new Date(at));
test('exam is absent before the earliest configured milestone and appears at its exact boundary',()=>{
 assert.equal(build([exam()],'2026-11-09T06:59:59.999Z').length,0);const item=build([exam()],'2026-11-09T07:00:00Z')[0];assert.equal(item.kind,'saved-exam');assert.match(item.reason,/1 ngày/);assert.equal(item.target.semesterId,C);assert.equal(item.target.courseId,B);assert.equal(item.target.id,A);assert.equal(item.at,Date.parse(exam().startsAt));
});
test('multiple reached milestones yield one card and the latest due milestone',()=>{
 const rows=build([exam()]);assert.equal(rows.length,1);assert.match(rows[0].reason,/3 giờ/);assert.equal(rows[0].id,'saved-exam:'+A);assert.match(build([exam()],'2026-11-10T06:15:00Z')[0].reason,/45 phút/);
});
test('reaching a new milestone makes that exam unread without duplicating cards',()=>{
 const old=build([exam()],'2026-11-09T07:00:00Z')[0],current=build([exam()])[0];assert.equal(old.id,current.id);assert.notEqual(old.revision,current.revision);assert.equal(applyReadReceipts([current],markRemindersRead({},[old]))[0].read,false);
});
test('zero means exactly start and remains absent one millisecond before it',()=>{
 assert.equal(build([exam({reminderMinutes:[0]})],'2026-11-10T06:59:59.999Z').length,0);const item=build([exam({reminderMinutes:[0]})],'2026-11-10T07:00:00Z')[0];assert.equal(item.urgency,'ongoing');assert.equal(item.when,'Đang thi');assert.match(item.reason,/Đúng giờ bắt đầu/);
});
test('the start milestone creates unread while ordinary minute countdowns do not',()=>{
 const old=build([exam()],'2026-11-10T06:15:00Z')[0],minute=build([exam()],'2026-11-10T06:16:00Z')[0],start=build([exam()],'2026-11-10T07:00:00Z')[0];assert.equal(old.revision,minute.revision);assert.notEqual(old.when,minute.when);assert.notEqual(start.revision,minute.revision);
});
test('ongoing does not reset receipt when no zero milestone is configured',()=>{
 const row=exam({reminderMinutes:[45]}),before=build([row],'2026-11-10T06:30:00Z')[0],after=build([row],'2026-11-10T07:30:00Z')[0];assert.equal(before.revision,after.revision);assert.equal(applyReadReceipts([after],markRemindersRead({},[before]))[0].read,true);
});
test('reminder remains during exam and disappears exactly at end',()=>{
 assert.equal(build([exam()],'2026-11-10T08:59:59.999Z').length,1);assert.equal(build([exam()],'2026-11-10T09:00:00Z').length,0);
});
test('disabled reminders and successful deletion remove cards and their known receipts',()=>{
 const items=build([exam()]),receipt=markRemindersRead({},items);assert.equal(build([exam({reminder:false,reminderMinutes:[]})]).length,0);assert.deepEqual(pruneKnownReceipts(receipt,[],true,true),{});assert.deepEqual(build([]),[]);
});
test('one week is the largest lead, independent of the selected semester or seven-day UI page',()=>{
 const future=exam({startsAt:'2026-11-17T07:00:00Z',endsAt:'2026-11-17T09:00:00Z',reminderMinutes:[10080]});assert.equal(build([future],'2026-11-10T06:59:59.999Z').length,0);assert.equal(build([future],'2026-11-10T07:00:00Z').length,1);
});
test('whole account includes same-name courses from different semesters with correct target metadata',()=>{
 const items=build([exam(),exam({id:D,courseId:D})]);assert.equal(items.length,2);assert.deepEqual(new Set(items.map(i=>i.target.semesterId)),new Set([A,C]));assert.match(items[0].subtitle,/Học kỳ 1/);assert.match(items[1].subtitle,/Học kỳ 2/);
});
test('missing course or semester rejects the whole batch, never publishes a partial result',()=>{
 assert.throws(()=>build([exam(),exam({id:D,courseId:C})]),e=>e.code==='REMINDER_CATALOG_RELOAD_REQUIRED');assert.throws(()=>build([exam()],undefined,courses,[]),e=>e.code==='REMINDER_CATALOG_RELOAD_REQUIRED');
});
test('source zone controls date and clock, including DST repeated clock crossing',()=>{
 const row=exam({startsAt:'2026-11-01T05:30:00Z',endsAt:'2026-11-01T06:15:00Z',timeZone:'America/New_York',reminderMinutes:[0]});const item=build([row],'2026-11-01T06:00:00Z')[0];assert.match(item.detail,/01\/11\/2026.*01:30 \(GMT-4\).*01:15 \(GMT-5\)/);assert.match(item.origin,/America\/New_York/);assert.equal(item.when,'Đang thi');
});
test('reminder uses actual instant even if the source calendar day differs across the dateline',()=>{
 const row=exam({startsAt:'2026-11-09T10:00:00Z',endsAt:'2026-11-09T12:00:00Z',timeZone:'Pacific/Kiritimati',reminderMinutes:[60]});const item=build([row],'2026-11-09T09:00:00Z')[0];assert.match(item.detail,/10\/11\/2026.*00:00/);assert.equal(item.urgency,'upcoming');
});
for(const [field,value] of Object.entries({room:'New room',kind:'MIDTERM',format:'ORAL',timeZone:'Asia/Tokyo',startsAt:'2026-11-10T06:00:00Z',endsAt:'2026-11-10T10:00:00Z',reminderMinutes:[180,60,0]}))test('visible/config change resets read state: '+field,()=>{
 const old=build([exam()])[0],next=build([exam({[field]:value})])[0];assert.equal(old.id,next.id);assert.notEqual(old.revision,next.revision);
});
test('version/timestamps and undisplayed notes alone do not create unread spam',()=>{
 const old=build([exam()])[0],next=build([exam({version:7,updatedAt:'2026-10-26T00:00:00Z',notes:'Notes edited'})])[0];assert.equal(old.revision,next.revision);
});
test('equivalent reminder order does not change read revision',()=>assert.equal(build([exam()])[0].revision,build([exam({reminderMinutes:[0,45,1440,180]})])[0].revision));
test('renamed course or semester changes displayed reminder revision',()=>{
 const old=build([exam()])[0],next=build([exam()],undefined,[{...courses[0],name:'Java mới'},courses[1]])[0],term=build([exam()],undefined,courses,[{...semesters[0],academicYear:'2027 – 2028'},semesters[1]])[0];assert.notEqual(old.revision,next.revision);assert.notEqual(old.revision,term.revision);
});
test('rescheduling outside the lead window removes the reminder until its new milestone',()=>{
 const row=exam({startsAt:'2026-12-10T07:00:00Z',endsAt:'2026-12-10T09:00:00Z'});assert.equal(build([row]).length,0);assert.equal(build([row],'2026-12-09T07:00:00Z').length,1);
});
test('saved exam target never uses preview RAM identity checks',()=>{
 const item=build([exam()])[0];assert.equal(notificationTargetExists(item.target,{tasks:[],classes:[],exceptions:[],exams:[{id:A}],courses}),false);assert.match(reminderOpenLabel(item),/^Mở nhắc lịch thi Java,/);
});
test('blank room is honest and reminder name identifies the reached milestone',()=>{
 const item=build([exam({room:''})])[0];assert.match(item.subtitle,/Chưa có phòng thi/);assert.match(item.reason,/3 giờ/);assert.doesNotMatch(item.subtitle,/undefined/);
});
const classRow={scheduleId:A,courseId:B,date:'2026-11-10',startTime:'14:00',endTime:'16:00',timeZone:'Asia/Ho_Chi_Minh',startsAt:'2026-11-10T07:00:00Z',endsAt:'2026-11-10T09:00:00Z',room:'A1',teacher:'',notes:'',reminderMinutes:180,cancelled:false,changed:false,reason:''};
const read=(p={})=>({loaded:true,loading:false,error:null,...p});
const projection=(p={})=>projectServerReminders({classes:{...read(),rules:[],rows:[classRow]},exams:{...read(),value:[exam()]},courses,semesters,metadataReady:true,metadataError:null,now:new Date('2026-11-10T04:00:00Z'),...p});
test('independent successful exam and class sources are both published',()=>{
 const value=projection();assert.equal(value.ready,true);assert.equal(value.classItems.length,1);assert.equal(value.examItems.length,1);assert.equal(mergeReminders(value.classItems,value.examItems).length,2);
});
test('exam failure does not hide confirmed class reminders or claim complete empty data',()=>{
 const value=projection({exams:{...read({error:new ApiError('offline','NETWORK_ERROR')}),value:[exam()]}});assert.equal(value.ready,false);assert.equal(value.classesReady,true);assert.equal(value.examsReady,false);assert.equal(value.classItems.length,1);assert.equal(value.examItems.length,0);assert.equal(value.error.code,'NETWORK_ERROR');
});
test('class failure does not hide confirmed exam reminders',()=>{
 const value=projection({classes:{...read({error:new ApiError('offline','NETWORK_ERROR')}),rules:[],rows:[]}});assert.equal(value.ready,false);assert.equal(value.examsReady,true);assert.equal(value.examItems.length,1);assert.equal(value.classItems.length,0);
});
test('loading hides unconfirmed exams but retains their receipts through the gap',()=>{
 const items=build([exam()]),receipts=markRemindersRead({},items),value=projection({exams:{...read({loading:true}),value:[exam()]}});assert.equal(value.examItems.length,0);assert.equal(value.ready,false);const kept=pruneKnownReceipts(receipts,value.classItems,value.classesReady,value.examsReady);assert.equal(applyReadReceipts(items,kept)[0].read,true);
});
test('initial error and missing metadata cannot report successful empty reminders',()=>{
 assert.equal(projection({exams:{...read({loaded:false,error:new ApiError('offline','NETWORK_ERROR')}),value:null}}).ready,false);
 const value=projection({metadataReady:false,metadataError:new ApiError('catalog','NETWORK_ERROR')});assert.equal(value.ready,false);assert.equal(value.examItems.length,0);assert.equal(value.classItems.length,0);
});
test('successful empty sources are complete and prune obsolete receipts only for known domains',()=>{
 const value=projection({classes:{...read(),rules:[],rows:[]},exams:{...read(),value:[]}});assert.equal(value.ready,true);assert.deepEqual(pruneKnownReceipts({'saved-exam:a':'r','saved-class:b':'r'},[],value.classesReady,value.examsReady),{});
});
test('receipt pruning is independent for class and exam domains',()=>{
 const receipts={'saved-exam:a':'r','saved-class:b':'r','task:c':'r'};assert.deepEqual(pruneKnownReceipts(receipts,[],true,false),{'saved-exam:a':'r'});assert.deepEqual(pruneKnownReceipts(receipts,[],false,true),{'saved-class:b':'r'});assert.deepEqual(pruneKnownReceipts(receipts,[],false,false),{'saved-exam:a':'r','saved-class:b':'r'});
});
test('marking read for one milestone does not pre-read another exam or a future milestone',()=>{
 const one=build([exam()]),receipt=markRemindersRead({},one),next=build([exam(),exam({id:D,courseId:D})],'2026-11-10T06:15:00Z');assert.deepEqual(applyReadReceipts(next,receipt).map(i=>i.read),[false,false]);
});
test('catalog mismatch in exam batch keeps valid class reminders and advertises incomplete data',()=>{
 const value=projection({exams:{...read(),value:[exam(),exam({courseId:'missing'})]}});assert.equal(value.examItems.length,0);assert.equal(value.classItems.length,1);assert.equal(value.ready,false);assert.equal(value.error.code,'REMINDER_CATALOG_RELOAD_REQUIRED');
});
