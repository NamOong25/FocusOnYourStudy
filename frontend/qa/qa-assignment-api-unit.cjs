const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const out=path.resolve(__dirname,'../.expo/qa-assignments-api/unit');
for(const name of ['shared/api/http','shared/utils/dates','features/assignments/assignments','features/assignments/api/assignmentsApi','features/assignments/api/AssignmentManager','features/assignments/assignmentLinks']){
  const dest=path.join(out,name+'.js');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
}
const {createAssignmentsApi}=require(path.join(out,'features/assignments/api/assignmentsApi.js'));
const {AssignmentManager}=require(path.join(out,'features/assignments/api/AssignmentManager.js'));
const {reconcileAssignmentLinks}=require(path.join(out,'features/assignments/assignmentLinks.js'));
const {deadlineTimestamp}=require(path.join(out,'features/assignments/assignments.js'));
const {ApiError}=require(path.join(out,'shared/api/http.js'));
const id='12345678-1234-1234-1234-123456789012',courseId='22345678-1234-1234-1234-123456789012';
const raw={id,courseId,title:'Bài tập Java',dueAt:'2026-10-25T16:59:30.123456Z',priority:'HIGH',status:'TODO',notes:'Ghi chú',version:0};
function transport(data=[raw],status=200){const calls=[];return {calls,api:createAssignmentsApi('http://localhost:8080',work=>work('in-memory'),{fetcher:async(url,options)=>{calls.push({url,...options});return new Response(status===204?null:JSON.stringify(status>=400?data:{data}),{status});}})};}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
(async()=>{
  const cases=[],test=async(name,work)=>{await work();cases.push(name);};
  const row=(await transport().api.list())[0],{id:ignoredId,version:ignoredVersion,dueAt:ignoredAt,course:ignoredCourse,...input}=row;
  function fixture(){const calls={list:0,save:0,remove:0},api={async list(){calls.list++;return [row];},async save(value){calls.save++;return {...row,...value,version:1};},async remove(){calls.remove++;}};return {calls,api,manager:new AssignmentManager(api)};}
  await test('all-account list uses bearer, no cookies; maps status/priority and UTC into local fields',async()=>{
    const f=transport(),tasks=await f.api.list();assert.equal(tasks[0].status,'Chưa làm');assert.equal(tasks[0].priority,'Cao');
    const local=new Date(raw.dueAt);assert.equal(tasks[0].deadlineTime,`${String(local.getHours()).padStart(2,'0')}:${String(local.getMinutes()).padStart(2,'0')}`);
    assert.equal(deadlineTimestamp(tasks[0]),local.getTime());assert.equal(f.calls[0].credentials,'omit');assert.equal(f.calls[0].headers.Authorization,'Bearer in-memory');assert.ok(f.calls[0].url.endsWith('/assignments'));
  });
  await test('create sends allow-listed fields with explicit instant and no preview identity',async()=>{
    const f=transport(raw);await f.api.save({...input,title:'  Tên mới  ',notes:' ghi chú ',id:'preview',version:999,course:'ignored',userId:'other'});
    const body=JSON.parse(f.calls[0].body);assert.equal(f.calls[0].method,'POST');assert.equal(body.title,'Tên mới');assert.equal(body.notes,'ghi chú');assert.equal(body.dueAt,new Date(`${input.deadline}T${input.deadlineTime}:00`).toISOString());assert.deepEqual(Object.keys(body).sort(),['courseId','dueAt','notes','priority','status','title']);
  });
  await test('update retains exact original UTC seconds and microseconds on status/text changes',async()=>{
    const f=transport({...raw,version:1,status:'COMPLETED'});await f.api.save({...input,status:'Hoàn thành'},row);const body=JSON.parse(f.calls[0].body);assert.equal(body.dueAt,raw.dueAt);assert.equal(body.version,0);assert.equal(body.status,'COMPLETED');assert.equal(f.calls[0].method,'PUT');
  });
  await test('changed date/time is converted from local time once; delete sends expected version',async()=>{
    const f=transport(raw);await f.api.save({...input,deadlineTime:'08:15'},row);assert.equal(JSON.parse(f.calls[0].body).dueAt,new Date(input.deadline+'T08:15:00').toISOString());const d=transport(null,204);await d.api.remove(row);assert.ok(d.calls[0].url.endsWith(id+'?version=0'));assert.equal(d.calls[0].body,undefined);
  });
  await test('missing/negative/unsafe versions and malformed dates never write',async()=>{
    const f=transport(raw);for(const version of [undefined,-1,Number.MAX_SAFE_INTEGER+1]){await assert.rejects(f.api.save(input,{...row,version}),e=>e.code==='ASSIGNMENT_VERSION_CONFLICT');await assert.rejects(f.api.remove({...row,version}));}
    for(const deadline of ['2026-02-30','1899-01-01','2101-01-01'])await assert.rejects(f.api.save({...input,deadline}),e=>e.code==='INVALID_DEADLINE');assert.equal(f.calls.length,0);
  });
  for(const [key,value] of [['id','preview'],['courseId','preview'],['title',''],['title','x'.repeat(201)],['notes',null],['notes','x'.repeat(5001)],['version',-1],['status','constructor'],['priority','LOW'],['dueAt','2026-10-25T12:30:00'],['dueAt','not-a-date'],['dueAt','2100-01-01T00:00:00Z']])await test('invalid response rejected: '+key+'/'+String(value).slice(0,20),async()=>{await assert.rejects(transport([{...raw,[key]:value}]).api.list(),e=>e.code==='INVALID_RESPONSE');});
  await test('duplicate IDs and non-array lists rejected; malformed response not cached',async()=>{await assert.rejects(transport([raw,raw]).api.list());await assert.rejects(transport({items:[]}).api.list());});
  await test('business and field errors localized without exposing server internals',async()=>{
    await assert.rejects(transport({code:'ASSIGNMENT_VERSION_CONFLICT',detail:'SQL secret'},409).api.list(),e=>e.message.includes('Nạp bản mới nhất')&&!e.message.includes('SQL'));
    await assert.rejects(transport({code:'VALIDATION_FAILED',errors:[{field:'title',message:'Thiếu tên'},{field:'dueAt',message:'Sai giờ'},{field:'passwordHash',message:'secret'}]},400).api.list(),e=>e.fields.title==='Thiếu tên'&&e.fields.dueAt==='Sai giờ'&&!e.fields.passwordHash);
  });
  await test('initial outage differs from loaded empty and does not enable writes',async()=>{const f=fixture();f.api.list=async()=>{throw new ApiError('offline','NETWORK_ERROR');};await assert.rejects(f.manager.reload());assert.equal(f.manager.state.loaded,false);await assert.rejects(f.manager.save(input),e=>e.code==='ASSIGNMENTS_RELOAD_REQUIRED');f.api.list=async()=>[];await f.manager.reload();assert.equal(f.manager.state.loaded,true);assert.deepEqual(f.manager.state.tasks,[]);});
  await test('readers coalesce; pending read blocks write',async()=>{const f=fixture(),held=deferred();f.api.list=()=>held.promise;const a=f.manager.reload();assert.equal(a,f.manager.reload());await assert.rejects(f.manager.save(input),e=>e.code==='REQUEST_BUSY');held.resolve([row]);await a;});
  await test('pending mutation blocks duplicate mutations/reload without optimistic cache',async()=>{const f=fixture(),held=deferred();await f.manager.reload();f.api.save=()=>{f.calls.save++;return held.promise;};const a=f.manager.save({...input,title:'New'},row);assert.equal(f.manager.state.tasks[0].title,row.title);await assert.rejects(f.manager.save(input));await assert.rejects(f.manager.remove(row));await assert.rejects(f.manager.reload());held.resolve({...row,version:1});await a;assert.equal(f.calls.save,1);});
  for(const error of [new ApiError('lost','NETWORK_ERROR'),new ApiError('timeout','REQUEST_TIMEOUT'),new ApiError('conflict','ASSIGNMENT_VERSION_CONFLICT',409),new ApiError('deleted','ASSIGNMENT_NOT_FOUND',404),new ApiError('server','DATABASE_UNAVAILABLE',503)])await test('uncertain/remote failure blocks replay until read: '+error.code,async()=>{const f=fixture();await f.manager.reload();f.api.save=async()=>{f.calls.save++;throw error;};await assert.rejects(f.manager.save(input,row));assert.equal(f.manager.state.needsReload,true);assert.equal(f.manager.state.tasks[0].version,0);await assert.rejects(f.manager.save(input,row));assert.equal(f.calls.save,1);await f.manager.reload();assert.equal(f.manager.state.needsReload,false);});
  await test('confirmed save plus GET failure stays successful and keeps confirmed version',async()=>{const f=fixture();await f.manager.reload();f.api.list=async()=>{throw new ApiError('offline','NETWORK_ERROR');};const saved=await f.manager.save({...input,title:'Confirmed'},row);assert.equal(saved.version,1);assert.equal(f.manager.state.tasks[0].title,'Confirmed');assert.equal(f.manager.state.needsReload,true);assert.equal(f.manager.state.busy,false);});
  await test('failed delete retains row; confirmed delete plus GET failure keeps it absent',async()=>{const f=fixture();await f.manager.reload();f.api.remove=async()=>{throw new ApiError('lost','NETWORK_ERROR');};await assert.rejects(f.manager.remove(row));assert.equal(f.manager.state.tasks.length,1);await f.manager.reload();f.api.remove=async()=>{};f.api.list=async()=>{throw new ApiError('offline','NETWORK_ERROR');};await f.manager.remove(row);assert.equal(f.manager.state.tasks.length,0);assert.equal(f.manager.state.needsReload,true);});
  await test('validation failure retains catalogue and permits corrected draft',async()=>{const f=fixture();await f.manager.reload();f.api.save=async()=>{throw new ApiError('invalid','VALIDATION_FAILED',400);};await assert.rejects(f.manager.save(input));assert.equal(f.manager.state.needsReload,false);assert.equal(f.manager.state.tasks[0],row);});
  await test('disposing old account fences late reads and writes',async()=>{for(const kind of ['read','write']){const f=fixture(),held=deferred();if(kind==='write')await f.manager.reload();let changes=0;f.manager.subscribe(()=>changes++);if(kind==='read')f.api.list=()=>held.promise;else f.api.save=()=>held.promise;const request=kind==='read'?f.manager.reload():f.manager.save(input,row);f.manager.dispose();const before=changes;held.resolve(kind==='read'?[row]:{...row,version:1});await assert.rejects(request,e=>e.code==='REQUEST_CANCELLED');assert.equal(changes,before);}});
  await test('remote delete/move/earlier deadline detach local sessions, preserve plan and unaffected links',async()=>{
    const session={id:'s1',title:'Study',courseId,taskId:id,date:row.deadline,start:'08:00',duration:30,notes:'Keep',status:'Đã lên lịch',focusedSeconds:123};
    for(const tasks of [[],[{...row,courseId:'other'}],[{...row,dueAt:undefined,deadlineTime:'08:15'}]]){const result=reconcileAssignmentLinks(tasks,[session]);assert.equal(result.studySessions[0].taskId,undefined);assert.equal(result.studySessions[0].title,'Study');assert.equal(result.studySessions[0].focusedSeconds,123);assert.ok(result.detached.has(id));}
    const result=reconcileAssignmentLinks([row],[session,{...session,id:'independent',taskId:undefined}]);assert.equal(result.detached.size,0);assert.equal(result.studySessions[0],session);
  });
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,checks:cases.length,cases},null,2));console.log(JSON.stringify({passed:true,checks:cases.length,cases},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
