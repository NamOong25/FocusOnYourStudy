const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,filename);
const {createNotificationReadApi,parseReadSnapshot,sameBasis}=require('../src/features/notifications/api/notificationReadApi.ts');
const {describeReminders,descriptorKey}=require('../src/features/notifications/api/notificationDescriptors.ts');
const {NotificationReadManager}=require('../src/features/notifications/api/NotificationReadManager.ts');
const {ApiError}=require('../src/shared/api/http.ts');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
const time='2026-10-30T00:00:00Z',basis={sourceVersion:0,courseVersion:0,semesterVersion:0};
const desc=(id='one',patch={})=>({id,localRevision:'local-'+id,target:{kind:'ASSIGNMENT',sourceId:id==='one'?A:B,occurrenceDate:null},basis:{...basis},...patch});
const state=(d,read=false,patch={})=>({target:d.target,available:true,revision:'a'.repeat(64),basis:{...d.basis},read,readAt:read?time:null,...patch});
const snapshot=items=>({asOf:time,items});
const seen=d=>({id:d.id,localRevision:d.localRevision});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(extra={}) {
 const saved=new Map(),calls={queries:[],writes:[]};
 const api={async query(targets){calls.queries.push(targets);return snapshot(targets.map(target=>{const d=desc(target.sourceId,{target});return state(d,saved.has(JSON.stringify(target)))}));},async mark(items){calls.writes.push(items);for(const x of items)saved.set(JSON.stringify(x.target),true);return snapshot(items.map(x=>state(desc('',{target:x.target}),true,{revision:x.revision})));},...extra};
 return{api,calls,saved,manager:new NotificationReadManager(api)};
}
async function load(f,items=[desc()]){f.manager.setFrame(items);await f.manager.reload();return items;}

