const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { projectExamOverview, examCountdownLabel } = require('../src/features/exams/examOverview.ts');
const { ExamReadManager } = require('../src/features/exams/api/ExamReadManager.ts');
const { examQueryKey } = require('../src/features/exams/api/examsApi.ts');
const { ApiError } = require('../src/shared/api/http.ts');
const S1 = '11111111-1111-4111-8111-111111111111', S2 = '22222222-2222-4222-8222-222222222222';
const C1 = '33333333-3333-4333-8333-333333333333', C2 = '44444444-4444-4444-8444-444444444444';
const courses = [{ id: C1, semesterId: S1, name: 'Java' }, { id: C2, semesterId: S2, name: 'Java' }], query = { semesterId: S1 };
const exam = (p = {}) => ({ id: 'exam-a', courseId: C1, startsAt: '2026-11-10T01:00:00Z', endsAt: '2026-11-10T03:00:00Z', timeZone: 'Asia/Ho_Chi_Minh', ...p });
const loaded = (rows = [], p = {}) => ({ loaded: true, loading: false, error: null, value: rows, ...p });
const now = Date.parse('2026-11-10T02:00:00Z');
test('dashboard keeps an ongoing exam ahead of the next future exam and excludes ended exams', () => {
  const rows = [exam({ id: 'future', startsAt: '2026-11-11T01:00:00Z', endsAt: '2026-11-11T03:00:00Z' }), exam(), exam({ id: 'past', startsAt: '2026-11-09T01:00:00Z', endsAt: '2026-11-09T03:00:00Z' })];
  const data = projectExamOverview(loaded(rows), courses, query, now); assert.equal(data.next.id, 'exam-a'); assert.equal(data.upcoming.length, 2); assert.equal(data.rows.length, 3); assert.equal(data.ready, true); assert.equal(rows[0].id, 'future');
});
test('nearest exam changes exactly at its end instant; at start it becomes ongoing', () => {
  const first = exam(), second = exam({ id: 'second', startsAt: first.endsAt, endsAt: '2026-11-10T04:00:00Z' });
  assert.equal(projectExamOverview(loaded([second, first]), courses, query, Date.parse(first.endsAt) - 1).next.id, first.id);
  assert.equal(projectExamOverview(loaded([second, first]), courses, query, Date.parse(first.endsAt)).next.id, second.id);
  assert.equal(examCountdownLabel(first, Date.parse(first.startsAt)), 'Đang diễn ra'); assert.equal(examCountdownLabel(first, Date.parse(first.endsAt)), 'Đã kết thúc');
});
test('absolute ordering handles different local dates, offsets and a DST clock that runs backwards', () => {
  const dst = exam({ id: 'dst', startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T06:15:00Z', timeZone: 'America/New_York' });
  const future = exam({ id: 'east', startsAt: '2026-11-02T10:00:00Z', endsAt: '2026-11-02T11:00:00Z', timeZone: 'Pacific/Kiritimati' });
  assert.equal(projectExamOverview(loaded([future, dst]), courses, query, Date.parse('2026-11-01T06:00:00Z')).next.id, 'dst');
  assert.equal(examCountdownLabel(dst, Date.parse('2026-11-01T06:00:00Z')), 'Đang diễn ra');
});
test('equal start instants have deterministic ordering by exam id', () => assert.equal(projectExamOverview(loaded([exam({ id: 'b' }), exam({ id: 'a' })]), courses, query, now).next.id, 'a'));
test('same course name in a different semester cannot be displayed as the selected semesters exam', () => {
  const data = projectExamOverview(loaded([exam({ courseId: C2 })]), courses, query, now); assert.equal(data.catalogueMismatch, true); assert.equal(data.ready, false); assert.equal(data.next, undefined); assert.deepEqual(data.rows, []);
});
test('a course summary rejects another course in the same semester instead of quietly showing it', () => {
  const moreCourses = [...courses, { id: 'other', semesterId: S1 }]; const data = projectExamOverview(loaded([exam({ courseId: 'other' })]), moreCourses, { ...query, courseId: C1 }, now); assert.equal(data.catalogueMismatch, true); assert.equal(data.rows.length, 0);
});
test('missing course catalogue suppresses misleading course identity and false empty success', () => {
  const data = projectExamOverview(loaded([exam()]), [], query, now); assert.equal(data.catalogueMismatch, true); assert.equal(data.ready, false); assert.equal(data.next, undefined);
});
test('confirmed empty data can show empty state and never gets sample fallback', () => {
  const data = projectExamOverview(loaded(), courses, query, now); assert.equal(data.ready, true); assert.equal(data.rows.length, 0); assert.equal(data.next, undefined);
});
test('all-ended semester has a confirmed empty nearest card while course history remains readable', () => {
  const data = projectExamOverview(loaded([exam()]), courses, query, Date.parse('2026-11-11T00:00:00Z')); assert.equal(data.ready, true); assert.equal(data.next, undefined); assert.equal(data.rows.length, 1);
});
test('initial error/loading is never treated as a successful empty semester', () => {
  for (const state of [{ loaded: false, loading: true, error: null, value: null }, { loaded: false, loading: false, error: new ApiError('offline', 'NETWORK_ERROR'), value: null }]) {
    const data = projectExamOverview(state, courses, query, now); assert.equal(data.ready, false); assert.equal(data.stale, false); assert.equal(data.next, undefined);
  }
});
test('failed refresh labels confirmed rows stale but cannot assert an empty nearest result', () => {
  const failure = new ApiError('offline', 'NETWORK_ERROR'); const cached = projectExamOverview(loaded([exam()], { error: failure }), courses, query, now);
  assert.equal(cached.ready, false); assert.equal(cached.stale, true); assert.equal(cached.next.id, 'exam-a');
  const empty = projectExamOverview(loaded([], { error: failure }), courses, query, now); assert.equal(empty.ready, false); assert.equal(empty.stale, true);
});
test('ongoing refresh can show cached rows with loading text but cannot show a definitive empty result', () => {
  const data = projectExamOverview(loaded([exam()], { loading: true }), courses, query, now); assert.equal(data.ready, false); assert.equal(data.next.id, 'exam-a');
  assert.equal(projectExamOverview(loaded([], { loading: true }), courses, query, now).ready, false);
});
for (const [delta, label] of [[1, 'Còn 1 phút'], [60, 'Còn 1 giờ'], [61, 'Còn 1 giờ 1 phút'], [1440, 'Còn 1 ngày'], [1500, 'Còn 1 ngày 1 giờ'], [2880, 'Còn 2 ngày']])
  test('countdown from actual UTC instant at ' + delta + ' minutes', () => assert.equal(examCountdownLabel(exam(), Date.parse(exam().startsAt) - delta * 60000), label));
test('semester change clears the old card immediately, even when its previous read returns late', async () => {
  let release; const delayed = new Promise(resolve => release = resolve); const manager = new ExamReadManager(q => q.semesterId === S1 ? delayed : Promise.resolve([]), examQueryKey);
  const old = manager.load(query); old.catch(() => {}); await Promise.resolve(); const next = manager.load({ semesterId: S2 });
  const pending = projectExamOverview(manager.state, courses, { semesterId: S2 }, now); assert.equal(pending.next, undefined); assert.equal(pending.ready, false);
  await next; release([exam()]); await assert.rejects(old, e => e.code === 'REQUEST_CANCELLED'); assert.equal(projectExamOverview(manager.state, courses, { semesterId: S2 }, now).next, undefined); manager.dispose();
});
test('closing detail and reloading reflects an externally changed or deleted nearest exam', async () => {
  let phase = 0; const manager = new ExamReadManager(async () => ++phase === 1 ? [exam()] : [], examQueryKey); await manager.load(query);
  assert.equal(projectExamOverview(manager.state, courses, query, now).next.id, 'exam-a'); await manager.load(query); const data = projectExamOverview(manager.state, courses, query, now); assert.equal(data.next, undefined); assert.equal(data.ready, true); manager.dispose();
});
