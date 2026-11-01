const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {createStudyView,studyViewReducer,studyViewData}=require('../src/features/study/studyView.ts');
const {dateKey}=require('../src/shared/utils/dates.ts');
const first='2026-11-02T12:55:00Z',second='2026-11-03T12:55:00Z';
const row=(id,startsAt,status='Đã lên lịch')=>({id,title:id,courseId:'course',date:dateKey(new Date(startsAt)),start:'19:55',startsAt,duration:45,status,notes:'',focusedSeconds:0});
const saved=()=>({type:'plan-saved',startsAt:[second,first]});

test('saving then closing the receipt exposes the new day without a View schedule action',()=>{
  let view=createStudyView('2026-10-31');const old=[row('old','2026-10-31T12:00:00Z')];
  assert.deepEqual(studyViewData(old,view).list.map(s=>s.id),['old']);
  view=studyViewReducer(view,saved());const rows=[...old,row('new-2',second),row('new-1',first)];
  const shown=studyViewData(rows,view);assert.equal(view.date,dateKey(new Date(first)));assert.deepEqual(shown.list.map(s=>s.id),['new-1']);assert.equal(shown.pending.reduce((n,s)=>n+s.duration,0),45);
});
test('an old Completed/week filter cannot hide a newly saved planned session',()=>{
  const view=studyViewReducer({date:'2026-10-31',period:'Theo tuần',filter:'Hoàn thành'},saved());
  assert.equal(view.filter,'Tất cả');assert.equal(view.period,'Theo ngày');assert.deepEqual(studyViewData([row('new',first)],view).list.map(s=>s.id),['new']);
});
test('only the saved selection determines the first day; another saved batch replaces it',()=>{
  const view=studyViewReducer(createStudyView('2026-10-31'),{type:'plan-saved',startsAt:[second]});
  assert.equal(view.date,dateKey(new Date(second)));assert.equal(studyViewReducer(view,saved()).date,dateKey(new Date(first)));
});
test('refreshing real rows preserves a later edit or deletion rather than injecting receipt snapshots',()=>{
  const view=studyViewReducer(createStudyView('2026-10-31'),saved());
  assert.equal(studyViewData([row('edited',first,'Hoàn thành')],view).pending.length,0);
  assert.equal(studyViewData([],view).list.length,0);
});
test('manual day changes stay selected until a new saved-plan event',()=>{
  const view=studyViewReducer(studyViewReducer(createStudyView('2026-10-31'),saved()),{type:'date',date:'2026-11-05'});
  assert.equal(view.date,'2026-11-05');assert.equal(studyViewData([row('first',first)],view).list.length,0);
});
test('weekly selection includes both saved dates and counts pending minutes independently of filter',()=>{
  let view=studyViewReducer(createStudyView('2026-10-31'),saved());view=studyViewReducer(view,{type:'period',value:'Theo tuần'});
  let data=studyViewData([row('second',second),row('first',first)],view);assert.deepEqual(data.list.map(s=>s.id),['first','second']);assert.equal(data.pending.reduce((n,s)=>n+s.duration,0),90);
  view=studyViewReducer(view,{type:'filter',value:'Hoàn thành'});data=studyViewData([row('first',first)],view);assert.equal(data.list.length,0);assert.equal(data.pending.length,1);
});
test('date selection matches the device-local list date across a midnight and different plan zones',()=>{
  const previous=process.env.TZ;
  try{for(const [zone,expected]of [['Asia/Ho_Chi_Minh','2026-11-02'],['America/Los_Angeles','2026-11-01']]){process.env.TZ=zone;const start='2026-11-02T01:00:00Z',view=studyViewReducer(createStudyView('2026-10-31'),{type:'plan-saved',startsAt:[start]});assert.equal(view.date,expected);assert.equal(studyViewData([row('cross-zone',start)],view).list.length,1);}}
  finally{if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
test('missing/invalid receipt dates and invalid view controls do not corrupt the current view',()=>{
  const view=createStudyView('2026-11-02');for(const action of [{type:'plan-saved',startsAt:[]},{type:'plan-saved',startsAt:['bad']},{type:'date',date:'2026-02-30'},{type:'period',value:'bad'},{type:'filter',value:'bad'}])assert.equal(studyViewReducer(view,action),view);
});
