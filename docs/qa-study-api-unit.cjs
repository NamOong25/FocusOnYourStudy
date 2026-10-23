const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const out=path.resolve(__dirname,'../.expo/qa-study-api/unit');
for(const name of ['shared/api/http','shared/utils/dates','features/study/studyTime','features/study/studyLinks','features/study/api/studyApi','features/study/api/StudyManager','features/assignments/assignments']){
  const dest=path.join(out,name+'.js');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src',name+'.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText);
}
const {createStudyApi}=require(path.join(out,'features/study/api/studyApi.js'));
const {StudyManager}=require(path.join(out,'features/study/api/StudyManager.js'));
const {studyTiming,studyOverlaps,studyEndTimestamp}=require(path.join(out,'features/study/studyTime.js'));
const {withLocalFocus,focusLinkInvalid}=require(path.join(out,'features/study/studyLinks.js'));
const {sessionExceedsDeadline}=require(path.join(out,'features/assignments/assignments.js'));
const {ApiError}=require(path.join(out,'shared/api/http.js'));
const id='12345678-1234-1234-1234-123456789012',courseId='22345678-1234-1234-1234-123456789012',assignmentId='32345678-1234-1234-1234-123456789012';
const raw={id,courseId,assignmentId,title:'Ôn Java',startsAt:'2026-11-06T12:00:00Z',endsAt:'2026-11-06T12:45:00Z',timeZone:'Asia/Ho_Chi_Minh',durationMinutes:45,status:'PLANNED',notes:'Ghi chú',version:0};
function transport(data=[raw],status=200){const calls=[];return {calls,api:createStudyApi('http://localhost:8080',work=>work('in-memory'),{fetcher:async(url,options)=>{calls.push({url,...options});return new Response(status===204?null:JSON.stringify(status>=400?data:{data}),{status});}})};}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {resolve,promise};};
(async()=>{
  const cases=[],test=async(name,work)=>{await work();cases.push(name);};
  const row=(await transport().api.list())[0],input={title:row.title,courseId:row.courseId,taskId:row.taskId,date:row.date,start:row.start,duration:row.duration,status:row.status,notes:row.notes};
  function fixture(){const calls={list:0,save:0,remove:0},api={async list(){calls.list++;return [row];},async save(value){calls.save++;return {...row,...value,version:1};},async remove(){calls.remove++;}};return {calls,api,manager:new StudyManager(api)};}
  await test('all-account list uses Bearer without cookies; keeps canonical instant, zone, version and no fake focus',async()=>{
    const f=transport(),[r]=await f.api.list();assert.equal(r.status,'Đã lên lịch');assert.equal(r.startsAt,raw.startsAt);assert.equal(r.timeZone,raw.timeZone);assert.equal(r.focusedSeconds,0);assert.equal(r.taskId,assignmentId);
    assert.equal(studyEndTimestamp(r),Date.parse(raw.endsAt));assert.equal(f.calls[0].credentials,'omit');assert.equal(f.calls[0].headers.Authorization,'Bearer in-memory');assert.ok(f.calls[0].url.endsWith('/study-sessions'));
  });
  await test('create allowlists fields, trims text and maps optional assignment/status',async()=>{
    const f=transport({...raw,assignmentId:null});await f.api.save({...input,taskId:undefined,title:'  Tên mới  ',notes:' ghi chú ',id:'preview',version:999,focusedSeconds:999,userId:'other'});
    const body=JSON.parse(f.calls[0].body);assert.equal(body.title,'Tên mới');assert.equal(body.notes,'ghi chú');assert.equal(body.assignmentId,null);assert.equal(f.calls[0].method,'POST');assert.deepEqual(Object.keys(body).sort(),['assignmentId','courseId','durationMinutes','notes','startsAt','status','timeZone','title']);
    assert.equal((await transport([{...raw,assignmentId:null}]).api.list())[0].taskId,undefined);
  });
  await test('status/text edit keeps exact original instant/timezone and immutable expected version',async()=>{
    const f=transport({...raw,version:1,status:'COMPLETED'});await f.api.save({...input,status:'Hoàn thành',version:999},row);const body=JSON.parse(f.calls[0].body);assert.equal(body.startsAt,raw.startsAt);assert.equal(body.timeZone,raw.timeZone);assert.equal(body.version,0);assert.equal(body.status,'COMPLETED');assert.equal(f.calls[0].method,'PUT');
    const d=transport(null,204);await d.api.remove(row);assert.ok(d.calls[0].url.endsWith(id+'?version=0'));assert.equal(d.calls[0].body,undefined);
  });
  await test('invalid expected versions and invalid/midnight dates never send a mutation',async()=>{
    const f=transport(raw);for(const version of [undefined,-1,Number.MAX_SAFE_INTEGER+1]){await assert.rejects(f.api.save(input,{...row,version}));await assert.rejects(f.api.remove({...row,version}));}
    for(const patch of [{date:'2026-02-30'},{date:'1899-01-01'},{date:'2100-01-01'},{start:'24:00'},{duration:0},{duration:241},{duration:1.5},{start:'23:15',duration:45}])await assert.rejects(f.api.save({...input,...patch}),e=>e.code==='INVALID_STUDY_TIME');assert.equal(f.calls.length,0);
  });
  for(const [key,value] of [['id','preview'],['courseId','preview'],['assignmentId','preview'],['title',''],['title','x'.repeat(201)],['notes',null],['notes','x'.repeat(5001)],['version',-1],['status','constructor'],['durationMinutes',0],['durationMinutes',1.5],['durationMinutes',241],['timeZone','Mars/Base'],['startsAt','2026-11-06T12:00:00'],['startsAt','not-a-date'],['endsAt','2026-11-06T12:44:00Z']])await test('reject malformed response '+key+'/'+String(value).slice(0,20),async()=>{await assert.rejects(transport([{...raw,[key]:value}]).api.list(),e=>e.code==='INVALID_RESPONSE');});
  await test('duplicate/non-array response and overnight stored-zone range rejected',async()=>{await assert.rejects(transport([raw,raw]).api.list());await assert.rejects(transport({items:[]}).api.list());await assert.rejects(transport([{...raw,startsAt:'2026-11-06T16:30:00Z',endsAt:'2026-11-06T17:15:00Z'}]).api.list());});
  await test('backend conflicts localized and field errors allowlisted',async()=>{
    await assert.rejects(transport({code:'STUDY_TIME_CONFLICT',detail:'SQL secret'},409).api.list(),e=>!e.message.includes('SQL')&&e.message!=='STUDY_TIME_CONFLICT');
    await assert.rejects(transport({code:'VALIDATION_FAILED',errors:[{field:'startsAt',message:'Sai giờ'},{field:'timeZone',message:'Sai múi giờ'},{field:'passwordHash',message:'secret'}]},400).api.list(),e=>e.fields.startsAt==='Sai giờ'&&e.fields.timeZone==='Sai múi giờ'&&!e.fields.passwordHash);
  });
  await test('initial error differs from confirmed empty; cannot write before successful read',async()=>{const f=fixture();f.api.list=async()=>{throw new ApiError('offline','NETWORK_ERROR');};await assert.rejects(f.manager.reload());assert.equal(f.manager.state.loaded,false);await assert.rejects(f.manager.save(input));f.api.list=async()=>[];await f.manager.reload();assert.equal(f.manager.state.loaded,true);assert.deepEqual(f.manager.state.sessions,[]);});
  await test('GET coalesces, pending read blocks write',async()=>{const f=fixture(),held=deferred();f.api.list=()=>held.promise;const a=f.manager.reload();assert.equal(a,f.manager.reload());await assert.rejects(f.manager.save(input));held.resolve([row]);await a;});
  await test('no optimistic writes; duplicate actions and reload blocked until completion',async()=>{const f=fixture(),held=deferred();await f.manager.reload();f.api.save=()=>{f.calls.save++;return held.promise;};const a=f.manager.save({...input,title:'Draft'},row);assert.equal(f.manager.state.sessions[0].title,row.title);await assert.rejects(f.manager.save(input));await assert.rejects(f.manager.remove(row));await assert.rejects(f.manager.reload());held.resolve({...row,version:1});await a;assert.equal(f.calls.save,1);});
  for(const error of [new ApiError('lost','NETWORK_ERROR'),new ApiError('timeout','REQUEST_TIMEOUT'),new ApiError('conflict','STUDY_SESSION_VERSION_CONFLICT',409),new ApiError('deleted','STUDY_SESSION_NOT_FOUND',404),new ApiError('server','DATABASE_UNAVAILABLE',503)])await test('uncertain failure requires read before retry '+error.code,async()=>{const f=fixture();await f.manager.reload();f.api.save=async()=>{f.calls.save++;throw error;};await assert.rejects(f.manager.save(input,row));assert.equal(f.manager.state.needsReload,true);assert.equal(f.manager.state.sessions[0].version,0);await assert.rejects(f.manager.save(input,row));assert.equal(f.calls.save,1);await f.manager.reload();assert.equal(f.manager.state.needsReload,false);});
  await test('confirmed save remains successful if follow-up GET fails',async()=>{const f=fixture();await f.manager.reload();f.api.list=async()=>{throw new ApiError('offline','NETWORK_ERROR');};const saved=await f.manager.save({...input,title:'Confirmed'},row);assert.equal(saved.version,1);assert.equal(f.manager.state.sessions[0].title,'Confirmed');assert.equal(f.manager.state.needsReload,true);assert.equal(f.manager.state.busy,false);});
  await test('failed delete retains row; confirmed delete plus GET failure keeps row absent',async()=>{const f=fixture();await f.manager.reload();f.api.remove=async()=>{throw new ApiError('lost','NETWORK_ERROR');};await assert.rejects(f.manager.remove(row));assert.equal(f.manager.state.sessions.length,1);await f.manager.reload();f.api.remove=async()=>{};f.api.list=async()=>{throw new ApiError('offline','NETWORK_ERROR');};await f.manager.remove(row);assert.equal(f.manager.state.sessions.length,0);assert.equal(f.manager.state.needsReload,true);});
  await test('400 preserves catalogue and allows corrected draft',async()=>{const f=fixture();await f.manager.reload();f.api.save=async()=>{throw new ApiError('invalid','VALIDATION_FAILED',400);};await assert.rejects(f.manager.save(input));assert.equal(f.manager.state.needsReload,false);assert.equal(f.manager.state.sessions[0],row);});
  await test('dispose fences late reads/writes from previous account',async()=>{for(const kind of ['read','write']){const f=fixture(),held=deferred();if(kind==='write')await f.manager.reload();let changes=0;f.manager.subscribe(()=>changes++);if(kind==='read')f.api.list=()=>held.promise;else f.api.save=()=>held.promise;const pending=kind==='read'?f.manager.reload():f.manager.save(input,row);f.manager.dispose();const before=changes;held.resolve(kind==='read'?[row]:{...row,version:1});await assert.rejects(pending,e=>e.code==='REQUEST_CANCELLED');assert.equal(changes,before);}});
  await test('overlap uses instants and half-open boundaries, not device clock text',async()=>{
    assert.equal(studyOverlaps(row,{...row,startsAt:raw.endsAt}),false);assert.equal(studyOverlaps(row,{...row,startsAt:'2026-11-06T12:44:00Z'}),true);
    assert.equal(sessionExceedsDeadline({deadline:row.date,deadlineTime:'00:00',dueAt:raw.endsAt},row),false);assert.equal(sessionExceedsDeadline({deadline:row.date,dueAt:'2026-11-06T12:44:59Z'},row),true);
  });
  await test('manual completion credits zero focus; local focus overlays do not alter server status/version',async()=>{
    const completed={...row,status:'Hoàn thành'};assert.equal(withLocalFocus([completed],[])[0].focusedSeconds,0);
    const records=[{studySessionId:id,source:'timer',studySeconds:1500},{studySessionId:id,source:'sample',studySeconds:999}];
    const [r]=withLocalFocus([row],records);assert.equal(r.focusedSeconds,1500);assert.equal(r.status,row.status);assert.equal(r.version,0);assert.equal(r.startsAt,raw.startsAt);assert.equal(focusLinkInvalid([r],id,courseId,assignmentId),false);assert.equal(focusLinkInvalid([completed],id,courseId,assignmentId),true);assert.equal(focusLinkInvalid([],id,courseId,assignmentId),true);assert.equal(focusLinkInvalid([{...row,taskId:undefined}],id,courseId,assignmentId),true);
  });
  await test('DST gap rejected, fallback later instant and stored zone retained across devices',async()=>{
    const code=`const assert=require('node:assert/strict');const {studyTiming}=require(${JSON.stringify(path.join(out,'features/study/studyTime.js'))});const input=${JSON.stringify(input)};assert.throws(()=>studyTiming({...input,date:'2026-03-08',start:'02:30'}));const original={...input,date:'2026-11-01',start:'01:30',startsAt:'2026-11-01T06:30:00Z',timeZone:'America/New_York'};assert.equal(studyTiming({...original,status:'Hoàn thành'},original).startsAt,original.startsAt);const travel={...input,date:'2026-11-06',start:'22:00',startsAt:'2026-11-07T03:00:00Z',timeZone:'Asia/Ho_Chi_Minh'};assert.equal(studyTiming(travel,travel).timeZone,'Asia/Ho_Chi_Minh');`;
    require('node:child_process').execFileSync(process.execPath,['-e',code],{env:{...process.env,TZ:'America/New_York'},stdio:'pipe'});
  });
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({passed:true,checks:cases.length,cases},null,2));console.log(JSON.stringify({passed:true,checks:cases.length,cases},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
