const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const { filterReminderTypes, inQuietHours } = require('../src/features/notifications/reminderPolicy.ts');
const { applyReadReceipts, markRemindersRead } = require('../src/features/notifications/notifications.ts');
const { ReminderPreferencesSource } = require('../src/features/account/preferences/ReminderPreferencesSource.ts');
const { ruleDraft } = require('../src/features/schedule/ruleDraft.ts');
const { examDraft } = require('../src/features/exams/examDraft.ts');
const { ApiError } = require('../src/shared/api/http.ts');

const preferences = () => ({ assignments: true, classes: true, exams: true, reminderMinutes: 30,
  quiet: true, quietStart: '22:00', quietEnd: '07:00', version: 0 });
const reminders = () => ['task', 'class', 'exam', 'saved-class', 'saved-exam'].map(kind => ({
  id: kind, kind, revision: kind + '-revision', target: { kind, id: kind }, title: kind, at: 0,
}));
function gate() {
  let resolve, reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

test('filters every preview and server reminder kind without changing sources or receipts', () => {
  const all = reminders();
  assert.deepEqual(filterReminderTypes(all, preferences()), all);
  const hidden = filterReminderTypes(all, { ...preferences(), exams: false });
  assert.deepEqual(hidden.map(row => row.kind), ['task', 'class', 'saved-class']);
  assert.deepEqual(filterReminderTypes(all, { ...preferences(), classes: false }).map(row => row.kind), ['task', 'exam', 'saved-exam']);
  assert.deepEqual(filterReminderTypes(all, { ...preferences(), assignments: false }).map(row => row.kind), ['class', 'exam', 'saved-class', 'saved-exam']);
  assert.deepEqual(filterReminderTypes(all, { ...preferences(), assignments: false, classes: false, exams: false }), []);
  assert.deepEqual(filterReminderTypes(all, null), []);
  const receipts = markRemindersRead({}, all);
  assert.ok(applyReadReceipts(filterReminderTypes(all, preferences()), receipts).every(row => row.read));
  assert.equal(all.length, 5);
  assert.equal(hidden[0], all[0]);
});

test('overnight quiet hours include the start and exclude the end in the account timezone', () => {
  const p = preferences(), zone = 'Asia/Ho_Chi_Minh';
  for (const [at, expected] of [
    ['2026-11-06T14:59:59Z', false], ['2026-11-06T15:00:00Z', true],
    ['2026-11-06T23:59:59Z', true], ['2026-11-07T00:00:00Z', false],
  ]) assert.equal(inQuietHours(p, new Date(at), zone), expected);
  const at = new Date('2026-11-06T16:00:00Z');
  assert.equal(inQuietHours(p, at, zone), true);
  assert.equal(inQuietHours(p, at, 'UTC'), false);
});

test('daytime and disabled quiet hours are handled without hiding any reminder cards', () => {
  const day = { ...preferences(), quietStart: '12:00', quietEnd: '13:00' };
  assert.equal(inQuietHours(day, new Date('2026-11-06T05:00:00Z'), 'Asia/Ho_Chi_Minh'), true);
  assert.equal(inQuietHours(day, new Date('2026-11-06T06:00:00Z'), 'Asia/Ho_Chi_Minh'), false);
  assert.equal(inQuietHours({ ...day, quiet: false }, new Date('2026-11-06T05:00:00Z'), 'Asia/Ho_Chi_Minh'), false);
  assert.equal(inQuietHours(null, new Date(), 'UTC'), false);
  const all = reminders();
  assert.equal(filterReminderTypes(all, preferences()).length, all.length);
});

test('quiet hours follow repeated and skipped local clocks at DST transitions', () => {
  const repeated = { ...preferences(), quietStart: '01:00', quietEnd: '02:00' };
  for (const at of ['2026-11-01T05:30:00Z', '2026-11-01T06:30:00Z']) {
    assert.equal(inQuietHours(repeated, new Date(at), 'America/New_York'), true);
  }
  const skipped = { ...preferences(), quietStart: '01:30', quietEnd: '03:00' };
  assert.equal(inQuietHours(skipped, new Date('2026-03-08T06:59:00Z'), 'America/New_York'), true);
  assert.equal(inQuietHours(skipped, new Date('2026-03-08T07:00:00Z'), 'America/New_York'), false);
});

test('new rule and exam drafts use the selected default but existing explicit and disabled reminders win', () => {
  assert.equal(ruleDraft(undefined, { reminderMinutes: 60 }).reminderMinutes, '60');
  assert.equal(ruleDraft({ reminderMinutes: 0 }, { reminderMinutes: 60 }).reminderMinutes, '0');
  assert.equal(ruleDraft({ reminderMinutes: 180 }, { reminderMinutes: 60 }).reminderMinutes, '180');
  assert.deepEqual(examDraft(undefined, 'course', 5).minutes, [5]);
  const original = { reminder: true, reminderMinutes: [1440, 180], startsAt: '2026-11-07T01:00:00Z',
    endsAt: '2026-11-07T02:00:00Z', timeZone: 'Asia/Ho_Chi_Minh' };
  const draft = examDraft(original, 'course', 30);
  assert.deepEqual(draft.minutes, [1440, 180]);
  draft.minutes.push(30);
  assert.deepEqual(original.reminderMinutes, [1440, 180]);
  assert.deepEqual(examDraft({ ...original, reminder: false, reminderMinutes: [] }, 'course', 30).minutes, []);
});

test('a confirmed save updates shared preferences immediately and late reads cannot undo it', async () => {
  const pending = gate();
  const source = new ReminderPreferencesSource(async () => pending.promise);
  const reading = source.reload();
  source.accept({ ...preferences(), exams: false, version: 1 });
  assert.equal(source.state.value.exams, false);
  assert.deepEqual(filterReminderTypes(reminders(), source.state.value).map(row => row.kind), ['task', 'class', 'saved-class']);
  pending.resolve(preferences());
  await reading;
  assert.equal(source.state.value.version, 1);
  assert.equal(source.state.value.exams, false);
  source.dispose();
});

test('an old read failure cannot erase a newer confirmed save', async () => {
  const pending = gate();
  const source = new ReminderPreferencesSource(async () => pending.promise);
  const reading = source.reload();
  source.accept({ ...preferences(), version: 1 });
  pending.reject(new ApiError('Lost old read', 'NETWORK_ERROR'));
  await assert.rejects(reading);
  assert.equal(source.state.error, null);
  assert.equal(source.state.value.version, 1);
  source.dispose();
});

test('coalesces concurrent reloads and retains the last known preferences on a failed later read', async () => {
  let fail = false, requests = 0;
  const source = new ReminderPreferencesSource(async () => {
    requests++;
    if (fail) throw new ApiError('Offline', 'NETWORK_ERROR');
    return preferences();
  });
  const first = source.reload(), second = source.reload();
  assert.equal(first, second);
  await first;
  assert.equal(requests, 1);
  fail = true;
  await assert.rejects(source.reload());
  assert.equal(source.state.value.reminderMinutes, 30);
  assert.equal(source.state.error.code, 'NETWORK_ERROR');
  fail = false;
  await source.reload();
  assert.equal(source.state.error, null);
  source.dispose();
});

test('discarding the previous account source blocks late results and clears its shared values', async () => {
  const pending = gate();
  let signal;
  const previous = new ReminderPreferencesSource(async current => { signal = current; return pending.promise; });
  const reading = previous.reload();
  await Promise.resolve();
  previous.dispose();
  pending.resolve(preferences());
  await assert.rejects(reading, { code: 'REQUEST_CANCELLED' });
  assert.equal(signal.aborted, true);
  assert.equal(previous.state.value, null);
  assert.throws(() => previous.accept(preferences()), { code: 'REQUEST_CANCELLED' });
  const next = new ReminderPreferencesSource(async () => ({ ...preferences(), reminderMinutes: 15 }));
  await next.reload();
  assert.equal(next.state.value.reminderMinutes, 15);
  next.dispose();
});

test('web sync scopes signals to the API and account, refreshes on returning and removes its listeners', () => {
  const windowEvents = new Map(), documentEvents = new Map(), signals = [];
  let reads = 0, interval, cleared = false;
  const document = { visibilityState: 'visible', addEventListener: (name, fn) => documentEvents.set(name, fn),
    removeEventListener: name => documentEvents.delete(name) };
  const window = { localStorage: { setItem: (key, value) => signals.push({ key, value }) },
    addEventListener: (name, fn) => windowEvents.set(name, fn), removeEventListener: name => windowEvents.delete(name) };
  const module = { exports: {} };
  const file = require.resolve('../src/features/account/preferences/reminderPreferencesSync.web.ts');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, window, document,
    require: () => ({ API_BASE_URL: 'http://localhost:8080' }), setInterval: fn => { interval = fn; return 1; },
    clearInterval: () => { cleared = true; } });
  const sync = module.exports;
  const stop = sync.startReminderPreferencesSync(async () => { reads++; }, 'account-A');
  sync.notifyReminderPreferences('account-A');
  assert.ok(signals[0].key.includes('http://localhost:8080'));
  assert.ok(signals[0].key.includes('account-A'));
  windowEvents.get('storage')({ key: sync.reminderPreferencesSignalKey('account-B') });
  assert.equal(reads, 0);
  windowEvents.get('storage')({ key: signals[0].key });
  assert.equal(reads, 1);
  document.visibilityState = 'hidden';
  interval();
  assert.equal(reads, 1);
  document.visibilityState = 'visible';
  documentEvents.get('visibilitychange')();
  assert.equal(reads, 2);
  stop();
  assert.equal(cleared, true);
  assert.equal(windowEvents.size + documentEvents.size, 0);
});
