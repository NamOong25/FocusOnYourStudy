// Calendar logic checks; requires only the project's TypeScript dev dependency.
const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict'); const ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-calendar/unit'); fs.mkdirSync(out, { recursive: true });
for (const name of ['dates','learning','calendar']) { const source = fs.readFileSync(path.resolve(__dirname, `../src/${name}.ts`),'utf8'); fs.writeFileSync(path.join(out, `${name}.js`), ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText); }
const { classOccurrences, calendarEvents, findConflicts, seriesConflicts } = require(path.join(out,'calendar.js'));
const base = { id: 'class', courseId: 'c', title: 'Môn A', weekday: 1, weekdays: [1,3], startsOn: '2026-10-19', endsOn: '2026-11-01', start: '08:00', end: '09:00', room: 'A1', teacher: 'GV A', reminderMinutes: 15 };
const cancelled = { id: 'x1', seriesId: 'class', date: '2026-10-19', kind: 'cancelled', start: '08:00', end: '09:00', room: 'A1', teacher: 'GV A', reason: 'Nghỉ một buổi' };
const changed = { ...cancelled, kind: 'changed', start: '10:00', end: '11:00', room: 'B2' };
assert.equal(classOccurrences('2026-10-18',[base],[]).length,0);
assert.equal(classOccurrences('2026-10-19',[base],[]).length,1);
assert.equal(classOccurrences('2026-10-21',[base],[]).length,1);
assert.equal(classOccurrences('2026-10-23',[base],[]).length,0);
assert.equal(classOccurrences('2026-11-02',[base],[]).length,0);
assert.equal(calendarEvents('2026-10-19',[base],[cancelled],[],[]).length,0);
assert.equal(classOccurrences('2026-10-21',[base],[cancelled])[0].cancelled,false);
assert.equal(classOccurrences('2026-10-19',[base],[changed])[0].room,'B2');
assert.equal(classOccurrences('2026-10-26',[base],[changed])[0].room,'A1');
assert.equal(base.start,'08:00');
const exam = { id:'e', course:'Môn B', date:'2026-10-19', time:'08:30', end:'10:00' };
assert.equal(findConflicts('2026-10-19','08:45','09:15',calendarEvents('2026-10-19',[],[],[exam],[])).length,1);
assert.equal(findConflicts('2026-10-19','09:00','10:00',calendarEvents('2026-10-19',[base],[],[],[])).length,0);
assert.equal(findConflicts('2026-10-19','07:00','08:00',calendarEvents('2026-10-19',[base],[],[],[])).length,0);
assert.equal(findConflicts('2026-10-19','08:00','09:00',calendarEvents('2026-10-19',[base],[],[],[]),{kind:'Ca học',id:'class'}).length,0);
assert.equal(seriesConflicts(base,[],[],[exam],[]).length,1);
assert.equal(seriesConflicts(base,[],[cancelled],[exam],[]).length,0);
assert.equal(seriesConflicts({...base, startsOn:'2026-10-26'},[],[],[exam],[]).length,0);
const study = { id:'s', title:'Buổi tự học', date:'2026-10-19', start:'08:15', duration:25 };
assert.equal(findConflicts('2026-10-19','08:00','09:00',calendarEvents('2026-10-19',[base],[cancelled],[],[study])).some(e=>e.kind==='Tự học'),true);
console.log(JSON.stringify({ passed:true, assertions:18, checks:['range boundaries','multiple weekdays','single-date cancellation/change','unaffected next week','half-open time intervals','exclude only edited item','cross-kind exam/study conflicts','series checks respect exceptions'] }));
