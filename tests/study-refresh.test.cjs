const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,f);
const {StudyManager}=require('../src/features/study/api/StudyManager.ts');
const gate=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};

test('post-commit refresh waits for the old GET then reads the committed list',async()=>{
  const old=gate(),fresh=gate();let calls=0;
  const m=new StudyManager({list:()=>++calls===1?old.promise:fresh.promise});
  const before=m.reload(),after=m.reloadFresh();old.resolve([]);await before;
  await new Promise(r=>setImmediate(r));assert.equal(calls,2);
  const rows=[{id:'newly-committed'}];fresh.resolve(rows);
  assert.deepEqual(await after,rows);assert.deepEqual(m.state.sessions,rows);
});
test('failure of a pre-commit GET does not suppress the required fresh read',async()=>{
  const old=gate();let calls=0;const rows=[{id:'saved'}];
  const m=new StudyManager({list:()=>++calls===1?old.promise:Promise.resolve(rows)});
  const before=m.reload();const rejected=assert.rejects(before);const after=m.reloadFresh();old.reject(Error('old read failed'));
  await rejected;assert.deepEqual(await after,rows);assert.equal(calls,2);assert.equal(m.state.needsReload,false);
});
test('fresh GET failure is surfaced rather than declaring an old list current',async()=>{
  const old=gate();let calls=0;const m=new StudyManager({list:()=>++calls===1?old.promise:Promise.reject(Error('fresh read failed'))});
  const before=m.reload(),after=m.reloadFresh();const rejected=assert.rejects(after,/fresh read failed/);old.resolve([]);
  await before;await rejected;assert.equal(m.state.needsReload,true);assert.equal(calls,2);
});
test('an old owner disposed while awaiting a GET cannot start the fresh request',async()=>{
  const old=gate();let calls=0;const m=new StudyManager({list:()=>{calls++;return old.promise;}});
  const before=m.reload(),after=m.reloadFresh();const rejected=Promise.all([assert.rejects(before,e=>e.code==='REQUEST_CANCELLED'),assert.rejects(after,e=>e.code==='REQUEST_CANCELLED')]);
  m.dispose();old.resolve([]);await rejected;assert.equal(calls,1);
});
