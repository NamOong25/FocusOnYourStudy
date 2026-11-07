const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createClassExceptionsApi,exceptionInput}=require('../src/features/schedule/api/classExceptionsApi.ts');
const {exceptionDraft,draftException}=require('../src/features/schedule/exceptionDraft.ts');
const {ScheduleManager}=require('../src/features/schedule/api/ScheduleManager.ts');
const {ApiError}=require('../src/shared/api/http.ts');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const target={scheduleId:A,date:'2026-10-24'},query={semesterId:B,from:'2026-10-19',to:'2026-10-25'};
const rule=(p={})=>({id:A,courseId:B,weekdays:[1,6],startsOn:'2026-10-19',endsOn:'2026-11-08',startTime:'07:00',endTime:'09:00',timeZone:'Asia/Ho_Chi_Minh',room:'Base',teacher:'Teacher',notes:'',reminderMinutes:15,version:2,...p});
const row=(p={})=>({...target,courseId:B,startTime:'07:00',endTime:'09:00',timeZone:'Asia/Ho_Chi_Minh',room:'Base',teacher:'Teacher',notes:'',reminderMinutes:15,scheduleVersion:2,cancelled:false,changed:false,reason:'',exceptionId:null,startsAt:'2026-10-24T00:00:00Z',endsAt:'2026-10-24T02:00:00Z',...p});
const raw=(p={})=>({id:C,...target,kind:'CHANGED',startTime:null,endTime:null,room:'New',teacher:null,reason:'Change',scheduleVersion:2,...p});
const basis=(changed=false)=>({rule:rule(),occurrence:changed?row({changed:true,room:'New',reason:'Change',exceptionId:C}):row(),exception:changed?raw():null});
const input=(p={})=>({kind:'CHANGED',startTime:null,endTime:null,room:'New',teacher:null,reason:'Change',...p});
function api(handler,calls=[]){return createClassExceptionsApi('http://example.invalid',operation=>operation('test-access'),{fetcher:async(url,options)=>{
 calls.push({url,options});const result=await handler(url,options);const status=result.status??200;return new Response(status===204?null:JSON.stringify(status<300?{data:result.data}:result.problem),{status});
}});}
function readClient(snapshot,patch={}){return api((url)=>url.includes('/occurrences?')?{data:patch.rows??[snapshot.occurrence]}:url.includes('/exceptions/')?{data:patch.exception??snapshot.exception}:{data:patch.rule??snapshot.rule});}
test('reads one exact local day with course filter, explicit Bearer and no mutation',async()=>{
 const calls=[],b=basis(true),client=api((url)=>({data:url.includes('/occurrences?')?[b.occurrence]:url.includes('/exceptions/')?b.exception:b.rule}),calls);
 assert.deepEqual(await client.readDay(target),b);assert.equal(calls.length,3);for(const call of calls){assert.equal(call.options.method,'GET');assert.equal(call.options.headers.Authorization,'Bearer test-access');}
 assert.match(calls[1].url,new RegExp('courseId='+B+'&from=2026-10-24&to=2026-10-24$'));
});
test('unmodified day does not GET a nonexistent exception',async()=>{const b=basis();assert.deepEqual(await readClient(b).readDay(target),b);});
test('cross-resource version change is rejected rather than merged',async()=>{
 await assert.rejects(readClient(basis(),{rule:rule({version:3})}).readDay(target),e=>e.code==='CLASS_SCHEDULE_VERSION_CONFLICT');
 await assert.rejects(readClient(basis(true),{exception:raw({scheduleVersion:3})}).readDay(target),e=>e.code==='CLASS_SCHEDULE_VERSION_CONFLICT');
});
test('ABA exception identity change is rejected even if other fields look identical',async()=>{await assert.rejects(readClient(basis(true),{exception:raw({id:B})}).readDay(target),e=>e.code==='CLASS_SCHEDULE_VERSION_CONFLICT');});
for(const [label,patch] of Object.entries({missingTime:{startTime:undefined},badClock:{startTime:'24:00'},invalidKind:{kind:'RESTORED'},missingVersion:{scheduleVersion:undefined},wrongDate:{date:'2026-10-25'},unsafeVersion:{scheduleVersion:Number.MAX_SAFE_INTEGER+1}})){
 test('rejects malformed raw exception '+label,async()=>{await assert.rejects(readClient(basis(true),{exception:raw(patch)}).readDay(target));});
}
test('effective occurrence must agree with inherited and explicit raw fields',async()=>{
 await assert.rejects(readClient(basis(true),{exception:raw({room:'Other'})}).readDay(target),e=>e.code==='INVALID_RESPONSE');
 await assert.rejects(readClient(basis(true),{exception:raw({room:null})}).readDay(target),e=>e.code==='INVALID_RESPONSE');
});
test('deleted or moved day is not recreated',async()=>{
 await assert.rejects(readClient(basis(),{rows:[]}).readDay(target),e=>e.code==='CLASS_OCCURRENCE_NOT_FOUND');
 await assert.rejects(readClient(basis(),{rule:rule({weekdays:[1]})}).readDay(target),e=>e.code==='CLASS_OCCURRENCE_NOT_FOUND');
});
test('rejects duplicate or off-query occurrences in a day snapshot',async()=>{
 await assert.rejects(readClient(basis(),{rows:[row(),row()]}).readDay(target),e=>e.code==='INVALID_RESPONSE');
 await assert.rejects(readClient(basis(),{rows:[row({courseId:C})]}).readDay(target),e=>e.code==='INVALID_RESPONSE');
});
test('draft preserves nullable inheritance and explicit empty room',()=>{
 const b=basis(true);b.exception.room='';b.occurrence.room='';const d=exceptionDraft(b);assert.equal(d.room.override,true);assert.equal(d.room.value,'');assert.equal(d.startTime.override,false);
 const payload=draftException(d,'change',b);assert.equal(payload.room,'');assert.equal(payload.startTime,null);assert.equal(payload.teacher,null);
 d.room.override=false;d.teacher.override=true;d.teacher.value='Replacement';assert.equal(draftException(d,'change',b).room,null);
});
test('cancel ignores old changed fields while preserving the entered reason',()=>{
 const b=basis(true),d=exceptionDraft(b);d.startTime.override=true;d.startTime.value='10:00';d.reason=' Nghỉ một buổi ';
 assert.deepEqual(draftException(d,'cancel',b),{kind:'CANCELLED',startTime:null,endTime:null,room:null,teacher:null,reason:'Nghỉ một buổi'});
});
test('change requires at least one override and validates the inherited endpoint',()=>{
 assert.throws(()=>exceptionInput(input({room:null}),rule()),/ít nhất/);
 assert.throws(()=>exceptionInput(input({startTime:'10:00'}),rule()),/kết thúc/);
 assert.equal(exceptionInput(input({startTime:'10:00',endTime:'12:00'}),rule()).endTime,'12:00');
});
test('partial hour override survives opening and saving another field',()=>{
 const b=basis(true);b.exception.startTime='08:00';b.occurrence.startTime='08:00';b.occurrence.startsAt='2026-10-24T01:00:00Z';const d=exceptionDraft(b);d.room.value='B2';const out=draftException(d,'change',b);assert.equal(out.startTime,'08:00');assert.equal(out.endTime,null);
});
test('PUT uses the immutable selected date and parent scheduleVersion, with a whitelisted body',async()=>{
 const calls=[],client=api(()=>({data:raw({scheduleVersion:3})}),calls),b=basis();await client.save(b,{...input(),userId:B,date:'2026-11-02',scheduleVersion:99,id:A});
 assert.match(calls[0].url,new RegExp(A+'/exceptions/2026-10-24$'));assert.equal(calls[0].options.method,'PUT');assert.deepEqual(JSON.parse(calls[0].options.body),{...input(),scheduleVersion:2});assert.equal(b.rule.version,2);
});
test('upsert cancellation sends only null overrides and accepts the same existing exception id',async()=>{
 const payload=input({kind:'CANCELLED',room:null,reason:'Nghỉ'}),client=api(()=>({data:raw({...payload,scheduleVersion:3})}));assert.equal((await client.save(basis(true),payload)).kind,'CANCELLED');
});
test('invalid or changed write response cannot be reported as confirmed success',async()=>{
 for(const patch of [{date:'2026-10-25'},{scheduleId:B},{scheduleVersion:2},{id:B},{room:'Other'}])await assert.rejects(api(()=>({data:raw({scheduleVersion:3,...patch})})).save(basis(true),input()),e=>e.code==='INVALID_RESPONSE');
});
test('restore DELETE uses parent version and never sends a body',async()=>{
 const calls=[];await api(()=>({status:204}),calls).restore(basis(true));assert.equal(calls[0].options.method,'DELETE');assert.match(calls[0].url,/2026-10-24\?scheduleVersion=2$/);assert.equal(calls[0].options.body,undefined);
 await assert.rejects(api(()=>({data:{}})).restore(basis(true)),e=>e.code==='INVALID_RESPONSE');
});
test('restore without an exception and malformed targets never send HTTP',async()=>{
 const calls=[],client=api(()=>({status:204}),calls);await assert.rejects(client.restore(basis()),e=>e.code==='CLASS_EXCEPTION_NOT_FOUND');
 await assert.rejects(client.readDay({...target,scheduleId:'demo'}));assert.equal(calls.length,0);
});
test('conflict, DST validation and field errors survive the HTTP boundary',async()=>{
 for(const [status,code] of [[409,'SCHEDULE_TIME_CONFLICT'],[400,'INVALID_CLASS_EXCEPTION']])await assert.rejects(api(()=>({status,problem:{code,detail:'Giờ thực tế không hợp lệ ngày 24/10/2026'}})).save(basis(),input()),e=>e.code===code&&e.message.includes('24/10/2026'));
});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
async function manager(exceptions){const m=new ScheduleManager({list:async()=>[]},exceptions);await m.load(query);return m;}
test('double click sends one exception write and invalidates the calendar on success',async()=>{
 const d=deferred();let calls=0;const m=await manager({save:()=>{calls++;return d.promise;}});const first=m.saveException(basis(),input());await assert.rejects(m.saveException(basis(),input()),e=>e.code==='REQUEST_BUSY');d.resolve(raw({scheduleVersion:3}));await first;assert.equal(calls,1);assert.equal(m.state.loaded,false);assert.equal(m.state.revision,1);m.dispose();
});
test('lost response records the exact target; a series refresh or acknowledgement cannot clear it',async()=>{
 const m=await manager({save:async()=>{throw new ApiError('offline','NETWORK_ERROR');}});await assert.rejects(m.saveException(basis(),input()));assert.deepEqual(m.state.pendingOccurrence,target);await m.load(query);
 assert.equal(m.acknowledge(),false);assert.equal(m.acknowledge({...target,date:'2026-11-02'}),false);assert.equal(m.state.needsReload,true);assert.equal(m.acknowledge(target),true);assert.equal(m.state.pendingOccurrence,null);m.dispose();
});
test('restore conflict keeps the current exception and allows a later corrected attempt',async()=>{
 let calls=0;const m=await manager({restore:async()=>{if(++calls===1)throw new ApiError('trùng','SCHEDULE_TIME_CONFLICT',409);}});await assert.rejects(m.restoreException(basis(true)));assert.equal(m.state.loaded,true);assert.equal(m.state.revision,0);assert.equal(m.state.needsReload,false);await m.restoreException(basis(true));assert.equal(m.state.revision,1);m.dispose();
});
test('late restored result cannot publish after account disposal',async()=>{
 const d=deferred(),m=await manager({restore:()=>d.promise});const pending=m.restoreException(basis(true));const rejected=assert.rejects(pending,e=>e.code==='REQUEST_CANCELLED');m.dispose();d.resolve();await rejected;assert.equal(m.state.revision,0);
});
