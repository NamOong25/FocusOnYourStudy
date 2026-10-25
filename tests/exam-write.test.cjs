const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { createExamsApi, examInput } = require('../src/features/exams/api/examsApi.ts');
const { ExamWriteManager } = require('../src/features/exams/api/ExamWriteManager.ts');
const { examDraft, examDraftInput, examInstants } = require('../src/features/exams/examDraft.ts');
const { ApiError } = require('../src/shared/api/http.ts');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const body = (p = {}) => ({ courseId: B, kind: 'FINAL', format: 'WRITTEN', startsAt: '2026-11-10T01:00:00Z', endsAt: '2026-11-10T03:00:00Z', timeZone: 'Asia/Ho_Chi_Minh', room: 'A2', reminder: true, reminderMinutes: [1440, 180, 0], notes: 'Mang thẻ', ...p });
const row = (p = {}) => ({ id: A, ...body(), version: 0, createdAt: '2026-10-25T00:00:00Z', updatedAt: '2026-10-25T00:00:00Z', ...p });
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const authorized = op => op('access-test');
function client(payload, status = 200, calls = []) {
  return createExamsApi('http://example.invalid', authorized, { fetcher: async (url, options) => {
    calls.push({ url, options }); return new Response(status === 204 ? null : JSON.stringify(status < 300 ? { data: payload } : payload), { status });
  } });
}
const mock = (patch = {}) => ({ save: async () => row(), remove: async () => {}, get: async () => row(), all: async () => [row()], ...patch });

test('POST whitelists fields, normalizes trim/reminders and never sends id, owner or version', async () => {
  const calls = []; await client(row(), 201, calls).save({ ...body({ room: ' A2 ', notes: ' Mang thẻ ', reminderMinutes: [0, 180, 1440] }), id: B, version: 77, userId: A });
  assert.equal(calls.length, 1); const { url, options } = calls[0]; assert.match(url, /\/exams$/); assert.equal(options.method, 'POST'); assert.equal(options.headers.Authorization, 'Bearer access-test'); assert.equal(options.credentials, 'omit'); assert.deepEqual(JSON.parse(options.body), body());
});
test('PUT uses original identity and version including zero, full replacement clears fields', async () => {
  const calls = [], input = body({ room: '', notes: '', reminder: false, reminderMinutes: [] });
  await client(row({ ...input, version: 1 }), 200, calls).save(input, row());
  assert.match(calls[0].url, new RegExp(A + '$')); assert.equal(calls[0].options.method, 'PUT'); assert.deepEqual(JSON.parse(calls[0].options.body), { ...input, version: 0 });
});
test('DELETE uses exact basis version and accepts only an empty 204', async () => {
  const calls = []; await client(null, 204, calls).remove(row({ version: 4 })); assert.match(calls[0].url, /version=4$/); assert.equal(calls[0].options.method, 'DELETE');
  await assert.rejects(client({}, 200).remove(row()), e => e.code === 'INVALID_RESPONSE');
});
test('bad original id or version is rejected before transport', async () => {
  for (const p of [{ id: 'sample' }, { version: -1 }, { version: 0.2 }, { version: Number.MAX_SAFE_INTEGER + 1 }]) {
    const calls = [], api = client(row(), 200, calls); await assert.rejects(api.save(body(), row(p))); await assert.rejects(api.remove(row(p))); assert.equal(calls.length, 0);
  }
});
for (const patch of [{ reminder: false }, { reminderMinutes: [] }, { reminderMinutes: [0, 0] }, { reminderMinutes: [10081] }, { reminderMinutes: [1.5] }, { reminderMinutes: Array.from({ length: 11 }, (_, i) => i) }, { endsAt: '2026-11-10T17:00:00Z' }, { startsAt: '2026-11-10T01:00:01Z' }])
  test('invalid payload is rejected locally: ' + JSON.stringify(patch), async () => {
    const calls = []; await assert.rejects(client(row(), 201, calls).save(body(patch))); assert.equal(calls.length, 0);
  });
