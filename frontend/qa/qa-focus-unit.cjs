const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-focus/unit');
for (const file of ['features/focus/focus.ts', 'shared/utils/dates.ts']) {
  const target = path.join(out, file.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const { createFocusState, focusReducer, focusSummary, groupFocusRecords, creditFocusRecords, sampleFocusRecords, focusClock } = require(path.join(out, 'features/focus/focus.js'));
let checks = 0;
const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const time = value => new Date(value).getTime();
const start = time('2026-10-21T19:00:00'), context = { courseId: 'cnpm', courseName: 'Công nghệ phần mềm', taskId: 'test', taskTitle: 'TEST', studySessionId: 'study', studyTitle: 'TỰ HỌC CNPM' };
const toggle = (state, now, id = 'run-1', ctx = context) => focusReducer(state, { type: 'toggle', now, id, context: ctx });
const tick = (state, now) => focusReducer(state, { type: 'tick', now });
let state = createFocusState();
equal(state.goal, 4); equal(state.records, []); equal(state.timer.remainingMs, 1500000); equal(state.timer.endsAt, null);
state = toggle(state, start);
equal(state.timer.endsAt, start + 1500000); equal(state.timer.startedAt, start); equal(state.timer.context, context);
state = tick(state, start + 599999);
equal(state.timer.remainingMs, 900001); equal(state.records.length, 0);
// Pause preserves millisecond precision; many paused ticks do not consume time.
state = toggle(state, start + 600250, 'unused-pause-id');
equal(state.timer.remainingMs, 899750); equal(state.timer.endsAt, null);
equal(tick(state, start + 900250), state);
state = toggle(state, start + 900250, 'unused-resume-id', { ...context, courseName: 'Tên đã đổi' });
equal(state.timer.id, 'run-1'); equal(state.timer.context.courseName, context.courseName);
equal(state.timer.endsAt, start + 1800000);
state = tick(state, start + 1799999); equal(state.records.length, 0);
const beforeCompletion = state;
state = tick(state, start + 1800000);
equal(state.timer.remainingMs, 0); equal(state.timer.endsAt, null); equal(state.records.length, 1);
equal(state.records[0], { ...context, id: 'run-1', startedAt: start, endedAt: start + 1800000, studySeconds: 1500, pausedSeconds: 300, source: 'timer' });
equal(focusClock(state.records[0].endedAt), '19:30');
equal(tick(state, start + 2000000), state);
equal(tick(beforeCompletion, start + 1800000), state); // reducer replays are pure (Strict Mode)
equal(tick(state, start + 9000000).records.length, 1);
// A second run creates a distinct record, never reuses the first start time.
state = toggle(state, start + 2000000, 'run-2');
equal(state.timer.startedAt, start + 2000000);
state = tick(state, start + 3500000); equal(state.records.length, 2);
equal(state.records.map(record => record.id), ['run-2', 'run-1']);
// Break completion, reset and interrupted runs must not add focus minutes.
for (const mode of [1, 2]) {
  let rest = focusReducer(state, { type: 'mode', mode, now: start + 4000000 });
  const duration = mode === 1 ? 300000 : 900000;
  rest = toggle(rest, start + 4000000, `break-${mode}`);
  rest = tick(rest, start + 4000000 + duration + 100000);
  equal(rest.records.length, 2); equal(rest.lastCompletion.mode, mode); equal(rest.timer.remainingMs, 0);
}
let partial = toggle(createFocusState(), start);
partial = tick(partial, start + 100000);
partial = focusReducer(partial, { type: 'reset', now: start + 100001 });
equal(partial.records.length, 0); equal(partial.timer.remainingMs, 1500000); equal(partial.timer.id, undefined);
let switched = focusReducer(toggle(createFocusState(), start), { type: 'mode', mode: 1, now: start + 600000 });
equal(switched.records.length, 0); equal(switched.timer.mode, 1); equal(switched.timer.context, undefined);
// Returning late records the planned deadline, NOT the delayed callback time.
const late = tick(toggle(createFocusState(), start), start + 86400000);
equal(late.records[0].endedAt, start + 1500000); equal(late.records.length, 1);
const pauseAtDeadline = toggle(toggle(createFocusState(), start), start + 1500000, 'must-not-restart');
equal(pauseAtDeadline.records.length, 1); equal(pauseAtDeadline.timer.endsAt, null);
const resetAtDeadline = focusReducer(toggle(createFocusState(), start), { type: 'reset', now: start + 1500000 });
equal(resetAtDeadline.records.length, 1); equal(resetAtDeadline.timer.id, undefined);
// Goal changes retain records; invalid values cannot enter state.
const goalState = focusReducer(state, { type: 'goal', goal: 1 });
equal(goalState.records, state.records); equal(goalState.goal, 1);
for (const goal of [0, -1, 1.5, 13, NaN, Infinity]) equal(focusReducer(state, { type: 'goal', goal }), state);
equal(focusReducer(state, { type: 'mode', mode: 100, now: start }), state);
const now = new Date('2026-10-21T23:59:00');
let summary = focusSummary(state.records, 4, now);
equal([summary.completed, summary.todayMinutes, summary.weekMinutes, summary.progress, summary.remaining, summary.streak], [2, 50, 50, 50, 2, 1]);
equal(focusSummary(state.records, 1, now).progress, 100); equal(focusSummary(state.records, 1, now).remaining, 0);
const recordOn = (day, id = day) => ({ ...context, id, source: 'timer', startedAt: time(`${day}T19:00:00`), endedAt: time(`${day}T19:25:00`), studySeconds: 1500, pausedSeconds: 0 });
const streakRecords = ['2026-10-20', '2026-10-19', '2026-10-18', '2026-10-15', '2026-10-14'].map(day => recordOn(day));
summary = focusSummary(streakRecords, 4, now);
equal(summary.streak, 3); equal(summary.studiedToday, false); equal(summary.completed, 0); equal(summary.weekMinutes, 100);
equal(summary.days.map(day => day.key), ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']);
equal(summary.days.map(day => day.studied), [true, false, false, true, true, true, false]);
equal(focusSummary([...streakRecords, recordOn('2026-10-21')], 4, now).streak, 4);
equal(focusSummary(streakRecords, 4, new Date('2026-10-22T00:00:00')).streak, 0);
equal(focusSummary(state.records, 4, new Date('2026-10-22T00:00:00')).todayMinutes, 0);
equal(focusSummary([], 4, now).streak, 0);
// Midnight belongs to the completion day; duplicate IDs and future entries are excluded.
const midnightStart = time('2026-12-31T23:50:00');
const midnight = tick(toggle(createFocusState(), midnightStart), time('2027-01-01T00:15:00'));
equal(groupFocusRecords(midnight.records, new Date('2027-01-01T00:15:01'))[0].day, '2027-01-01');
equal(focusSummary(midnight.records, 4, new Date('2026-12-31T23:59:59')).completed, 0);
equal(focusSummary([...state.records, ...state.records], 4, now).completed, 2);
const grouped = groupFocusRecords([...state.records, ...streakRecords], now);
equal(grouped[0].entries.length, 2); equal(grouped[0].seconds, 3000); equal(grouped[0].entries[0].id, 'run-2');
equal(grouped.map(group => group.day), ['2026-10-21', '2026-10-20', '2026-10-19', '2026-10-18', '2026-10-15', '2026-10-14']);
// Only the captured study-session ID receives time. Tasks are not modified by crediting.
const sessions = [{ id: 'study', duration: 45, focusedSeconds: 0, status: 'Đang học' }, { id: 'other', duration: 25, focusedSeconds: 0, status: 'Đã lên lịch' }];
let credited = creditFocusRecords(sessions, [state.records[0]]);
equal(credited[0].focusedSeconds, 1500); equal(credited[0].status, 'Đang học'); equal(credited[1], sessions[1]);
credited = creditFocusRecords(credited, [state.records[1]]);
equal(credited[0].focusedSeconds, 3000); equal(credited[0].status, 'Hoàn thành'); equal(sessions[0].focusedSeconds, 0);
equal(creditFocusRecords([], state.records), []); // deleted linked session is harmless
equal(creditFocusRecords(sessions, [{ ...state.records[0], studySessionId: undefined }]), sessions);
const samples = sampleFocusRecords(context, now);
equal(samples.length, 3); equal(samples.every(record => record.source === 'sample'), true);
equal(focusSummary(samples, 4, now).completed, 0); equal(focusSummary(samples, 4, now).weekMinutes, 75); equal(focusSummary(samples, 4, now).streak, 3);
equal(creditFocusRecords(sessions, samples), sessions);
console.log(JSON.stringify({ passed: true, checks, cases: ['precise pause/resume', 'exactly-once completion and replay', 'late wakeup and deadline races', 'break/reset/context changes', 'daily goal and capped progress', 'local midnight/year rollover', 'streak and rolling week', 'history grouping and snapshots', 'linked-session credit and sample isolation'] }));
