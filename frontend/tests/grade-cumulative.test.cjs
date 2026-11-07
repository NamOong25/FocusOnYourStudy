const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {parseCumulativeGpa,cumulativeKey,createCumulativeGpaApi}=require('../src/features/grades/api/cumulativeGpaApi.ts');
const {serverGpaDifference,semesterGpaCaption}=require('../src/features/grades/serverGpaView.ts');
const {GradeReadManager}=require('../src/features/grades/api/GradeReadManager.ts');
// Recorded from an isolated PostgreSQL QA schema; all identities and courses are synthetic.
const fixture=require('./fixtures/cumulative-gpa.json'),fresh=()=>structuredClone(fixture),hasCode=code=>e=>e.code===code;
const parse=f=>parseCumulativeGpa(f.response,f.query);
test('real API snapshot keeps highest-pass selection and all three attempts',()=>{const r=parse(fresh()),g=r.groups.find(g=>g.code==='WEB');assert.equal(r.summary.gpa,2.51);assert.equal(r.summary.state,'PARTIAL');assert.equal(g.attempts.length,3);assert.equal(g.attempts.find(a=>a.id===g.selectedCourseId).result.total,8);assert.ok(g.attempts.some(a=>a.result.status==='FAILED'));assert.ok(g.attempts.some(a=>a.use==='NOT_SELECTED_LOWER_PASS'));});
test('review variants and pending courses are retained with reasons',()=>{const r=parse(fresh());assert.equal(r.summary.reviewGroups,2);assert.equal(r.summary.pendingAttempts,1);assert.ok(r.groups.filter(g=>g.code==='VAR').every(g=>!g.included&&g.reason==='REVIEW_REQUIRED'&&g.otherCredits.length>0));assert.equal(r.groups.find(g=>g.code==='PENDING').selectedCourseId,null);});
test('empty account has null GPA, not zero',()=>{const f=fresh();f.query={semesters:[],courses:[]};f.response.groups=[];for(const k of Object.keys(f.response.summary))f.response.summary[k]=0;Object.assign(f.response.summary,{state:'EMPTY',complete:false,gpa:null});assert.equal(parse(f).summary.gpa,null);});
test('complete F-only snapshot preserves GPA zero and failed credits',()=>{const f=fresh(),g=f.response.groups.find(g=>g.history.code==='FAILED'),a=g.history.attempts[0];f.response.groups=[g];f.query.courses=f.query.courses.filter(c=>c.id===a.course.id);f.query.semesters=f.query.semesters.filter(s=>s.id===a.semester.id);Object.assign(f.response.summary,{state:'COMPLETE',complete:true,gpa:0,weightedGradePoints:0,calculatedCredits:1,earnedCredits:0,failedCredits:1,registeredGroups:1,recordedAttempts:1,repeatedGroups:0,calculatedGroups:1,passedGroups:0,failedGroups:1,excludedGroups:0,reviewGroups:0,pendingAttempts:0});const r=parse(f);assert.equal(r.summary.gpa,0);assert.equal(r.summary.failedCredits,1);assert.equal(r.groups[0].reason,'LATEST_COMPLETE_F');});
const badCases=[
 ['unrecognized policy',f=>f.response.policy.id='OTHER'],
 ['official authority cannot silently replace the app policy',f=>f.response.policy.officialIuhCumulativeVerified=true],
 ['wrong highest-pass rule',f=>f.response.policy.selection='LATEST_ONLY'],
 ['foreign course cannot enter history',f=>f.response.groups[0].history.attempts[0].course.id='00000000-0000-0000-0000-000000000099','GRADE_CATALOG_CHANGED'],
 ['stale course metadata requires catalog reload',f=>f.query.courses[0].version++,'GRADE_CATALOG_CHANGED'],
 ['stale semester metadata requires catalog reload',f=>f.query.semesters[0].version++,'GRADE_CATALOG_CHANGED'],
 ['deleted catalog course requires reload',f=>f.query.courses.pop(),'GRADE_CATALOG_CHANGED'],
 ['omitted history does not become an empty result',f=>{f.response.groups.pop();},'GRADE_CATALOG_CHANGED'],
 ['duplicate course in history is rejected',f=>{const g=f.response.groups[0];g.history.attempts.push(g.history.attempts[0]);}],
 ['selected course must belong to the group',f=>{f.response.groups.find(g=>g.included).selectedCourseId='00000000-0000-0000-0000-000000000099';}],
 ['decision cannot be omitted',f=>{f.response.groups[0].decisions.pop();}],
 ['duplicate decisions are rejected',f=>{const g=f.response.groups[0];g.decisions.push(g.decisions[0]);}],
 ['summary totals cannot contradict group counts',f=>f.response.summary.calculatedGroups++],
 ['credits with null GPA are rejected',f=>f.response.summary.gpa=null],
 ['nonfinite GPA is rejected',f=>f.response.summary.gpa=NaN],
 ['GPA over four is rejected',f=>f.response.summary.gpa=4.1],
 ['partial data cannot claim COMPLETE',f=>{f.response.summary.state='COMPLETE';f.response.summary.complete=true;}],
 ['unknown decision does not invent a display rule',f=>f.response.groups[0].decisions[0].use='GUESS'],
 ['group selected flag must match inclusion',f=>f.response.groups.find(g=>g.included).included=false],
 ['raw course result must obey complete/null contract',f=>f.response.groups.find(g=>g.included).history.attempts[0].course.total=null],
];
for(const [name,mutate,code='INVALID_RESPONSE'] of badCases)test(name,()=>{const f=fresh();mutate(f);assert.throws(()=>parse(f),hasCode(code));});
test('catalog key is order independent and changes with metadata',()=>{const a=fresh().query,b=structuredClone(a);b.courses.reverse();b.semesters.reverse();assert.equal(cumulativeKey(a),cumulativeKey(b));b.courses[0].version++;assert.notEqual(cumulativeKey(a),cumulativeKey(b));});
test('invalid queries never make an HTTP request',async()=>{let calls=0;const api=createCumulativeGpaApi('http://qa',async fn=>fn('fake'),{fetcher:async()=>{calls++;throw Error('unexpected');}}),q=fresh().query;q.courses[0].semesterId='00000000-0000-0000-0000-000000000099';await assert.rejects(api.read(q),hasCode('INVALID_GRADE_QUERY'));assert.equal(calls,0);});
test('cumulative endpoint uses bearer GET, caller abort signal and no credentials',async()=>{const f=fresh(),controller=new AbortController();let captured;const api=createCumulativeGpaApi('http://qa',async(fn,signal)=>{assert.equal(signal,controller.signal);return fn('qa-fake');},{fetcher:async(url,init)=>{captured={url,init};return new Response(JSON.stringify({data:f.response}),{status:200});}});assert.equal((await api.read(f.query,controller.signal)).summary.gpa,2.51);assert.equal(String(captured.url),'http://qa/api/v1/gpa/cumulative');assert.equal(captured.init.method??'GET','GET');assert.equal(captured.init.headers.Authorization,'Bearer qa-fake');assert.equal(captured.init.credentials,'omit');assert.equal(captured.init.body,undefined);});
test('comparison distinguishes absent GPA from zero and keeps partial label',()=>{const a={gpa:0,state:'COMPLETE'},b={gpa:3.62,state:'PARTIAL'};assert.deepEqual(serverGpaDifference(a,b),{amount:3.62,provisional:true});assert.deepEqual(serverGpaDifference(b,a),{amount:-3.62,provisional:true});assert.equal(serverGpaDifference(a,{gpa:null,state:'NO_RESULTS'}),null);assert.deepEqual(serverGpaDifference(a,a),{amount:0,provisional:false});assert.match(semesterGpaCaption(b),/tạm tính/);assert.doesNotMatch(semesterGpaCaption(a),/Chưa đủ/);});
test('late cumulative response cannot replace a newer catalog query',async()=>{let release;const q=fresh().query,next=structuredClone(q);next.courses[0].version++;const manager=new GradeReadManager(query=>query===q?new Promise(resolve=>{release=resolve;}):Promise.resolve('new'),cumulativeKey);const first=manager.load(q);await Promise.resolve();await manager.load(next);release('old');await assert.rejects(first);assert.equal(manager.state.value,'new');manager.dispose();assert.equal(manager.state.value,null);});
