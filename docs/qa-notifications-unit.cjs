const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-notifications/unit');
for (const file of ['features/notifications/notifications.ts', 'features/assignments/assignments.ts', 'features/schedule/calendar.ts', 'features/study/learning.ts', 'shared/utils/dates.ts']) {
  const target = path.join(out, file.replace(/\.ts$/, '.js')); fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText);
}
const { buildInAppReminders, applyReadReceipts, markRemindersRead, pruneReadReceipts, notificationTargetExists, reminderOpenLabel } = require(path.join(out, 'features/notifications/notifications.js'));
let checks = 0; const equal = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
const now = new Date('2026-10-21T07:00:00');
const task = (id, deadline, deadlineTime = '09:00', status = 'Chưa làm') => ({ id, title: id, courseId: 'course', course: 'Môn cũ', deadline, deadlineTime, status, priority: 'Cao', notes: '' });
const lesson = (id, start = '08:00', end = '09:00') => ({ id, courseId: 'course', title: 'Lập trình', weekday: 3, weekdays: [3], startsOn: '2026-10-21', endsOn: '2026-10-21', start, end, room: 'A1', teacher: 'GV A', reminderMinutes: 15 });
const exam = (id, date, time, end) => ({ id, courseId: 'course', course: 'Môn cũ', date, time, end, room: 'B2', kind: 'Giữa kỳ', format: 'Tự luận', type: 'Giữa kỳ', reminder: false, reminderMinutes: [60], notes: '' });
const sources = {
  courses: [{ id: 'course', name: 'Lập trình', code: 'IT01', semesterId: 's1' }],
  tasks: [task('overdue', '2026-10-20'), task('today', '2026-10-21'), task('edge', '2026-10-28', '07:00'), task('outside', '2026-10-28', '07:01'), task('done', '2026-10-21', '09:00', 'Hoàn thành'), task('invalid', '2026-02-30')],
  classes: [lesson('class'), lesson('ongoing-class', '06:00', '08:00')], exceptions: [],
  exams: [exam('ongoing-exam', '2026-10-21', '06:30', '08:00'), exam('next-exam', '2026-10-22', '10:00', '11:00'), exam('ended-exam', '2026-10-21', '06:00', '07:00'), exam('far-exam', '2026-10-28', '07:01', '08:00'), exam('invalid-exam', '2026-10-22', '25:00', '26:00')],
};
let items = buildInAppReminders(sources, now);
equal(items.length, 7); equal(items[0].target, { kind: 'task', id: 'overdue' });
equal(items.slice(1, 3).map(item => item.urgency), ['ongoing', 'ongoing']);
equal(items.filter(item => item.kind === 'task').length, 3); equal(items.filter(item => item.kind === 'class').length, 2); equal(items.filter(item => item.kind === 'exam').length, 2);
equal(items.some(item => item.target.id === 'done'), false); equal(items.some(item => item.target.id === 'outside'), false); equal(items.some(item => item.target.id === 'ended-exam'), false);
equal(items.find(item => item.target.id === 'today').subtitle, 'Lập trình · IT01');
equal(items.find(item => item.kind === 'class').target.date, '2026-10-21');
equal(items.some(item => item.target.id === 'next-exam'), true); // in-app agenda is independent of OS reminder opt-in
let receipts = {};
equal(applyReadReceipts(items, receipts).filter(item => !item.read).length, 7);
const one = items.find(item => item.target.id === 'today');
const readOne = markRemindersRead(receipts, [one]); equal(receipts, {}); receipts = readOne;
equal(applyReadReceipts(items, receipts).filter(item => !item.read).length, 6);
equal(markRemindersRead(receipts, [one]), receipts);
receipts = markRemindersRead(receipts, items);
equal(applyReadReceipts(items, receipts).every(item => item.read), true);
equal(markRemindersRead(receipts, items), receipts);
// Relative time and priority/status edits do not continuously turn read items unread.
const later = buildInAppReminders(sources, new Date('2026-10-21T07:01:00'));
equal(applyReadReceipts(later, receipts).find(item => item.target.id === 'today').read, true);
const statusEdited = buildInAppReminders({ ...sources, tasks: sources.tasks.map(item => item.id === 'today' ? { ...item, status: 'Đang làm', priority: 'Trung bình' } : item) }, now);
equal(applyReadReceipts(statusEdited, receipts).find(item => item.target.id === 'today').read, true);
// Changed time/title/room use a new revision under the same stable identity.
const changedTasks = sources.tasks.map(item => item.id === 'today' ? { ...item, deadlineTime: '10:00' } : item);
const changed = buildInAppReminders({ ...sources, tasks: changedTasks }, now), changedOne = changed.find(item => item.target.id === 'today');
equal(changedOne.id, one.id); equal(changedOne.revision === one.revision, false);
equal(applyReadReceipts(changed, receipts).find(item => item.id === one.id).read, false);
equal(applyReadReceipts(changed, receipts).filter(item => !item.read).length, 1);
equal(applyReadReceipts(changed, markRemindersRead(receipts, [changedOne])).every(item => item.read), true);
const renamed = buildInAppReminders({ ...sources, tasks: sources.tasks.map(item => item.id === 'today' ? { ...item, title: 'Tên mới' } : item) }, now);
equal(applyReadReceipts(renamed, receipts).find(item => item.id === one.id).read, false);
const movedExam = buildInAppReminders({ ...sources, exams: sources.exams.map(item => item.id === 'next-exam' ? { ...item, room: 'B9' } : item) }, now);
equal(applyReadReceipts(movedExam, receipts).find(item => item.target.id === 'next-exam').read, false);
const exception = { id: 'override', seriesId: 'class', date: '2026-10-21', kind: 'changed', start: '09:30', end: '10:30', room: 'A9', teacher: 'GV B', reason: 'Đổi phòng' };
const moved = buildInAppReminders({ ...sources, exceptions: [exception] }, now), movedClass = moved.find(item => item.target.id === 'class');
equal(movedClass.id, 'class:class:2026-10-21'); equal(movedClass.target.date, '2026-10-21'); equal(movedClass.changed, true); equal(movedClass.subtitle.includes('A9'), true);
equal(applyReadReceipts(moved, receipts).find(item => item.id === movedClass.id).read, false);
// Cancel/end/delete/complete removes the reminder, with no dangling read flag on reactivation.
const canceled = buildInAppReminders({ ...sources, exceptions: [{ ...exception, kind: 'cancelled' }] }, now);
equal(canceled.some(item => item.target.id === 'class'), false);
const finished = buildInAppReminders({ ...sources, tasks: sources.tasks.map(item => item.id === 'today' ? { ...item, status: 'Hoàn thành' } : item) }, now);
equal(finished.some(item => item.target.id === 'today'), false);
const pruned = pruneReadReceipts(receipts, finished); equal(pruned[one.id], undefined); equal(receipts[one.id], one.revision);
equal(applyReadReceipts(items, pruned).find(item => item.id === one.id).read, false);
equal(pruneReadReceipts(receipts, items), receipts);
const ended = buildInAppReminders(sources, new Date('2026-10-21T09:00:00'));
equal(ended.some(item => item.target.id === 'class'), false); equal(ended.some(item => item.target.id === 'ongoing-class'), false); equal(ended.some(item => item.target.id === 'ongoing-exam'), false);
equal(notificationTargetExists({ kind: 'task', id: 'today' }, sources), true); equal(notificationTargetExists({ kind: 'task', id: 'gone' }, sources), false);
equal(notificationTargetExists({ kind: 'class', id: 'class', date: '2026-10-21' }, sources), true); equal(notificationTargetExists({ kind: 'class', id: 'gone', date: '2026-10-21' }, sources), false);
equal(notificationTargetExists({ kind: 'exam', id: 'next-exam' }, sources), true); equal(notificationTargetExists({ kind: 'exam', id: 'gone' }, sources), false);
// Each repeated class has its own date/identity/read receipt.
const repeated = buildInAppReminders({ ...sources, tasks: [], exams: [], classes: [{ ...lesson('repeated', '06:00', '08:00'), endsOn: '2026-11-10' }] }, now);
equal(repeated.length, 2); equal(repeated.map(item => item.target.date), ['2026-10-21', '2026-10-28']);
equal(new Set(repeated.map(item => item.id)).size, 2);
equal(applyReadReceipts(repeated, markRemindersRead({}, [repeated[0]])).map(item => item.read), [true, false]);
const empty = { tasks: [], classes: [], exceptions: [], exams: [], courses: [] };
equal(buildInAppReminders(empty, now), []); equal(pruneReadReceipts(receipts, []), {}); equal(markRemindersRead(receipts, []), receipts);
equal(reminderOpenLabel(one), 'Mở nhắc bài today'); equal(reminderOpenLabel(movedClass).startsWith('Mở nhắc lịch học Lập trình,'), true);
equal(reminderOpenLabel(items.find(item => item.kind === 'exam')).startsWith('Mở nhắc lịch thi Lập trình,'), true);
const legacyTask = { ...task('legacy', '2026-10-21'), deadlineTime: undefined };
equal(buildInAppReminders({ ...empty, tasks: [legacyTask] }, now)[0].detail.includes('23:59'), true);
const sameNames = buildInAppReminders({ ...empty, tasks: [task('a', '2026-10-21'), { ...task('b', '2026-10-21'), title: 'a' }] }, now);
equal(sameNames.length, 2); equal(new Set(sameNames.map(item => item.id)).size, 2);
equal(sources.tasks[0].id, 'overdue'); equal(sources.classes[0].room, 'A1');
console.log(JSON.stringify({ passed: true, checks, cases: ['task deadline and seven-day window', 'ongoing/ended class and exam', 'recurring occurrence identity and exceptions', 'individual/all read receipts', 'revision changes vs clock ticks', 'pruning and reactivation', 'valid child targets and unique IDs', 'empty/legacy/invalid data without mutation'] }));
