const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
// Test the actual TypeScript modules without adding a framework/runtime dependency.
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
const { createScheduleApi } = require('../src/features/schedule/api/scheduleApi.ts');
const { ScheduleManager } = require('../src/features/schedule/api/ScheduleManager.ts');
const { scheduleWindow } = require('../src/features/schedule/scheduleView.ts');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const query = { semesterId: A, from: '2026-10-19', to: '2026-10-25' };
const row = (patch = {}) => ({ scheduleId: A, courseId: B, date: '2026-10-24', startTime: '07:00', endTime: '09:00',
  timeZone: 'Asia/Ho_Chi_Minh', startsAt: '2026-10-24T00:00:00Z', endsAt: '2026-10-24T02:00:00Z',
  room: 'A1', teacher: 'Giảng viên', reminderMinutes: 15, notes: '', scheduleVersion: 0, cancelled: false, changed: false, reason: '', exceptionId: null, ...patch });
const rule = (patch = {}) => ({ id: A, courseId: B, weekdays: [1, 6], startsOn: '2026-10-19', endsOn: '2026-11-08',
  startTime: '07:00', endTime: '09:00', timeZone: 'Asia/Ho_Chi_Minh', room: 'A1', teacher: 'Giảng viên', reminderMinutes: 15, notes: '', version: 0, ...patch });