test('write response must match requested identity, advanced version and actual fields', async () => {
  for (const p of [{ id: B }, { version: 0 }, { room: 'wrong' }, { endsAt: '2026-11-10T04:00:00Z' }, { reminderMinutes: [60] }])
    await assert.rejects(client(row({ version: 1, ...p })).save(body(), row()), e => e.code === 'INVALID_RESPONSE');
  await assert.rejects(client(row({ version: 3 }), 201).save(body()), e => e.code === 'INVALID_RESPONSE');
});
test('normalization of equivalent UTC fractions does not reject a confirmed write', async () => {
  assert.equal((await client(row({ version: 1 })).save(body({ startsAt: '2026-11-10T01:00:00.000Z' }), row())).version, 1);
});
test('conflicts and validation map safely without automatically resending', async () => {
  const calls = [];
  await assert.rejects(client({ code: 'SCHEDULE_TIME_CONFLICT', detail: 'Trùng lịch học Java 08:00–09:00' }, 409, calls).save(body()), e => e.message.includes('Java'));
  assert.equal(calls.length, 1);
  await assert.rejects(client({ code: 'EXAM_VERSION_CONFLICT', detail: 'secret' }, 409).remove(row()), e => e.message.includes('ở nơi khác') && !e.message.includes('secret'));
  await assert.rejects(client({ code: 'VALIDATION_FAILED', errors: [{ field: 'endsAt', message: 'Kết thúc sai' }, { field: 'format', message: 'Hình thức sai' }, { field: 'passwordHash', message: 'private' }] }, 400).save(body()), e => e.fields.endsAt && e.fields.format && !e.fields.passwordHash);
});
test('all-exam reconciliation reads without semester/course to avoid hiding a moved record', async () => {
  const calls = []; await client([row()], 200, calls).all(); assert.match(calls[0].url, /\/exams$/); assert.equal(calls[0].options.method, 'GET');
});
test('Vietnamese clock selection converts to exact UTC and empty room stays empty', () => {
  const draft = { ...examDraft(row()), room: ' ', reminder: false };
  const value = examDraftInput(draft); assert.equal(value.startsAt, body().startsAt); assert.equal(value.endsAt, body().endsAt); assert.equal(value.room, ''); assert.deepEqual(value.reminderMinutes, []);
});
test('DST repeated clocks keep original offset even when editing only room/notes', () => {
  const original = row({ startsAt: '2026-11-01T05:30:00Z', endsAt: '2026-11-01T06:15:00Z', timeZone: 'America/New_York' });
  const draft = examDraft(original); assert.equal(draft.start, '01:30'); assert.equal(draft.end, '01:15'); const value = examDraftInput({ ...draft, room: 'New room' }); assert.equal(value.startsAt, original.startsAt); assert.equal(value.endsAt, original.endsAt);
});
test('DST missing hour is rejected and repeated clock requires explicit choice', () => {
  assert.deepEqual(examInstants('2026-03-08', '02:30', 'America/New_York'), []);
  const choices = examInstants('2026-11-01', '01:30', 'America/New_York'); assert.deepEqual(choices, ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
  const draft = { ...examDraft(row()), date: '2026-11-01', start: '01:30', end: '03:00', timeZone: 'America/New_York', startChoice: '', endChoice: '' };
  assert.throws(() => examDraftInput(draft), e => e.code === 'AMBIGUOUS_EXAM_TIME');
  assert.equal(examDraftInput({ ...draft, startChoice: choices[1] }).startsAt, choices[1]);
});
test('historical zone offsets with seconds round-trip at local minute precision', () => {
  const choices = examInstants('1901-01-01', '08:00', 'Asia/Ho_Chi_Minh'); assert.equal(choices.length, 1); assert.match(choices[0], /:30\.000Z$/);
  const result = examDraftInput({ ...examDraft(row()), date: '1901-01-01', startChoice: '', endChoice: '' }); assert.equal(result.startsAt, choices[0]);
});
test('invalid calendar date, invalid zone, reversed and next-day clocks cannot normalize silently', () => {
  for (const p of [{ date: '2026-02-30' }, { timeZone: 'Bad/Zone' }, { start: '10:00', end: '08:00', startChoice: '', endChoice: '' }, { end: '24:00' }]) assert.throws(() => examDraftInput({ ...examDraft(row()), ...p }));
});
test('manager locks duplicate concurrent writes synchronously; confirmed writes invalidate readers', async () => {
  const d = deferred(); let calls = 0; const m = new ExamWriteManager(mock({ save: () => { calls++; return d.promise; } }));
  const first = m.save(body()); assert.equal(m.state.busy, true); await assert.rejects(m.save(body()), e => e.code === 'REQUEST_BUSY'); await assert.rejects(m.remove(row()), e => e.code === 'REQUEST_BUSY'); assert.equal(calls, 1);
  d.resolve(row()); await first; assert.equal(m.state.busy, false); assert.equal(m.state.revision, 1); assert.equal(m.state.pending, null); m.dispose();
});
for (const failure of [new ApiError('offline', 'NETWORK_ERROR'), new ApiError('timeout', 'REQUEST_TIMEOUT'), new ApiError('bad response', 'INVALID_RESPONSE'), new ApiError('database', 'DATABASE_UNAVAILABLE', 503)])
  test('uncertain create blocks retries until successful read AND explicit review: ' + failure.code, async () => {
    let calls = 0; const m = new ExamWriteManager(mock({ save: async () => { calls++; throw failure; } }));
    await assert.rejects(m.save(body())); assert.equal(m.state.pending.reason, 'uncertain'); await assert.rejects(m.save(body()), e => e.code === 'EXAM_REVIEW_REQUIRED'); assert.equal(calls, 1); assert.equal(m.acknowledge(), false);
    const checked = await m.check(); assert.equal(checked.rows.length, 1); assert.ok(m.state.pending); await assert.rejects(m.remove(row()), e => e.code === 'EXAM_REVIEW_REQUIRED'); assert.equal(m.acknowledge(), true); assert.equal(m.state.pending, null); assert.equal(calls, 1); m.dispose();
  });
test('known schedule conflict preserves draft input and permits deliberate corrected save', async () => {
  let first = true; const m = new ExamWriteManager(mock({ save: async () => { if (first) { first = false; throw new ApiError('Java at 8', 'SCHEDULE_TIME_CONFLICT', 409); } return row(); } }));
  const input = body(); await assert.rejects(m.save(input)); assert.deepEqual(input, body()); assert.equal(m.state.pending, null); assert.equal(m.state.error.code, 'SCHEDULE_TIME_CONFLICT'); await m.save(body()); assert.equal(m.state.error, null); m.dispose();
});
test('version conflict does not update basis or silently resend PUT; explicit checked replacement required', async () => {
  let puts = 0, gets = 0; const original = row(); const m = new ExamWriteManager(mock({ save: async () => { puts++; throw new ApiError('stale', 'EXAM_VERSION_CONFLICT', 409); }, get: async id => { gets++; assert.equal(id, A); return row({ version: 4, room: 'Other tab' }); } }));
  await assert.rejects(m.save(body({ room: 'My draft' }), original)); assert.equal(m.state.pending.reason, 'stale'); const checked = await m.check(); assert.equal(checked.current.version, 4); assert.equal(checked.current.room, 'Other tab'); assert.equal(original.version, 0); assert.equal(m.state.pending.input.room, 'My draft'); assert.equal(puts, 1); assert.equal(gets, 1); assert.equal(m.acknowledge(), true); m.dispose();
});
test('lost DELETE response is reconciled by detail 404 without another DELETE', async () => {
  let calls = 0; const m = new ExamWriteManager(mock({ remove: async () => { calls++; throw new ApiError('lost', 'NETWORK_ERROR'); }, get: async () => { throw new ApiError('gone', 'EXAM_NOT_FOUND', 404); } }));
  await assert.rejects(m.remove(row())); const checked = await m.check(); assert.equal(checked.current, null); assert.deepEqual(checked.rows, []); assert.equal(calls, 1); assert.ok(m.state.pending); assert.equal(m.acknowledge(), true); m.dispose();
});
test('404 at write blocks creating a deleted exam from its old draft', async () => {
  const m = new ExamWriteManager(mock({ save: async () => { throw new ApiError('gone', 'EXAM_NOT_FOUND', 404); } })); await assert.rejects(m.save(body(), row())); assert.equal(m.state.pending.reason, 'gone'); await assert.rejects(m.save(body()), e => e.code === 'EXAM_REVIEW_REQUIRED'); m.dispose();
});
test('failed reconciliation cannot unlock writes or fabricate an empty success', async () => {
  const m = new ExamWriteManager(mock({ save: async () => { throw new ApiError('lost', 'REQUEST_TIMEOUT'); }, all: async () => { throw new ApiError('offline', 'NETWORK_ERROR'); } })); await assert.rejects(m.save(body())); await assert.rejects(m.check()); assert.equal(m.state.checked, null); assert.ok(m.state.pending); assert.equal(m.acknowledge(), false); m.dispose();
});
test('checking result locks simultaneous review/requests and cancels on owner disposal', async () => {
  const d = deferred(); let notices = 0; const m = new ExamWriteManager(mock({ save: async () => { throw new ApiError('lost', 'NETWORK_ERROR'); }, all: () => d.promise })); m.subscribe(() => notices++);
  await assert.rejects(m.save(body())); const check = m.check(); check.catch(() => {}); assert.equal(m.state.checking, true); await assert.rejects(m.check(), e => e.code === 'REQUEST_BUSY'); await assert.rejects(m.save(body()), e => e.code === 'REQUEST_BUSY'); m.dispose(); const before = notices; d.resolve([row()]); await assert.rejects(check, e => e.code === 'REQUEST_CANCELLED'); assert.equal(notices, before); assert.equal(m.state.pending, null);
});
test('account disposal ignores late write success; no data or listeners carry into next owner', async () => {
  const d = deferred(), m = new ExamWriteManager(mock({ save: () => d.promise })); const write = m.save(body()); write.catch(() => {}); m.dispose(); d.resolve(row()); await assert.rejects(write, e => e.code === 'REQUEST_CANCELLED'); assert.equal(m.state.revision, 0); const next = new ExamWriteManager(mock()); assert.equal(next.state.pending, null); await next.save(body()); next.dispose();
});
test('request snapshot retains original body/version despite caller changing objects while in flight', async () => {
  const d = deferred(), original = row(), input = body(); let sent;
  const m = new ExamWriteManager(mock({ save: (data, basis) => { sent = { data, basis }; return d.promise; } })); const write = m.save(input, original); write.catch(() => {}); input.room = 'mutated'; input.reminderMinutes.push(10); original.version = 99; d.reject(new ApiError('lost', 'NETWORK_ERROR')); await assert.rejects(write);
  assert.equal(sent.basis.version, 0); assert.equal(m.state.pending.input.room, 'A2'); assert.deepEqual(m.state.pending.input.reminderMinutes, [1440, 180, 0]); m.dispose();
});
