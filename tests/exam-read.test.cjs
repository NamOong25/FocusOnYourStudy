const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { createExamsApi, examQueryKey, parseServerExam, examKinds, examFormats } = require('../src/features/exams/api/examsApi.ts');
const { ExamReadManager } = require('../src/features/exams/api/ExamReadManager.ts');
const { filterExams, examDate, examTiming, examProgress, examReminderText } = require('../src/features/exams/examView.ts');
const { ApiError } = require('../src/shared/api/http.ts');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', C = '33333333-3333-4333-8333-333333333333';
const query = { semesterId: A }, row = (patch = {}) => ({ id: A, courseId: B, kind: 'MIDTERM', format: 'WRITTEN',
  startsAt: '2026-11-10T01:00:00Z', endsAt: '2026-11-10T03:00:00Z', timeZone: 'Asia/Ho_Chi_Minh', room: 'A2.03',
  reminder: true, reminderMinutes: [1440, 180, 0], notes: 'Mang thẻ sinh viên', version: 0,
  createdAt: '2026-10-25T07:00:00.123456Z', updatedAt: '2026-10-25T07:00:00.123456Z', ...patch });
const authorized = (operation, signal) => operation('test-access');
function api(payload, status = 200, calls = []) {
  return createExamsApi('http://example.invalid', authorized, { fetcher: async (url, options) => {
    calls.push({ url, options }); return new Response(JSON.stringify(status === 200 ? { data: payload } : payload), { status });
  } });
}
const invalid = promise => assert.rejects(promise, error => error.code === 'INVALID_RESPONSE');
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
test('lists owned exams using GET, Bearer and selected semester/course, never writes', async () => {
  const calls = [], source = api([row()], 200, calls), abort = new AbortController(); await source.list({ ...query, courseId: B }, abort.signal);
  assert.match(calls[0].url, /\/api\/v1\/exams\?semesterId=11111111.*&courseId=22222222/);
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.headers.Authorization, 'Bearer test-access'); assert.equal(calls[0].options.credentials, 'omit'); assert.equal(calls[0].options.body, undefined);
  assert.deepEqual(Object.keys(source).sort(), ['get', 'list']);
});
test('detail is a fresh GET for exact ID, not the list snapshot', async () => {
  const calls = []; const result = await api(row({ version: 2, room: 'Updated' }), 200, calls).get(A);
  assert.equal(result.room, 'Updated'); assert.equal(result.version, 2); assert.match(calls[0].url, new RegExp('/exams/' + A + '$'));
});
test('successful empty list stays empty without sample records', async () => assert.deepEqual(await api([]).list(query), []));
test('all enum variants map and extra ownership/counter properties are discarded', () => {
  for (const kind of Object.keys(examKinds)) for (const format of Object.keys(examFormats)) {
    const parsed = parseServerExam(row({ kind, format, userId: C, updateRevision: 99 })); assert.equal(parsed.kind, kind); assert.equal(parsed.format, format); assert.equal('userId' in parsed, false); assert.equal('updateRevision' in parsed, false);
  }
});
for (const [label, patch] of Object.entries({ badId: { id: 'demo-id' }, badCourse: { courseId: 'sample-course' }, badKind: { kind: 'MID_TERM' }, arrayEnum: { kind: ['MIDTERM'] }, badFormat: { format: 'Essay' },
  invalidDate: { startsAt: '2026-02-30T01:00:00Z' }, noOffset: { startsAt: '2026-11-10T01:00:00' }, nonUtc: { startsAt: '2026-11-10T08:00:00+07:00' }, reversed: { endsAt: '2026-11-10T01:00:00Z' },
  seconds: { startsAt: '2026-11-10T01:00:01Z' }, fraction: { startsAt: '2026-11-10T01:00:00.001Z' }, nextLocalDay: { endsAt: '2026-11-10T17:00:00Z' },
  invalidZone: { timeZone: 'Fake/Zone' }, beforeMin: { startsAt: '1899-11-10T01:00:00Z' }, maxEnd: { endsAt: '2100-01-01T00:00:00Z' },
  negativeVersion: { version: -1 }, unsafeVersion: { version: Number.MAX_SAFE_INTEGER + 1 }, noNotes: { notes: null }, longRoom: { room: 'a'.repeat(101) },
  badTimestamp: { updatedAt: 'not-a-timestamp' }, badReminder: { reminder: 'true' }, missingMinutes: { reminderMinutes: null }, duplicateMinutes: { reminderMinutes: [0, 0] },
  floatMinutes: { reminderMinutes: [0.5] }, oversizedMinutes: { reminderMinutes: [10081] }, emptyEnabled: { reminderMinutes: [] }, disabledWithMinutes: { reminder: false } })) {
  test(`rejects ${label} as an invalid response`, async () => invalid(api([row(patch)]).list(query)));
}
test('rejects null, non-array and partly-invalid lists without displaying partial data', async () => {
  for (const payload of [null, {}, [row(), row({ id: C, courseId: null })]]) await invalid(api(payload).list(query));
});
test('rejects duplicate IDs, wrong detail ID and wrong course in a scoped list', async () => {
  await invalid(api([row(), row()]).list(query)); await invalid(api(row({ id: B })).get(A)); await invalid(api([row({ courseId: C })]).list({ ...query, courseId: B }));
});
test('validates queries before network and canonicalizes cache keys', async () => {
  const calls = []; await assert.rejects(api([], 200, calls).list({ semesterId: 'sample' }), e => e.code === 'INVALID_EXAM_QUERY');
  await assert.rejects(api([], 200, calls).get('e1'), e => e.code === 'INVALID_EXAM_QUERY'); assert.equal(calls.length, 0);
  assert.equal(examQueryKey({ courseId: B, semesterId: A }), examQueryKey({ semesterId: A, courseId: B })); assert.notEqual(examQueryKey(query), examQueryKey({ ...query, courseId: B }));
});
test('sorts by absolute instant then ID rather than clock or response order', async () => {
  const late = row({ id: C, startsAt: '2026-11-10T04:00:00Z', endsAt: '2026-11-10T05:00:00Z', timeZone: 'Pacific/Honolulu' });
  const rows = await api([late, row({ id: B }), row()]).list(query); assert.deepEqual(rows.map(r => r.id), [A, B, C]);
});
test('reminder zero is start-time and disabled state stays empty; no fabricated room/notes', () => {
  assert.match(examReminderText(parseServerExam(row())), /Đúng giờ bắt đầu/);
  const disabled = parseServerExam(row({ reminder: false, reminderMinutes: [], room: '', notes: '' })); assert.equal(examReminderText(disabled), 'Không chọn nhắc'); assert.equal(disabled.room, ''); assert.equal(disabled.notes, '');
});
test('uses original exam zone across date line, independent of device day', () => {
  const exam = parseServerExam(row({ startsAt: '2026-11-09T10:00:00Z', endsAt: '2026-11-09T12:00:00Z', timeZone: 'Pacific/Kiritimati' }));
  assert.equal(examDate(exam), '10/11/2026'); assert.equal(examTiming(exam), '00:00 – 02:00'); assert.equal(examProgress(exam, Date.parse('2026-11-09T09:00:00Z')), 'Ngày mai');
});
test('DST repeated clock still has positive absolute duration and correct period', () => {
  const exam = parseServerExam(row({ startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T06:15:00Z', timeZone: 'America/New_York' }));
  assert.equal(examTiming(exam), '01:30 (GMT-4) – 01:15 (GMT-5)'); assert.equal(examProgress(exam, Date.parse('2026-11-01T06:00:00Z')), 'Đang diễn ra');
});
test('period filter advances exactly at end instant and retains ongoing exams in upcoming', () => {
  const exam = row(), end = Date.parse(exam.endsAt); assert.equal(filterExams([exam], 'Sắp tới', end - 1).length, 1); assert.equal(filterExams([exam], 'Sắp tới', end).length, 0); assert.equal(filterExams([exam], 'Đã qua', end).length, 1);
  assert.equal(examProgress(exam, Date.parse(exam.startsAt)), 'Đang diễn ra'); assert.equal(examProgress(exam, end), 'Đã kết thúc'); assert.equal(filterExams([exam], 'Tất cả', end).length, 1);
});
test('known deleted detail is readable as safe Vietnamese error; unknown server detail is not echoed', async () => {
  await assert.rejects(api({ code: 'EXAM_NOT_FOUND', detail: 'private diagnostic' }, 404).get(A), e => e.code === 'EXAM_NOT_FOUND' && e.message.includes('không còn tồn tại') && !e.message.includes('private'));
  await assert.rejects(api({ code: 'UNKNOWN', detail: 'secret server stack' }, 500).list(query), e => !e.message.includes('secret'));
});
test('network/timeout do not retry or convert failure into an empty list', async () => {
  let calls = 0; const source = createExamsApi('', authorized, { fetcher: async () => { calls++; throw new Error('offline'); } });
  await assert.rejects(source.list(query), e => e.code === 'NETWORK_ERROR'); assert.equal(calls, 1);
  const slow = createExamsApi('', authorized, { timeoutMs: 5, fetcher: () => new Promise(() => {}) }); await assert.rejects(slow.list(query), e => e.code === 'REQUEST_TIMEOUT');
});
test('manager coalesces concurrent reads for the same query', async () => {
  const d = deferred(); let calls = 0; const m = new ExamReadManager(() => { calls++; return d.promise; }, examQueryKey);
  const one = m.load(query), two = m.load(query); assert.equal(one, two); await Promise.resolve(); assert.equal(calls, 1); d.resolve([row()]); await one; assert.equal(m.state.loaded, true); assert.equal(m.state.loading, false); m.dispose();
});
test('switching semester immediately hides old records and rejects late response even without abort support', async () => {
  const a = deferred(), b = deferred(), signals = [];
  const m = new ExamReadManager((q, signal) => { signals.push(signal); return q.semesterId === A ? a.promise : b.promise; }, examQueryKey);
  const old = m.load(query); old.catch(() => {}); await Promise.resolve(); const next = m.load({ semesterId: B }); assert.equal(m.state.value, null); assert.equal(m.state.loaded, false); assert.equal(signals[0].aborted, true);
  b.resolve([]); await next; a.resolve([row()]); await assert.rejects(old, e => e.code === 'REQUEST_CANCELLED'); assert.deepEqual(m.state.value, []); assert.equal(m.state.key, examQueryKey({ semesterId: B })); m.dispose();
});
test('course changes get separate state and late failures cannot overwrite current success', async () => {
  const a = deferred(), b = deferred(), m = new ExamReadManager(q => q.courseId ? b.promise : a.promise, examQueryKey);
  const old = m.load(query); old.catch(() => {}); const next = m.load({ ...query, courseId: B }); b.resolve([row()]); await next; a.reject(new ApiError('offline', 'NETWORK_ERROR')); await assert.rejects(old);
  assert.equal(m.state.error, null); assert.equal(m.state.value.length, 1); m.dispose();
});
test('same-query refresh retains confirmed records and explains failure; retry replaces them', async () => {
  let phase = 0; const m = new ExamReadManager(async () => { if (++phase === 2) throw new ApiError('offline', 'NETWORK_ERROR'); return phase === 1 ? [row()] : []; }, examQueryKey);
  await m.load(query); await assert.rejects(m.load(query)); assert.equal(m.state.loaded, true); assert.equal(m.state.value.length, 1); assert.equal(m.state.error.code, 'NETWORK_ERROR');
  await m.load(query); assert.deepEqual(m.state.value, []); assert.equal(m.state.error, null); m.dispose();
});
test('initial failure is not successful empty data', async () => {
  const m = new ExamReadManager(async () => { throw new ApiError('offline', 'NETWORK_ERROR'); }, examQueryKey); await assert.rejects(m.load(query)); assert.equal(m.state.loaded, false); assert.equal(m.state.value, null); m.dispose();
});
test('404/401 invalidate previously loaded detail instead of leaving deleted/private data visible', async () => {
  for (const status of [404, 401]) { let first = true; const m = new ExamReadManager(async () => { if (first) { first = false; return row(); } throw new ApiError('gone', 'EXAM_NOT_FOUND', status); }, id => id);
    await m.load(A); await assert.rejects(m.load(A)); assert.equal(m.state.value, null); assert.equal(m.state.loaded, false); m.dispose(); }
});
test('list and detail do not cancel or replace each others requests', async () => {
  const list = new ExamReadManager(async () => [row()], examQueryKey), detail = new ExamReadManager(async () => row({ version: 3 }), id => id);
  await Promise.all([list.load(query), detail.load(A)]); assert.equal(list.state.value[0].version, 0); assert.equal(detail.state.value.version, 3); list.dispose(); detail.dispose();
});
test('dispose on logout/account change prevents late data and clears subscribers', async () => {
  const d = deferred(); let notices = 0; const m = new ExamReadManager(() => d.promise, examQueryKey); m.subscribe(() => notices++); const pending = m.load(query); pending.catch(() => {}); m.dispose(); const before = notices; d.resolve([row()]); await assert.rejects(pending, e => e.code === 'REQUEST_CANCELLED'); assert.equal(notices, before); assert.equal(m.state.value, null); await assert.rejects(m.load(query), e => e.code === 'REQUEST_CANCELLED');
});
test('cancel inactive screen ignores old result; returning can read again', async () => {
  const d = deferred(); let first = true; const m = new ExamReadManager(() => { if (first) { first = false; return d.promise; } return Promise.resolve([]); }, examQueryKey);
  const old = m.load(query); old.catch(() => {}); await Promise.resolve(); m.cancel(); await m.load(query); d.resolve([row()]); await assert.rejects(old, e => e.code === 'REQUEST_CANCELLED'); assert.deepEqual(m.state.value, []); m.dispose();
});
