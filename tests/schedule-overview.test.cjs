const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, filename);
process.env.TZ = 'Asia/Ho_Chi_Minh';
const { overviewKey, overviewWindows, projectOverview, occurrenceStatus, occurrenceClock } = require('../src/features/schedule/overview/overview.ts');
const { createOverviewApi } = require('../src/features/schedule/overview/overviewApi.ts');
const { OverviewManager, overviewCacheKey } = require('../src/features/schedule/overview/OverviewManager.ts');
const { ApiError, isCancelled } = require('../src/shared/api/http.ts');
const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222', C = '33333333-3333-4333-8333-333333333333';
const query = { semesterId: A, today: '2026-10-25' };
const rule = (patch = {}) => ({ id: A, courseId: B, weekdays: [7], startsOn: '2026-10-25', endsOn: '2026-10-25',
  startTime: '07:00', endTime: '09:00', timeZone: 'Etc/UTC', room: 'A1', teacher: 'GV', notes: '', reminderMinutes: 15, version: 0, ...patch });
const row = (patch = {}) => ({ scheduleId: A, courseId: B, date: '2026-10-25', startTime: '07:00', endTime: '09:00', timeZone: 'Etc/UTC',
  startsAt: '2026-10-25T07:00:00Z', endsAt: '2026-10-25T09:00:00Z', room: 'A1', teacher: 'GV', notes: '', reminderMinutes: 15,
  scheduleVersion: 0, cancelled: false, changed: false, reason: '', exceptionId: null, ...patch });
const authorized = (operation, signal) => { assert.equal(signal?.aborted ?? false, false); return operation('qa-access'); };
function api({ rules = [rule()], rows = [row()], after, transform, failChunk = 0 } = {}) {
  const calls = []; let inventories = 0, chunks = 0;
  const value = createOverviewApi('http://example.invalid', authorized, { fetcher: async (url, options) => {
    calls.push({ url, options }); const u = new URL(url);
    let data;
    if (!u.pathname.endsWith('/occurrences')) data = ++inventories === 1 || !after ? rules : after;
    else {
      if (++chunks === failChunk) throw Error('Disconnected chunk');
      data = rows.filter(r => r.date >= u.searchParams.get('from') && r.date <= u.searchParams.get('to')
        && (!u.searchParams.get('courseId') || r.courseId === u.searchParams.get('courseId')));
      if (transform) data = transform(data);
    }
    return new Response(JSON.stringify({ data }), { status: 200 });
  } }); return { value, calls };
}
const snapshot = rows => ({ rules: [rule()], rows });
const now = new Date('2026-10-25T07:30:00Z');

