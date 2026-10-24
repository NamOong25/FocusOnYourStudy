const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { createScheduleApi, ruleInput } = require('../src/features/schedule/api/scheduleApi.ts');
const { ScheduleManager } = require('../src/features/schedule/api/ScheduleManager.ts');
const { ruleDraft, draftInput, firstRuleDate } = require('../src/features/schedule/ruleDraft.ts');
const { ApiError } = require('../src/shared/api/http.ts');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const query = { semesterId: A, from: '2026-10-19', to: '2026-10-25' };
const body = (patch = {}) => ({ courseId: B, weekdays: [1, 6], startsOn: '2026-10-19', endsOn: '2026-11-08', startTime: '07:00', endTime: '09:00', timeZone: 'Asia/Ho_Chi_Minh', room: 'A1', teacher: 'Teacher', reminderMinutes: 15, notes: '', ...patch });
const rule = (patch = {}) => ({ id: A, version: 0, ...body(), ...patch });
function api(payload, status = 200, calls = []) {
  return createScheduleApi('http://example.invalid', operation => operation('test-access'), { fetcher: async (url, options) => {
    calls.push({ url, options }); return new Response(status === 204 ? null : JSON.stringify(status < 300 ? { data: payload } : payload), { status });
  } });
}
test('POST normalizes the input and sends no draft version/owner/id', async () => {
  const calls = [], client = api(rule(), 201, calls); await client.save({ ...body({ weekdays: [6, 1], room: ' A1 ', teacher: ' Teacher ', notes: ' note ' }), id: B, userId: A, version: 999 });
  assert.equal(calls[0].options.method, 'POST'); assert.equal(calls[0].options.headers.Authorization, 'Bearer test-access');
  assert.deepEqual(JSON.parse(calls[0].options.body), body({ notes: 'note' })); assert.match(calls[0].url, /class-schedules$/);
});
test('PUT replaces a whole rule using the original id and version, including zero', async () => {
  const calls = []; await api(rule({ room: '', version: 1 }), 200, calls).save(body({ room: '' }), rule());
  assert.equal(calls[0].options.method, 'PUT'); assert.match(calls[0].url, new RegExp(A + '$')); assert.deepEqual(JSON.parse(calls[0].options.body), { ...body({ room: '' }), version: 0 });
});
test('DELETE sends the exact original version and accepts only empty 204 success', async () => {
  const calls = []; await api(null, 204, calls).remove(rule({ version: 4 })); assert.equal(calls[0].options.method, 'DELETE'); assert.match(calls[0].url, /version=4$/);
  await assert.rejects(api({}, 200).remove(rule()), e => e.code === 'INVALID_RESPONSE');
});
test('invalid id/unsafe original version never writes', async () => {
  const calls = [], client = api(rule(), 200, calls);
  for (const original of [rule({ id: 'demo' }), rule({ version: -1 }), rule({ version: Number.MAX_SAFE_INTEGER + 1 })]) {
    await assert.rejects(client.save(body(), original), e => e.code === 'CLASS_SCHEDULE_VERSION_CONFLICT'); await assert.rejects(client.remove(original));
  }
  assert.equal(calls.length, 0);
});
test('rejects a mismatched or regressed save response instead of applying it locally', async () => {
  for (const v of [rule({ id: B }), rule({ courseId: A }), rule({ version: 1 })]) await assert.rejects(api(v).save(body(), rule({ version: 2 })), e => e.code === 'INVALID_RESPONSE');
});
test('rule list queries the semester without an occurrence/date window', async () => {
  const calls = [], rows = [rule({ startsOn: '2026-01-01', endsOn: '2026-02-01' })]; assert.deepEqual(await api(rows, 200, calls).rules(A), rows);
  assert.match(calls[0].url, new RegExp('class-schedules\\?semesterId=' + A + '$')); assert.equal(calls[0].options.method, 'GET');
  await assert.rejects(api([rule(), rule()]).rules(A), e => e.code === 'INVALID_RESPONSE');
});
test('manual uncertainty review can read all owned semesters in a single explicit GET', async () => {
  const calls = []; await api([rule()], 200, calls).rules(); assert.match(calls[0].url, /\/class-schedules$/); assert.equal(calls[0].options.method, 'GET');
  await assert.rejects(api([]).rules(''), e => e.code === 'INVALID_CLASS_INPUT');
});
test('reads latest rule by id for an explicit rebase, not by replacing the old version during save', async () => {
  assert.equal((await api(rule({ version: 3 })).readRule(A)).version, 3); await assert.rejects(api(rule({ id: B })).readRule(A), e => e.code === 'INVALID_RESPONSE');
});
test('conflict and protected-exception explanations survive the HTTP boundary', async () => {
  for (const code of ['SCHEDULE_TIME_CONFLICT', 'CLASS_SCHEDULE_HAS_EXCEPTIONS']) await assert.rejects(api({ code, detail: 'Trùng buổi Java ngày 26/10/2026.' }, 409).save(body(), rule()), e => e.code === code && e.message.includes('26/10/2026'));
});
test('validation exposes supported schedule fields without unknown paths', async () => {
  await assert.rejects(api({ code: 'VALIDATION_FAILED', errors: [{ field: 'startTime', message: 'Giờ DST không hợp lệ' }, { field: 'weekdays[0]', message: 'Chọn thứ' }, { field: 'secret', message: 'omit' }] }, 400).save(body()), e => {
    assert.deepEqual(e.fields, { startTime: 'Giờ DST không hợp lệ', 'weekdays[0]': 'Chọn thứ' }); return true;
  });
});
test('draft rebase preserves server timezone/ISO Sunday and blank override values', () => {
  const input = rule({ weekdays: [7], room: '', teacher: '', timeZone: 'America/New_York' }); const draft = ruleDraft(input);
  assert.deepEqual(draftInput(draft), body({ weekdays: [7], room: '', teacher: '', timeZone: 'America/New_York' }));
});
for (const [label, patch] of Object.entries({ noDays: { weekdays: [] }, backwardsDates: { endsOn: '2026-10-18' }, overYear: { endsOn: '2027-11-08' }, badTime: { endTime: '06:00' }, badZone: { timeZone: 'Fake/Zone' }, fractionReminder: { reminderMinutes: '1.5' }, largeReminder: { reminderMinutes: '10081' } })) {
  test(`invalid draft ${label} is rejected before HTTP`, () => assert.throws(() => draftInput({ ...ruleDraft(rule()), ...patch })));
}
test('date range must contain a matching weekday and first saved day can differ from startsOn', () => {
  assert.throws(() => ruleInput(body({ startsOn: '2026-10-26', endsOn: '2026-10-26', weekdays: [2] })), /ít nhất một buổi/);
  assert.equal(firstRuleDate(body({ startsOn: '2026-10-26', weekdays: [2, 4] })), '2026-10-27');
});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
async function ready(overrides) { const manager = new ScheduleManager({ list: async () => [], ...overrides }); await manager.load(query); return manager; }
test('double click sends one write and blocks competing reads while in flight', async () => {
  const d = deferred(); let writes = 0; const manager = await ready({ save: () => { writes++; return d.promise; } });
  const first = manager.save(body()); await assert.rejects(manager.save(body()), e => e.code === 'REQUEST_BUSY'); await assert.rejects(manager.load(query), e => e.code === 'REQUEST_BUSY');
  d.resolve(rule()); await first; assert.equal(writes, 1); assert.equal(manager.state.revision, 1); assert.equal(manager.state.loaded, false); assert.deepEqual(manager.state.rows, []); manager.dispose();
});
test('a confirmed write followed by failed read stays confirmed and is not resent', async () => {
  let reads = 0, writes = 0; const manager = new ScheduleManager({ list: async () => { if (++reads > 1) throw new Error('offline'); return []; }, save: async () => { writes++; return rule(); } });
  await manager.load(query); await manager.save(body()); await assert.rejects(manager.load(query)); assert.equal(manager.state.confirmedWrite, true); assert.equal(writes, 1); await assert.rejects(manager.save(body()), e => e.code === 'SCHEDULE_RELOAD_REQUIRED'); manager.dispose();
});
test('uncertain outcome blocks another POST even after ordinary refresh; manual review is required', async () => {
  let writes = 0; const manager = await ready({ save: async () => { writes++; throw new ApiError('timeout', 'REQUEST_TIMEOUT'); } });
  await assert.rejects(manager.save(body())); assert.equal(manager.state.needsReload, true); await manager.load(query); assert.equal(manager.state.needsReload, true);
  await assert.rejects(manager.save(body()), e => e.code === 'SCHEDULE_RELOAD_REQUIRED'); assert.equal(writes, 1); manager.acknowledge(); assert.equal(manager.state.needsReload, false); manager.dispose();
});
test('definitive conflict retains draft workflow and permits a corrected submission', async () => {
  let writes = 0; const manager = await ready({ save: async () => { if (++writes === 1) throw new ApiError('trùng', 'SCHEDULE_TIME_CONFLICT', 409); return rule(); } });
  await assert.rejects(manager.save(body())); assert.equal(manager.state.needsReload, false); assert.equal(manager.state.loaded, true); await manager.save(body({ startTime: '10:00', endTime: '12:00' })); assert.equal(writes, 2); manager.dispose();
});
test('delete invalidates occurrences only after confirmed success, and failures keep the existing version', async () => {
  const manager = await ready({ remove: async () => { throw new ApiError('stale', 'CLASS_SCHEDULE_VERSION_CONFLICT', 409); } });
  await assert.rejects(manager.remove(rule())); assert.equal(manager.state.loaded, true); assert.equal(manager.state.revision, 0); manager.dispose();
  const success = await ready({ remove: async () => undefined }); await success.remove(rule()); assert.equal(success.state.loaded, false); assert.equal(success.state.confirmedWrite, true); success.dispose();
});
test('late write result from a disposed account never publishes into another workspace', async () => {
  const d = deferred(), manager = await ready({ save: () => d.promise }); const result = manager.save(body()); const rejected = assert.rejects(result, e => e.code === 'REQUEST_CANCELLED'); manager.dispose(); d.resolve(rule()); await rejected; assert.equal(manager.state.revision, 0);
});
test('writes require an initial successful calendar read', async () => {
  let writes = 0; const manager = new ScheduleManager({ save: async () => { writes++; return rule(); } }); await assert.rejects(manager.save(body()), e => e.code === 'SCHEDULE_RELOAD_REQUIRED'); assert.equal(writes, 0); manager.dispose();
});
