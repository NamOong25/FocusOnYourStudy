const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-statistics/unit');
for (const file of ['features/statistics/statistics.ts', 'features/focus/focus.ts', 'features/assignments/assignments.ts', 'shared/utils/dates.ts']) {
  const target = path.join(out, file.replace(/\.ts$/, '.js')); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const { statisticsData, statisticsRange, validateStatisticsRange, formatStudyTime } = require(path.join(out, 'features/statistics/statistics.js'));
let checks = 0; const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const now = new Date('2026-10-21T19:30:00');
const range = { from: '2026-10-15', to: '2026-10-21' };
const catalog = [{ id: 'a', name: 'React', code: 'R1', semesterId: 's1' }, { id: 'b', name: 'React', code: 'R2', semesterId: 's2' }, { id: 'c', name: 'Java', code: 'J1', semesterId: 's1' }];
const record = (id, day, courseId = 'a', seconds = 1500, source = 'timer', semesterId) => ({ id, courseId, courseName: 'Tên lúc học', semesterId, startedAt: new Date(`${day}T18:00:00`).getTime(), endedAt: new Date(`${day}T19:00:00`).getTime(), studySeconds: seconds, pausedSeconds: 2100, source });
const task = (id, courseId, status, deadline = '2026-10-22', deadlineTime = '18:00') => ({ id, courseId, status, deadline, deadlineTime });
const records = [record('outside', '2026-10-14'), record('first', '2026-10-15', 'a', 1500, 'sample'), record('second', '2026-10-20', 'c'), record('third', '2026-10-21'), record('other', '2026-10-21', 'b'), record('future', '2026-10-22')];
const tasks = [task('done', 'a', 'Hoàn thành', '2026-10-01'), task('late', 'a', 'Đang làm', '2026-10-21', '19:29'), task('due-now', 'c', 'Chưa làm', '2026-10-21', '19:30'), task('later', 'c', 'Chưa làm'), task('other-semester', 'b', 'Hoàn thành')];
const input = { semesterId: 's1', catalog, records, tasks, range, now };
let data = statisticsData(input);
equal(data.entries.map(entry => entry.id), ['third', 'second', 'first']);
equal(data.totalSeconds, 4500); equal(data.sampleCount, 1); equal(data.streak, 2);
equal(data.buckets.length, 7); equal(data.groupedDays, false);
equal(data.buckets.map(bucket => bucket.from), ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']);
equal(data.buckets.map(bucket => bucket.seconds), [1500, 0, 0, 0, 0, 1500, 1500]);
equal(data.buckets.reduce((sum, bucket) => sum + bucket.sessions, 0), data.entries.length);
equal(data.distribution.map(course => [course.id, course.name, course.seconds, course.sessions]), [['a', 'React', 3000, 2], ['c', 'Java', 1500, 1]]);
equal(Math.round(data.distribution.reduce((sum, course) => sum + course.percent, 0)), 100);
equal(data.tasks, { total: 4, done: 1, overdue: 1, notDue: 2, percent: 25 });
equal(statisticsData({ ...input, now: new Date('2026-10-21T19:30:01') }).tasks.overdue, 2);
equal(statisticsData({ ...input, records: [...records, ...records] }).totalSeconds, 4500);
equal(statisticsRange('7 ngày', now, {}), range);
equal(statisticsRange('30 ngày', now, {}), { from: '2026-09-22', to: '2026-10-21' });
equal(statisticsRange('Tùy chọn', now, range), range);
equal(validateStatisticsRange(range), '');
equal(!!validateStatisticsRange({ from: '2026-02-30', to: '2026-10-21' }), true);
equal(!!validateStatisticsRange({ from: '2026-10-22', to: '2026-10-21' }), true);
equal(!!validateStatisticsRange({ from: '', to: '' }), true);
equal(validateStatisticsRange({ from: '2026-10-21', to: '2026-10-21' }), '');
// Day filters affect study time, while assignments cover the whole selected semester.
const oneDay = statisticsData({ ...input, range: { from: '2026-10-21', to: '2026-10-21' } });
equal(oneDay.entries.length, 1); equal(oneDay.totalSeconds, 1500); equal(oneDay.buckets.length, 1);
equal(oneDay.tasks, data.tasks); equal(oneDay.streak, data.streak);
const invalid = statisticsData({ ...input, range: { from: 'bad', to: '2026-10-21' } });
equal(invalid.buckets, []); equal(invalid.entries, []); equal(invalid.totalSeconds, 0);
const empty = statisticsData({ ...input, semesterId: 'empty' });
equal(empty.totalSeconds, 0); equal(empty.entries, []); equal(empty.streak, 0); equal(empty.distribution, []); equal(empty.sampleCount, 0);
equal(empty.tasks, { total: 0, done: 0, overdue: 0, notDue: 0, percent: 0 });
equal(empty.buckets.every(bucket => bucket.seconds === 0), true);
// Equal course names are separate IDs and cannot leak between semesters.
const other = statisticsData({ ...input, semesterId: 's2' }); equal(other.entries.map(entry => entry.id), ['other']); equal(other.tasks.done, 1);
// Captured semester wins if the course is moved; deleted courses retain their history.
const archived = record('archived', '2026-10-20', 'removed', 1500, 'timer', 's1');
const moved = record('moved', '2026-10-20', 'b', 1500, 'timer', 's1');
data = statisticsData({ ...input, records: [archived, moved] });
equal(data.totalSeconds, 3000); equal(data.distribution.find(course => course.id === 'removed').archived, true);
equal(data.distribution.find(course => course.id === 'removed').name, 'Tên lúc học');
equal(statisticsData({ ...input, semesterId: 's2', records: [moved] }).entries, []);
// Month/custom ranges have <=7 contiguous buckets; totals agree with distributions.
const monthRange = statisticsRange('30 ngày', now, range);
const month = statisticsData({ ...input, range: monthRange });
equal(month.buckets.length, 6); equal(month.groupedDays, true); equal(month.buckets[0].from, '2026-09-22'); equal(month.buckets[5].to, '2026-10-21');
equal(month.buckets.reduce((sum, bucket) => sum + bucket.seconds, 0), month.totalSeconds);
equal(month.distribution.reduce((sum, course) => sum + course.seconds, 0), month.totalSeconds);
equal(month.totalSeconds, 6000);
const long = statisticsData({ ...input, range: { from: '1900-01-01', to: '2100-12-31' } });
equal(long.buckets.length <= 7, true); equal(long.buckets[0].from, '1900-01-01'); equal(long.buckets.at(-1).to, '2100-12-31');
for (let index = 1; index < long.buckets.length; index++) {
  const previous = new Date(long.buckets[index - 1].to + 'T12:00:00'); previous.setDate(previous.getDate() + 1);
  equal(long.buckets[index].from, `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`);
}
// Completion date assigns cross-midnight sessions to the new day, not the start day.
const midnight = { ...record('midnight', '2027-01-01'), startedAt: new Date('2026-12-31T23:50:00').getTime(), endedAt: new Date('2027-01-01T00:15:00').getTime() };
const midnightData = statisticsData({ ...input, records: [midnight], range: { from: '2026-12-31', to: '2027-01-01' }, now: new Date('2027-01-01T01:00:00') });
equal(midnightData.buckets.map(bucket => bucket.seconds), [0, 1500]);
// Works across DST when this script runs with TZ=America/New_York as well as Vietnam.
for (const to of ['2026-03-10', '2026-11-03']) {
  const end = new Date(to + 'T20:00:00'), window = statisticsRange('7 ngày', end, range);
  const acrossDst = statisticsData({ ...input, range: window, now: end, records: [] });
  equal(acrossDst.buckets.length, 7); equal(acrossDst.buckets.at(-1).to, to);
}
equal(formatStudyTime(0), '0 phút'); equal(formatStudyTime(1500), '25 phút'); equal(formatStudyTime(3600), '1 giờ'); equal(formatStudyTime(4500), '1 giờ 15 phút'); equal(formatStudyTime(15000), '4 giờ 10 phút');
equal(records[0].id, 'outside'); equal(tasks.length, 5);
console.log(JSON.stringify({ passed: true, checks, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, cases: ['semester isolation and archived snapshots', '7/30/custom inclusive dates', 'bounded contiguous aggregation', 'midnight/year/DST boundaries', 'deduplication and future exclusion', 'sample labeling and zero states', 'deadline precision and task scope', 'chart/distribution totals agree'] }));