const authorized = (operation, signal) => { assert.equal(signal?.aborted ?? false, false); return operation('test-access'); };
function api(payload, status = 200, calls = []) {
  return createScheduleApi('http://example.invalid', authorized, { fetcher: async (url, options) => {
    calls.push({ url, options }); return new Response(JSON.stringify(status === 200 ? { data: payload } : payload), { status });
  } });
}
const invalid = promise => assert.rejects(promise, error => error.code === 'INVALID_RESPONSE');
test('reads occurrences with GET, Bearer, selected semester, bounded dates and signal', async () => {
  const calls = [], controller = new AbortController(); await api([row()], 200, calls).list(query, controller.signal);
  assert.match(calls[0].url, /semesterId=11111111.*from=2026-10-19&to=2026-10-25$/);
  assert.equal(calls[0].options.method, 'GET'); assert.equal(calls[0].options.headers.Authorization, 'Bearer test-access');
  assert.equal(calls[0].options.credentials, 'omit'); assert.deepEqual(Object.keys(api([])).sort(), ['get', 'list', 'readRule', 'remove', 'rules', 'save']);
});
test('empty response is a successful empty calendar', async () => assert.deepEqual(await api([]).list(query), []));
test('cancelled and changed keep effective fields and original source dates', async () => {
  const cancelled = row({ cancelled: true, reason: 'Nghỉ', exceptionId: B });
  assert.deepEqual(await api([cancelled]).list(query), [cancelled]);
  const changed = row({ changed: true, exceptionId: B, startTime: '10:00', endTime: '12:00', startsAt: '2026-10-24T03:00:00Z', endsAt: '2026-10-24T05:00:00Z', room: '' });
  assert.deepEqual(await api([changed]).list(query), [changed]);
});
test('keeps a next-local-day date across the date line and sorts absolute times', async () => {
  const east = row({ scheduleId: B, date: '2026-10-25', startTime: '00:00', endTime: '01:00', timeZone: 'Pacific/Kiritimati', startsAt: '2026-10-24T10:00:00Z', endsAt: '2026-10-24T11:00:00Z' });
  const result = await api([east, row()]).list(query); assert.equal(result[0].scheduleId, A); assert.equal(result[1].date, '2026-10-25');
});
for (const [label, patch] of Object.entries({ badId: { scheduleId: 'demo-id' }, badDate: { date: '2026-02-30' }, invalidClock: { startTime: '24:00' },
  reversedClock: { endTime: '06:00' }, inconsistentUtc: { endsAt: '2026-10-24T03:00:00Z' }, invalidZone: { timeZone: 'Fake/Zone' },
  badVersion: { scheduleVersion: -1 }, bothFlags: { cancelled: true, changed: true, exceptionId: B }, missingException: { cancelled: true },
  ghostException: { exceptionId: B }, oldWindow: { date: '2026-10-26', startsAt: '2026-10-26T00:00:00Z', endsAt: '2026-10-26T02:00:00Z' } })) {
  test(`rejects ${label} instead of mixing invalid data into a calendar`, async () => invalid(api([row(patch)]).list(query)));
}
test('rejects duplicate occurrence keys and mixed versions for one series snapshot', async () => {
  await invalid(api([row(), row()]).list(query)); await invalid(api([row(), row({ date: '2026-10-19', startsAt: '2026-10-19T00:00:00Z', endsAt: '2026-10-19T02:00:00Z', scheduleVersion: 1 })]).list(query));
});
test('invalid query never sends a network request', async () => {
  const calls = [], client = api([], 200, calls);
  for (const q of [{ ...query, semesterId: '' }, { ...query, from: 'bad' }, { ...query, to: '2026-10-18' }, { ...query, to: '2027-10-25' }]) await assert.rejects(client.list(q), e => e.code === 'INVALID_CLASS_RANGE');
  assert.equal(calls.length, 0);
});
test('detail uses ISO weekdays and the matching parent version', async () => { assert.deepEqual(await api(rule()).get(row()), rule()); });
test('detail cannot combine a stale occurrence and a newer or different parent', async () => {
  for (const v of [rule({ version: 1 }), rule({ id: B }), rule({ courseId: A })]) await assert.rejects(api(v).get(row()), e => e.code === 'CLASS_SCHEDULE_VERSION_CONFLICT');
});
test('detail rejects invalid rule data or a day no longer in its weekdays', async () => {
  await invalid(api(rule({ weekdays: [1, 1] })).get(row())); await invalid(api(rule({ weekdays: [1] })).get(row()));
});
test('deleted detail remains a 404 with a useful message', async () => {
  await assert.rejects(api({ code: 'CLASS_SCHEDULE_NOT_FOUND' }, 404).get(row()), e => e.status === 404 && /tải lại lịch/.test(e.message));
});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
test('deduplicates repeated reads of the same in-flight window', async () => {
  const d = deferred(); let calls = 0; const manager = new ScheduleManager({ list: () => { calls++; return d.promise; } });
  const first = manager.load(query), second = manager.load(query); assert.equal(first, second); assert.equal(calls, 1); d.resolve([row()]); await first; manager.dispose();
});
test('late old-window responses cannot overwrite the new semester or clear its loading flag', async () => {
  const old = deferred(), next = deferred(); let signal; const manager = new ScheduleManager({ list: (q, s) => { if (q.semesterId === A) { signal = s; return old.promise; } return next.promise; } });
  const first = manager.load(query); const rejected = assert.rejects(first, e => e.code === 'REQUEST_CANCELLED'); const second = manager.load({ ...query, semesterId: B });
  assert.equal(signal.aborted, true); assert.deepEqual(manager.state.rows, []); old.resolve([row()]); await rejected; assert.equal(manager.state.loading, true); next.resolve([]); await second; assert.deepEqual(manager.state.rows, []); assert.equal(manager.state.loaded, true); manager.dispose();
});
test('refresh error retains data only for the same query and retry replaces it', async () => {
  let count = 0; const manager = new ScheduleManager({ list: async () => { if (++count === 2) throw new Error('Offline'); return count === 1 ? [row()] : []; } });
  await manager.load(query); await assert.rejects(manager.load(query)); assert.equal(manager.state.rows.length, 1); assert.equal(manager.state.loaded, true); assert.ok(manager.state.error);
  await manager.load(query); assert.deepEqual(manager.state.rows, []); assert.equal(manager.state.error, null); manager.dispose();
});
test('failed new-window read does not expose old rows as an empty success', async () => {
  const manager = new ScheduleManager({ list: async q => { if (q.semesterId === B) throw new Error('Offline'); return [row()]; } });
  await manager.load(query); await assert.rejects(manager.load({ ...query, semesterId: B })); assert.deepEqual(manager.state.rows, []); assert.equal(manager.state.loaded, false); assert.ok(manager.state.error); manager.dispose();
});
test('disposing on account change aborts reads and never publishes their late results', async () => {
  const d = deferred(); let signal, events = 0; const manager = new ScheduleManager({ list: (_q, s) => { signal = s; return d.promise; } }); manager.subscribe(() => events++);
  const result = manager.load(query); const rejected = assert.rejects(result, e => e.code === 'REQUEST_CANCELLED'); manager.dispose(); const before = events; d.resolve([row()]); await rejected;
  assert.equal(signal.aborted, true); assert.equal(events, before); await assert.rejects(manager.load(query), e => e.code === 'REQUEST_CANCELLED');
});
test('calendar requests the full visible week/month grid including adjacent month days', () => {
  const selected = new Date(2026, 9, 25); const week = scheduleWindow(selected, 'Theo tuần'), month = scheduleWindow(selected, 'Theo tháng');
  assert.equal(week.from, '2026-10-19'); assert.equal(week.to, '2026-10-25'); assert.equal(week.days.length, 7); assert.equal(month.grid.length, 42); assert.equal(month.from, '2026-09-28'); assert.equal(month.to, '2026-11-08');
  assert.equal(scheduleWindow(selected, 'Theo ngày').days.length, 1);
});
test('calendar clamps query bounds at the supported year edges', () => {
  assert.equal(scheduleWindow(new Date(2099, 11, 31), 'Theo tháng').to, '2099-12-31'); assert.equal(scheduleWindow(new Date(1900, 0, 1), 'Theo tháng').from, '1900-01-01');
});