test('parser accepts unread/read/unavailable and exact expected target ordering',()=>{
 const d=desc();assert.equal(parseReadSnapshot(snapshot([state(d)]),[d.target]).items[0].read,false);
 assert.equal(parseReadSnapshot(snapshot([state(d,true)]),[d.target],true).items[0].read,true);
 assert.equal(parseReadSnapshot(snapshot([state(d,false,{available:false,revision:null,basis:null})]),[d.target]).items[0].available,false);
});
for(const [field,value] of Object.entries({available:'true',read:'false',revision:'bad',basis:null,readAt:time,target:{kind:'ASSIGNMENT',sourceId:B,occurrenceDate:null}}))test('parser rejects malformed confirmation: '+field,()=>{
 const d=desc();assert.throws(()=>parseReadSnapshot(snapshot([state(d,false,{[field]:value})]),[d.target]),e=>e.code==='INVALID_NOTIFICATION_RESPONSE');
});
test('parser rejects missing/extra/duplicate response targets and impossible read values',()=>{
 const a=desc(),b=desc('two');for(const rows of [[],[state(a),state(a)],[state(a),state(b),state(a)]])assert.throws(()=>parseReadSnapshot(snapshot(rows),[a.target,b.target]));
 assert.throws(()=>parseReadSnapshot(snapshot([state(a,true,{readAt:null})]),[a.target]));
 assert.throws(()=>parseReadSnapshot(snapshot([state(a,false,{available:false,revision:null,basis:null,read:true,readAt:time})]),[a.target]));
 assert.throws(()=>parseReadSnapshot({asOf:'bad',items:[]},[]));
});
test('impossible timestamps and unsafe version numbers are not normalized into confirmations',()=>{
 const d=desc();for(const asOf of ['2026-02-30T00:00:00Z','2026-10-30T24:00:00Z','2026-10-30T00:00:00.1234567Z'])assert.throws(()=>parseReadSnapshot({asOf,items:[state(d)]},[d.target]));
 assert.throws(()=>parseReadSnapshot(snapshot([state(d,false,{basis:{...basis,sourceVersion:Number.MAX_SAFE_INTEGER+1}})]),[d.target]));
});
test('API sends authenticated query and immutable observed-revision PUT, not owner data',async()=>{
 const d=desc(),requests=[];
 const api=createNotificationReadApi('http://api',async op=>op('token'),{fetcher:async(url,init)=>{
  requests.push({url,init});return new Response(JSON.stringify({data:snapshot([state(d,init.method==='PUT')])}),{status:200});
 }});
 await api.query([d.target]);await api.mark([{target:d.target,revision:'a'.repeat(64)}]);
 assert.match(requests[0].url,/notification-read-states\/query$/);assert.equal(requests[0].init.headers.Authorization,'Bearer token');
 assert.equal(requests[1].init.method,'PUT');assert.equal(JSON.parse(requests[1].init.body).items[0].revision,'a'.repeat(64));assert.doesNotMatch(requests[1].init.body,/userId|password/);
});
test('API rejects revision substitution in successful PUT response',async()=>{
 const d=desc(),api=createNotificationReadApi('http://api',async op=>op('token'),{fetcher:async()=>new Response(JSON.stringify({data:snapshot([state(d,true,{revision:'b'.repeat(64)})])}),{status:200})});
 await assert.rejects(api.mark([{target:d.target,revision:'a'.repeat(64)}]),e=>e.code==='INVALID_NOTIFICATION_RESPONSE');
});
test('API enforces bounded unique keys before HTTP',async()=>{
 let n=0;const api=createNotificationReadApi('http://api',async op=>{n++;return op('token')});const d=desc();
 await assert.rejects(api.query([d.target,d.target]));await assert.rejects(api.query(Array(201).fill(d.target)));await assert.rejects(api.mark([]));await assert.rejects(api.query([{...d.target,kind:'CLASS'}]));assert.equal(n,0);
});
test('descriptor uses displayed source/course/semester versions and original class date',()=>{
 const sources={tasks:[{id:A,courseId:B,version:3}],courses:[{id:B,semesterId:C,version:4}],semesters:[{id:C,version:5}],exams:[],rows:[{scheduleId:A,date:'2026-10-31',courseId:B,scheduleVersion:8}]};
 const reminders=[{id:'task:'+A,revision:'shown',target:{kind:'task',id:A}},{id:'saved-class:'+A+':2026-10-31',revision:'lesson',target:{kind:'saved-class',id:A,date:'2026-10-31'}}];
 const rows=describeReminders(reminders,sources,new Date(time));assert.deepEqual(rows[0].basis,{sourceVersion:3,courseVersion:4,semesterVersion:5});assert.equal(rows[1].target.occurrenceDate,'2026-10-31');assert.equal(rows[1].basis.sourceVersion,8);
 assert.notEqual(descriptorKey(rows),descriptorKey([{...rows[0],basis:{...rows[0].basis,sourceVersion:9}},rows[1]]));
});
test('exam descriptor carries latest reached milestone while ordinary ticks remain stable',()=>{
 const e={id:A,courseId:B,version:0,startsAt:'2026-10-30T03:00:00Z',reminderMinutes:[180,60,0]},r={id:'exam',revision:'at180',target:{kind:'saved-exam',id:A}};
 const s={tasks:[],courses:[{id:B,semesterId:C,version:0}],semesters:[{id:C,version:0}],exams:[e],rows:[]};
 assert.equal(describeReminders([r],s,new Date(time))[0].basis.milestoneMinutes,180);
 assert.equal(describeReminders([r],s,new Date('2026-10-30T02:00:00Z'))[0].basis.milestoneMinutes,60);
 assert.equal(describeReminders([r],s,new Date('2026-10-30T03:00:00Z'))[0].basis.milestoneMinutes,0);
 assert.throws(()=>describeReminders([r],s,new Date('2026-10-29T23:59:59Z')));
});
test('preview/missing versions cannot become authenticated read descriptors',()=>{
 const s={tasks:[{id:A,courseId:B}],courses:[{id:B,semesterId:C,version:0}],semesters:[{id:C,version:0}],exams:[],rows:[]};
 assert.throws(()=>describeReminders([{id:'t',revision:'x',target:{kind:'task',id:A}}],s,new Date(time)));
 assert.throws(()=>describeReminders([{id:'e',revision:'x',target:{kind:'exam',id:A}}],s,new Date(time)));
});
test('new manager restores receipts from API, without local account storage',async()=>{
 const f=fixture();await load(f);await f.manager.mark([seen(desc())]);assert.equal(f.manager.state.rows.one.state.read,true);f.manager.dispose();
 const next=new NotificationReadManager(f.api);next.setFrame([desc()]);await next.reload();assert.equal(next.state.rows.one.state.read,true);next.dispose();
});
test('only server confirmation marks read and busy blocks repeated taps',async()=>{
 const gate=deferred(),f=fixture({mark:()=>gate.promise});await load(f);const work=f.manager.mark([seen(desc())]);
 assert.equal(f.manager.state.busy,true);assert.equal(f.manager.state.rows.one.state.read,false);await assert.rejects(f.manager.mark([seen(desc())]),e=>e.code==='NOTIFICATION_NOT_READY');
 gate.resolve(snapshot([state(desc(),true)]));await work;assert.equal(f.manager.state.rows.one.state.read,true);assert.equal(f.manager.state.busy,false);
});
test('basis mismatch cannot attach a fresh server revision to stale displayed content',async()=>{
 const f=fixture({query:async()=>snapshot([state(desc(),false,{basis:{...basis,sourceVersion:1}})])});f.manager.setFrame([desc()]);await assert.rejects(f.manager.reload(),e=>e.code==='NOTIFICATION_SOURCES_CHANGED');assert.equal(f.manager.state.loaded,false);assert.equal(f.manager.state.sourceMismatch,true);await assert.rejects(f.manager.mark([seen(desc())]));
});
test('new metadata or milestone basis is also gated, not just source version',()=>{
 assert.equal(sameBasis({...basis,courseVersion:1},basis),false);assert.equal(sameBasis({...basis,semesterVersion:1},basis),false);assert.equal(sameBasis({...basis,milestoneMinutes:60},{...basis,milestoneMinutes:180}),false);
});
test('unavailable source never becomes a plausible zero/unread confirmation',async()=>{
 const f=fixture({query:async()=>snapshot([state(desc(),false,{available:false,basis:null,revision:null})])});f.manager.setFrame([desc()]);await assert.rejects(f.manager.reload());assert.equal(f.manager.state.loaded,false);assert.deepEqual(f.manager.state.rows,{});
});
test('new displayed content aborts old read and drops a late response even if fetch ignores abort',async()=>{
 const gate=deferred(),f=fixture({query:()=>gate.promise});f.manager.setFrame([desc()]);const old=f.manager.reload();f.manager.setFrame([desc('two')]);gate.resolve(snapshot([state(desc())]));await assert.rejects(old,e=>e.code==='REQUEST_CANCELLED');assert.deepEqual(f.manager.state.rows,{});assert.equal(f.manager.state.key,descriptorKey([desc('two')]));
});
test('failed source read is an error, never loaded 0/read success',async()=>{
 const f=fixture({query:async()=>{throw new ApiError('offline','NETWORK_ERROR')}});f.manager.setFrame([desc()]);await assert.rejects(f.manager.reload());assert.equal(f.manager.state.loaded,false);assert.equal(f.manager.state.error.code,'NETWORK_ERROR');
});
test('lost write response requires explicit reconcile and never retries the PUT',async()=>{
 const f=fixture();await load(f);const mark=f.api.mark;f.api.mark=async(...args)=>{await mark(...args);throw new ApiError('lost','NETWORK_ERROR')};await assert.rejects(f.manager.mark([seen(desc())]));
 assert.equal(f.manager.state.needsReload,true);await f.manager.reload();assert.equal(f.calls.writes.length,1);assert.equal(f.manager.state.loaded,false);
 await f.manager.reload(true);assert.equal(f.manager.state.needsReload,false);assert.equal(f.manager.state.rows.one.state.read,true);assert.equal(f.calls.writes.length,1);
});
test('409/404 do not automatically adopt a new revision and retry',async()=>{
 for(const [code,status] of [['NOTIFICATION_REVISION_CONFLICT',409],['NOTIFICATION_SOURCE_UNAVAILABLE',404]]){
  let writes=0;const f=fixture({mark:async()=>{writes++;throw new ApiError('changed',code,status)}});await load(f);await assert.rejects(f.manager.mark([seen(desc())]));await f.manager.reload();assert.equal(writes,1);assert.equal(f.manager.state.needsReload,true);
 }
});
test('mark-all sends only the items actually seen, excluding newly arrived items',async()=>{
 const f=fixture(),a=desc(),b=desc('two');await load(f,[a,b]);await f.manager.mark([seen(a)]);assert.equal(f.calls.writes[0].length,1);assert.equal(f.calls.writes[0][0].target.sourceId,A);assert.equal(f.manager.state.rows.two.state.read,false);
});
test('stale click or duplicate seen entries cannot start a PUT',async()=>{
 const f=fixture();await load(f);await assert.rejects(f.manager.mark([{id:'one',localRevision:'old'}]));await assert.rejects(f.manager.mark([seen(desc()),seen(desc())]));assert.equal(f.calls.writes.length,0);
});
test('empty inbox is confirmed without network and never writes',async()=>{
 const f=fixture();await load(f,[]);assert.equal(f.manager.state.loaded,true);assert.equal(f.calls.queries.length,0);await f.manager.mark([]);assert.equal(f.calls.writes.length,0);
});
function many(n){return Array.from({length:n},(_,i)=>desc('id'+i,{target:{kind:'ASSIGNMENT',sourceId:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,occurrenceDate:null}}));}
test('large inbox queries and marks in bounded batches of200 with explicit partial outcome',async()=>{
 const items=many(405),f=fixture();await load(f,items);assert.deepEqual(f.calls.queries.map(x=>x.length),[200,200,5]);
 const original=f.api.mark;let n=0;f.api.mark=async(...args)=>{if(++n===2)throw new ApiError('lost','NETWORK_ERROR');return original(...args)};
 await assert.rejects(f.manager.mark(items.map(seen)));assert.equal(n,2);assert.equal(f.saved.size,200);assert.match(f.manager.state.message,/200\/405/);assert.equal(f.manager.state.needsReload,true);
});
test('source changes between PUT and response require a fresh content check',async()=>{
 const f=fixture({mark:async()=>snapshot([state(desc(),true,{basis:{...basis,courseVersion:1}})])});await load(f);await assert.rejects(f.manager.mark([seen(desc())]));assert.equal(f.manager.state.needsReload,true);assert.equal(f.manager.state.loaded,false);
});
test('disposing an old owner ignores in-flight reads and writes and emits no signal',async()=>{
 for(const writing of [false,true]){
  const gate=deferred(),f=fixture();let signals=0;const m=new NotificationReadManager(f.api,()=>signals++);m.setFrame([desc()]);await m.reload();
  if(writing)f.api.mark=()=>gate.promise;else f.api.query=()=>gate.promise;
  const work=writing?m.mark([seen(desc())]):m.reload();m.dispose();gate.resolve(snapshot([state(desc(),true)]));await assert.rejects(work,e=>e.code==='REQUEST_CANCELLED');assert.equal(signals,0);
 }
});
test('parallel sync reads coalesce and can update receipt changes from another tab',async()=>{
 const f=fixture();await load(f);f.saved.set(JSON.stringify(desc().target),true);await Promise.all([f.manager.reload(),f.manager.reload()]);assert.equal(f.calls.queries.length,2);assert.equal(f.manager.state.rows.one.state.read,true);
});
test('source refresh alone cannot clear unresolved-write guard',async()=>{
 const f=fixture({mark:async()=>{throw new ApiError('lost','NETWORK_ERROR')}});await load(f);await assert.rejects(f.manager.mark([seen(desc())]));f.manager.setFrame(null);f.manager.setFrame([desc('two')]);await f.manager.reload();assert.equal(f.manager.state.needsReload,true);assert.equal(f.manager.state.loaded,false);
});
