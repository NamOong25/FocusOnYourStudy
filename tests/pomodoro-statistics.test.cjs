const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {ApiError}=require('../src/shared/api/http.ts');
const {statisticsWindow,moveStatistics,statisticsKey,parseStatistics,createStatisticsApi}=require('../src/features/statistics/api/pomodoroStatisticsApi.ts');
const {serverStatisticsView}=require('../src/features/statistics/serverStatisticsView.ts');
const {PomodoroReadManager,visiblePomodoroRead}=require('../src/features/focus/api/PomodoroReadManager.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,code=c=>e=>e.code===c;
const q={period:'WEEK',date:'2026-10-29',timeZone:'Asia/Ho_Chi_Minh'};
const total=count=>({completedSessions:count,studyMillis:count*1500000,studySeconds:count*1500});
const iso=ms=>new Date(ms).toISOString().replace('.000Z','Z');
const group=(count=1,courseId=id(1),semesterId=id(2))=>({courseId,semesterId,courseCode:'JAVA',courseName:'Java đã lưu',semesterTerm:1,semesterStartYear:2026,...total(count)});
function sample(query=q,counts,boundaries){
  const window=statisticsWindow(query.period,query.date),values=counts??window.days.map((_,i)=>i===3?1:0);
  const start=Date.parse(window.fromDate+'T00:00:00Z')-(query.timeZone==='UTC'?0:7*3600000);
  const bounds=boundaries??Array.from({length:window.days.length+1},(_,i)=>iso(start+i*86400000));
  const count=values.reduce((a,b)=>a+b,0);
  return{period:query.period,date:query.date,timeZone:query.timeZone,fromDate:window.fromDate,toDate:window.toDate,from:bounds[0],to:bounds.at(-1),
    filters:{courseId:query.courseId?.toLowerCase()??null,semesterId:query.semesterId?.toLowerCase()??null},...total(count),
    days:window.days.map((date,i)=>({date,from:bounds[i],to:bounds[i+1],...total(values[i]??0)})),
    courses:count?[group(count,query.courseId?.toLowerCase()??id(1),query.semesterId?.toLowerCase()??id(2))]:[]};
}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const tick=()=>new Promise(r=>setImmediate(r));

test('ISO week contains the anchor and crosses the year without device-local arithmetic',()=>{
  assert.deepEqual(statisticsWindow('WEEK','2027-01-01').days,['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
  assert.equal(statisticsWindow('WEEK','2026-10-26').fromDate,'2026-10-26');assert.equal(statisticsWindow('WEEK','2026-11-01').fromDate,'2026-10-26');
});
test('calendar months preserve 28, 29, 30 and 31 individual days',()=>{for(const [date,count]of[['2026-02-15',28],['2024-02-29',29],['2026-04-01',30],['2026-01-31',31]])assert.equal(statisticsWindow('MONTH',date).days.length,count);});
test('navigation advances full months rather than overflowing a day such as January 31',()=>{
  assert.equal(moveStatistics('MONTH','2026-01-31',1),'2026-02-01');assert.equal(moveStatistics('MONTH','2026-01-31',-1),'2025-12-01');
  assert.equal(moveStatistics('WEEK',q.date,1),'2026-11-02');assert.equal(moveStatistics('WEEK',q.date,-1),'2026-10-19');
});
test('invalid queries never escape the supported calendar and UUID/zone constraints',()=>{
  for(const changed of[{period:'DAY'},{date:'2026-02-30'},{date:'2099-12-31'},{date:'1899-12-31'},{timeZone:'Fake/Zone'},{timeZone:'+07:00'},{courseId:'Java'},{semesterId:''}])assert.throws(()=>statisticsKey({...q,...changed}),code('INVALID_POMODORO_STATISTICS_FILTER'));
  assert.equal(statisticsWindow('MONTH','2099-12-31').toDate,'2099-12-31');assert.throws(()=>moveStatistics('MONTH','1900-01-01',-1));
});
test('zero is a valid loaded response, with all days and no fabricated course or session',()=>{const value=sample(q,Array(7).fill(0));assert.deepEqual(parseStatistics(value,q),value);assert.deepEqual(serverStatisticsView(value).distribution,[]);});
test('a valid response exposes the same completed totals in its summary, days and courses',()=>{const value=sample(q,[1,0,2,0,0,0,1]);value.courses=[group(3),group(1,id(3))];const parsed=parseStatistics(value,q);assert.equal(parsed.studySeconds,6000);assert.equal(parsed.days.reduce((s,d)=>s+d.completedSessions,0),4);assert.equal(parsed.courses.reduce((s,d)=>s+d.studyMillis,0),6000000);});
test('missing/duplicate days, inconsistent counts and fractional or unsafe totals are rejected',()=>{
  for(const mutate of[v=>v.days.pop(),v=>v.days[1]=v.days[0],v=>v.days[0].studySeconds++,v=>v.completedSessions++,v=>v.courses[0].studyMillis=0,v=>v.studySeconds=NaN,v=>v.studyMillis=Number.MAX_SAFE_INTEGER+1,v=>v.completedSessions=.5,v=>v.courses=[]]){const value=sample();mutate(value);assert.throws(()=>parseStatistics(value,q),code('INVALID_RESPONSE'));}
});
test('a response for a previous filter, date, period or zone cannot be presented as current',()=>{
  for(const changed of[{period:'MONTH'},{date:'2026-10-28'},{timeZone:'UTC'},{courseId:id(5)},{semesterId:id(5)}])assert.throws(()=>parseStatistics(sample(),{...q,...changed}),code('INVALID_RESPONSE'));
});
test('unknown/private fields are stripped from the public result',()=>{const value=sample();value.accessToken='never-show';value.days[0].secret='never-show';value.courses[0].userId=id(999);assert.equal(JSON.stringify(parseStatistics(value,q)).includes('never-show'),false);assert.equal('userId'in parseStatistics(value,q).courses[0],false);});
test('duplicate course/semester groups and groups outside the selected filter are rejected',()=>{
  const value=sample();value.courses.push({...value.courses[0]});assert.throws(()=>parseStatistics(value,q),code('INVALID_RESPONSE'));
  const filter={...q,courseId:id(8)};const filtered=sample(filter);filtered.courses[0].courseId=id(9);assert.throws(()=>parseStatistics(filtered,filter),code('INVALID_RESPONSE'));
});
test('daily boundaries must be contiguous and match the requested calendar zone',()=>{
  const bad=sample();bad.days[0].to=bad.days[1].to;assert.throws(()=>parseStatistics(bad,q),code('INVALID_RESPONSE'));
  const wrong=sample({...q,timeZone:'UTC'});wrong.timeZone=q.timeZone;assert.throws(()=>parseStatistics(wrong,q),code('INVALID_RESPONSE'));
});
test('spring daylight saving day has 23 hours and stays a single chart day',()=>{
  const query={period:'WEEK',date:'2026-03-08',timeZone:'America/New_York'},bounds=Array.from({length:7},(_,i)=>`2026-03-0${i+2}T05:00:00Z`).concat('2026-03-09T04:00:00Z');
  const value=parseStatistics(sample(query,[0,0,0,0,0,0,2],bounds),query);assert.equal(Date.parse(value.days[6].to)-Date.parse(value.days[6].from),23*3600000);assert.equal(serverStatisticsView(value).buckets[6].sessions,2);
});
test('autumn repeated hour gives one 25-hour day without splitting its completed sessions',()=>{
  const query={period:'WEEK',date:'2025-11-02',timeZone:'America/New_York'},bounds=['2025-10-27','2025-10-28','2025-10-29','2025-10-30','2025-10-31','2025-11-01','2025-11-02'].map(d=>d+'T04:00:00Z').concat('2025-11-03T05:00:00Z');
  const value=parseStatistics(sample(query,[0,0,0,0,0,0,2],bounds),query);assert.equal(Date.parse(value.days[6].to)-Date.parse(value.days[6].from),25*3600000);
});
test('a calendar date skipped by a zone remains a zero-width zero-count bucket',()=>{
  const query={period:'WEEK',date:'2011-12-30',timeZone:'Pacific/Apia'},bounds=['2011-12-26T10:00:00Z','2011-12-27T10:00:00Z','2011-12-28T10:00:00Z','2011-12-29T10:00:00Z','2011-12-30T10:00:00Z','2011-12-30T10:00:00Z','2011-12-31T10:00:00Z','2012-01-01T10:00:00Z'];
  const value=sample(query,[0,0,0,1,0,0,0],bounds);assert.equal(parseStatistics(value,query).days[4].date,'2011-12-30');value.days[4]={...value.days[4],...total(1)};assert.throws(()=>parseStatistics(value,query),code('INVALID_RESPONSE'));
});
test('display adapter preserves historical labels and distinct semesters when a course moves',()=>{
  const value=sample(q,[2,0,0,0,0,0,0]);value.courses=[group(),{...group(1,id(1),id(3)),semesterTerm:2}];const view=serverStatisticsView(parseStatistics(value,q),[]);
  assert.equal(view.distribution.length,2);assert.equal(new Set(view.distribution.map(c=>c.id)).size,2);assert.equal(view.distribution[0].name,'Java đã lưu');assert.equal(view.distribution.every(c=>c.archived),true);assert.match(view.distribution[1].semesterCaption,/Học kỳ 2/);assert.equal(view.distribution.reduce((s,c)=>s+c.percent,0),100);
});
test('month display retains every daily bucket without summing days into weekly columns',()=>{const query={...q,period:'MONTH'},value=sample(query),view=serverStatisticsView(value);assert.equal(view.buckets.length,31);assert.equal(view.groupedDays,false);assert.equal(view.buckets.reduce((s,d)=>s+d.seconds,0),value.studySeconds);});
test('catalog absence does not pretend a historical course has been deleted',()=>{assert.equal(serverStatisticsView(sample()).distribution[0].archived,false);assert.equal(serverStatisticsView(sample(),[{id:id(1)}]).distribution[0].archived,false);});
test('API sends the explicit zone, canonical filters, bearer and abort signal through authorized',async()=>{
  const query={...q,courseId:'AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',semesterId:id(2)},controller=new AbortController();let received;
  const api=createStatisticsApi('http://localhost:8080',async(operation,signal)=>{assert.equal(signal,controller.signal);return operation('test-only-token');},{fetcher:async(url,init)=>{received={url:new URL(url),init};return new Response(JSON.stringify({data:sample(query),meta:{}}),{status:200});}});
  assert.equal((await api.read(query,controller.signal)).completedSessions,1);assert.equal(received.url.pathname,'/api/v1/pomodoro-statistics');assert.equal(received.url.searchParams.get('courseId'),query.courseId.toLowerCase());assert.equal(received.url.searchParams.get('timeZone'),q.timeZone);assert.equal(received.init.headers.Authorization,'Bearer test-only-token');assert.ok(received.init.signal);
});
test('API validates before sending a request and preserves genuine server errors',async()=>{
  let sent=0;const api=createStatisticsApi('http://localhost:8080',op=>op('test-only-token'),{fetcher:async()=>{sent++;return new Response(JSON.stringify({code:'INVALID_POMODORO_STATISTICS_FILTER'}),{status:400});}});
  await assert.rejects(api.read({...q,period:'DAY'}),code('INVALID_POMODORO_STATISTICS_FILTER'));assert.equal(sent,0);await assert.rejects(api.read(q),code('INVALID_POMODORO_STATISTICS_FILTER'));assert.equal(sent,1);
});
test('statistics loading clears old values and does not show another account snapshot',async()=>{
  const manager=new PomodoroReadManager(async query=>parseStatistics(sample(query),query),statisticsKey);await manager.load(q);
  assert.equal(visiblePomodoroRead({owner:'A',state:manager.state},'B',manager.state.key).value,null);
  const delayed=deferred();manager.load=manager.load.bind(manager);const other=new PomodoroReadManager(()=>delayed.promise,statisticsKey);const loading=other.load(q);assert.equal(other.state.value,null);assert.equal(other.state.loading,true);delayed.resolve(sample());await loading;manager.dispose();other.dispose();
});
test('late week response cannot replace a newer month selection, even if transport ignores abort',async()=>{
  const delayed=deferred(),month={...q,period:'MONTH'};const manager=new PomodoroReadManager(query=>query.period==='WEEK'?delayed.promise:Promise.resolve(sample(query)),statisticsKey);
  const old=manager.load(q),rejected=assert.rejects(old,code('REQUEST_CANCELLED'));await tick();await manager.load(month);delayed.resolve(sample());await rejected;assert.equal(manager.state.value.period,'MONTH');assert.equal(manager.state.value.days.length,31);manager.dispose();
});
test('a refreshed completion revision hides the old count and publishes the new server total once',async()=>{
  let count=0;const manager=new PomodoroReadManager(async query=>sample(query,[count,0,0,0,0,0,0]),statisticsKey);
  await manager.load(q,'before');count=1;const refresh=manager.load(q,'completed:id:1');assert.equal(manager.state.value,null);await refresh;assert.equal(manager.state.value.completedSessions,1);assert.equal(manager.state.value.studySeconds,1500);await manager.load(q,'completed:id:1');assert.equal(manager.state.value.completedSessions,1);manager.dispose();
});
test('read failures are errors, not zero minutes; retry recovers without changing stored study data',async()=>{
  let fail=true;const manager=new PomodoroReadManager(async query=>{if(fail)throw new ApiError('offline','NETWORK_ERROR');return sample(query);},statisticsKey);
  await assert.rejects(manager.load(q),code('NETWORK_ERROR'));assert.equal(manager.state.value,null);assert.equal(manager.state.loaded,false);fail=false;await manager.load(q);assert.equal(manager.state.value.studySeconds,1500);manager.dispose();
});
test('disposing the statistics request prevents a previous account result from publishing',async()=>{
  const delayed=deferred(),manager=new PomodoroReadManager(()=>delayed.promise,statisticsKey),loading=manager.load(q);const rejected=assert.rejects(loading,code('REQUEST_CANCELLED'));await tick();manager.dispose();delayed.resolve(sample());await rejected;assert.equal(manager.state.value,null);
});