test('reads immutable inventory, complete occurrences and inventory again with GET/Bearer/abort support', async () => {
  const { value, calls } = api(), controller = new AbortController(); const result = await value.read(query, controller.signal);
  assert.equal(result.rows.length, 1); assert.equal(calls.length, 3);
  assert.match(calls[0].url, /class-schedules\?semesterId=11111111/); assert.match(calls[1].url, /occurrences\?semesterId=.*from=2026-10-25&to=2026-10-25$/);
  for (const call of calls) { assert.equal(call.options.method, 'GET'); assert.equal(call.options.headers.Authorization, 'Bearer qa-access'); assert.equal(call.options.credentials, 'omit'); }
});
test('a successfully empty inventory is empty data, with no invented RAM schedule or occurrence request', async () => {
  const { value, calls } = api({ rules: [], rows: [] }); assert.deepEqual(await value.read(query), { rules: [], rows: [] }); assert.equal(calls.length, 2);
});
test('finds a future class beyond the first 92 days and skips large gaps without declaring no schedule', async () => {
  const far = rule({ id: C, startsOn: '2027-09-15', endsOn: '2027-09-15', weekdays: [3] });
  const future = row({ scheduleId: C, date: '2027-09-15', startsAt: '2027-09-15T07:00:00Z', endsAt: '2027-09-15T09:00:00Z' });
  const { value, calls } = api({ rules: [rule(), far], rows: [row(), future] });
  const result = await value.read(query); assert.equal(projectOverview(result, new Date('2026-10-26T00:00:00Z')).next.scheduleId, C);
  assert.equal(calls.filter(c => c.url.includes('/occurrences?')).length, 2);
});
test('merges overlapping intervals, caps every chunk at 92 inclusive days and covers the final day', async () => {
  const long = rule({ endsOn: '2027-01-31' }), rows = Array.from({ length: 15 }, (_, i) => {
    const date = new Date(Date.parse('2026-10-25T00:00:00Z') + i * 7 * 86400000).toISOString().slice(0, 10);
    return row({ date, startsAt: date + 'T07:00:00Z', endsAt: date + 'T09:00:00Z' });
  });
  const { value, calls } = api({ rules: [long], rows }); assert.equal((await value.read(query)).rows.length, 15);
  assert.equal(calls.length, 4); assert.match(calls[1].url, /from=2026-10-25&to=2027-01-24$/); assert.match(calls[2].url, /from=2027-01-25&to=2027-01-31$/);
  assert.deepEqual(overviewWindows([long, rule({ id: C, startsOn: '2026-11-01', endsOn: '2026-11-08' })], query.today), overviewWindows([long], query.today));
});
test('course details request only the selected course and never count another course in the same semester', async () => {
  const { value, calls } = api({ rules: [rule(), rule({ id: C, courseId: C })], rows: [row(), row({ scheduleId: C, courseId: C })] });
  const result = await value.read({ ...query, courseId: B }); assert.equal(result.rows.length, 1); assert.equal(result.rules.length, 1); assert.match(calls[1].url, /occurrences\?courseId=22222222/);
});
for (const [label, patch] of Object.entries({ duplicate: values => [...values, ...values], missing: () => [], wrongDay: values => values.map(r => ({ ...r, date: '2026-10-26', startsAt: '2026-10-26T07:00:00Z', endsAt: '2026-10-26T09:00:00Z' })),
  inconsistentTime: values => values.map(r => ({ ...r, startsAt: '2026-10-25T06:00:00Z' })), mixedVersion: values => values.map(r => ({ ...r, scheduleVersion: 1 })), wrongCourse: values => values.map(r => ({ ...r, courseId: C })),
  wrongZone: values => values.map(r => ({ ...r, timeZone: 'Africa/Abidjan' })), wrongRoomWithoutChange: values => values.map(r => ({ ...r, room: 'Unexplained room' })) })) {
  test(`rejects ${label} instead of reporting partial/incorrect overview or empty state`, async () => assert.rejects(api({ transform: patch }).value.read(query), e => ['INVALID_RESPONSE', 'SCHEDULE_OVERVIEW_CHANGED'].includes(e.code)));
}
for (const [label, after] of Object.entries({ deleted: [], added: [rule(), rule({ id: C })], edited: [rule({ version: 1 })], restoreRecreate: [rule({ version: 2 })], metadata: [rule({ teacher: 'Changed metadata' })] })) {
  test(`detects ${label} between inventory reads before publishing a snapshot`, async () => assert.rejects(api({ after }).value.read(query), e => e.code === 'SCHEDULE_OVERVIEW_CHANGED'));
}
test('a later chunk failure fails the complete load instead of returning an earlier nearest class', async () => {
  const { value } = api({ rules: [rule({ endsOn: '2027-01-31' })], failChunk: 2 }); await assert.rejects(value.read(query));
});
test('rejects invalid scope/date before any HTTP call', async () => {
  const { value, calls } = api(); await assert.rejects(value.read({ ...query, semesterId: '../other' })); assert.equal(calls.length, 0);
  assert.throws(() => overviewKey({ ...query, today: '2026-02-30' })); assert.throws(() => overviewKey({ ...query, courseId: 'demo-course' }));
});
test('today includes completed/current/future classes but excludes cancellation; nearest uses current UTC times', () => {
  const past = row({ scheduleId: C, startsAt: '2026-10-25T00:00:00Z', endsAt: '2026-10-25T01:00:00Z' }), cancelled = row({ scheduleId: B, cancelled: true, exceptionId: C });
  const changed = row({ changed: true, exceptionId: C, startTime: '10:00', endTime: '12:00', startsAt: '2026-10-25T10:00:00Z', endsAt: '2026-10-25T12:00:00Z', room: 'NEW', teacher: 'GV mới' });
  const data = projectOverview(snapshot([cancelled, changed, row(), past]), now); assert.equal(data.today.length, 3); assert.equal(data.remaining.length, 2); assert.equal(data.next.changed, false); assert.equal(data.remaining[1].room, 'NEW');
  assert.equal(occurrenceStatus(past, now), 'Đã kết thúc'); assert.equal(occurrenceStatus(row(), now), 'Đang học'); assert.equal(occurrenceStatus(changed, now), 'Sắp học');
  assert.equal(projectOverview(snapshot([row()]), new Date(row().endsAt)).next, undefined); assert.equal(occurrenceStatus(row(), new Date(row().startsAt)), 'Đang học');
});
test('a source date on the other side of midnight belongs to today by actual viewer time', () => {
  const previous = row({ date: '2026-10-24', timeZone: 'America/New_York', startTime: '22:30', endTime: '23:30', startsAt: '2026-10-25T02:30:00Z', endsAt: '2026-10-25T03:30:00Z' });
  const data = projectOverview(snapshot([previous]), new Date('2026-10-25T03:00:00Z')); assert.equal(data.today.length, 1); assert.equal(data.next.date, '2026-10-24');
  assert.deepEqual(occurrenceClock(previous), { date: '2026-10-25', endDate: '2026-10-25', start: '09:30', end: '10:30', different: true });
});
test('classes overlapping viewer midnight appear today; exact boundary outside does not', () => {
  const crossing = row({ startsAt: '2026-10-24T16:30:00Z', endsAt: '2026-10-24T17:30:00Z' }), ended = row({ startsAt: '2026-10-24T16:00:00Z', endsAt: '2026-10-24T17:00:00Z' });
  assert.equal(projectOverview(snapshot([crossing, ended]), now).today.length, 1);
});
test('all-cancelled data retains evidence of saved rules but has no active nearest class', () => {
  const result = projectOverview(snapshot([row({ cancelled: true, exceptionId: C })]), now); assert.equal(result.hasRules, true); assert.equal(result.next, undefined); assert.equal(result.today.length, 0);
});
test('today boundaries handle a 25-hour DST day without a fixed 24-hour cutoff', () => {
  const previous = process.env.TZ; process.env.TZ = 'America/New_York';
  try {
    const late = row({ startsAt: '2026-11-02T04:00:00Z', endsAt: '2026-11-02T04:30:00Z' }), nextDay = row({ startsAt: '2026-11-02T05:00:00Z', endsAt: '2026-11-02T06:00:00Z' });
    assert.equal(projectOverview(snapshot([late, nextDay]), new Date('2026-11-01T12:00:00Z')).today.length, 1);
  } finally { process.env.TZ = previous; }
});
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { resolve, reject, promise }; };
test('same-key reads share one request; a new semester masks old data and ignores late results', async () => {
  const first = deferred(), second = deferred(); let count = 0;
  const manager = new OverviewManager({ read: () => ++count === 1 ? first.promise : second.promise });
  const old = manager.load(query, 0); old.catch(() => {}); assert.equal(manager.load(query, 0), old);
  const latest = manager.load({ ...query, semesterId: C }, 0); assert.deepEqual(manager.state.rows, []); assert.equal(manager.state.loaded, false);
  second.resolve(snapshot([row({ courseId: C })])); await latest; first.resolve(snapshot([row()])); await assert.rejects(old, e => isCancelled(e)); assert.equal(manager.state.rows[0].courseId, C);
});
test('invalidating after a write masks old rows and version, even before a new read resolves', async () => {
  const next = deferred(); let count = 0; const manager = new OverviewManager({ read: () => ++count === 1 ? Promise.resolve(snapshot([row()])) : next.promise });
  await manager.load(query, 0); const load = manager.load(query, 1); assert.equal(manager.state.key, overviewCacheKey(query, 1)); assert.equal(manager.state.loaded, false); assert.deepEqual(manager.state.rows, []);
  next.resolve(snapshot([])); await load; assert.equal(manager.state.rows.length, 0);
});
test('same-scope refresh failure keeps the last complete snapshot and marks it with an error', async () => {
  let fail = false; const manager = new OverviewManager({ read: async () => { if (fail) throw new ApiError('Mạng lỗi', 'NETWORK_ERROR'); return snapshot([row()]); } });
  await manager.load(query, 0); fail = true; await assert.rejects(manager.load(query, 0)); assert.equal(manager.state.loaded, true); assert.equal(manager.state.rows.length, 1); assert.equal(manager.state.error.code, 'NETWORK_ERROR');
});
test('initial failure has no loaded empty state; a cancelled/disposed account never publishes a late response', async () => {
  const fail = new OverviewManager({ read: async () => { throw Error('offline'); } }); await assert.rejects(fail.load(query, 0)); assert.equal(fail.state.loaded, false);
  const request = deferred(), manager = new OverviewManager({ read: () => request.promise }); let notifications = 0; manager.subscribe(() => notifications++);
  const loading = manager.load(query, 0); loading.catch(() => {}); manager.dispose(); const last = notifications; request.resolve(snapshot([row()])); await assert.rejects(loading, e => isCancelled(e)); assert.equal(notifications, last); assert.equal(manager.state.loaded, false);
});
test('day rollover and cancellation do not allow yesterday reads to overwrite the new day', async () => {
  const old = deferred(), manager = new OverviewManager({ read: () => old.promise }); const request = manager.load(query, 0); request.catch(() => {}); manager.cancel(); old.resolve(snapshot([row()])); await assert.rejects(request, e => isCancelled(e)); assert.equal(manager.state.loading, false);
  assert.notEqual(overviewCacheKey(query, 0), overviewCacheKey({ ...query, today: '2026-10-26' }, 0));
});
