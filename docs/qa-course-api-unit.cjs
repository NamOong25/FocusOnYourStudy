const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-courses-api/unit');
for (const name of ['shared/api/http', 'features/grades/grades', 'features/academics/api/coursesApi', 'features/academics/api/CourseManager', 'features/academics/courseLinks']) {
  const dest = path.join(out, name + '.js'); fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText);
}
const { createCoursesApi } = require(path.join(out, 'features/academics/api/coursesApi.js'));
const { CourseManager } = require(path.join(out, 'features/academics/api/CourseManager.js'));
const { reconcileCourseLinks, courseGradeLinks } = require(path.join(out, 'features/academics/courseLinks.js'));
const { ApiError } = require(path.join(out, 'shared/api/http.js'));
const id = '12345678-1234-1234-1234-123456789012', semesterId = '22345678-1234-1234-1234-123456789012';
const raw = { id, semesterId, code: 'WEB', name: 'Web Java', credits: 3, teacher: 'GV', room: 'A1', description: 'Mục tiêu', status: 'STUDYING', color: 'mint', version: 0 };
const row = { ...raw, status: 'Đang học' }, { id: ignoredId, version: ignoredVersion, ...input } = row;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function transport(data = [raw], status = 200) {
  const calls = [];
  const api = createCoursesApi('http://localhost:8080', work => work('only-memory'), { fetcher: async (url, options) => {
    calls.push({ url, ...options }); return status === 204 ? new Response(null, { status }) : new Response(JSON.stringify(status >= 400 ? data : { data }), { status });
  } }); return { api, calls };
}
function fixture() {
  const calls = { list: 0, save: 0, remove: 0 };
  const api = { async list() { calls.list++; return [row]; }, async save(value) { calls.save++; return { ...row, ...value, version: 1 }; }, async remove() { calls.remove++; } };
  return { calls, api, manager: new CourseManager(api) };
}
(async () => {
  const cases = []; const test = async (name, work) => { await work(); cases.push(name); };
  await test('complete account catalogue uses bearer and omits cookies', async () => {
    const f = transport(); assert.deepEqual(await f.api.list(), [row]); assert.ok(f.calls[0].url.endsWith('/courses')); assert.equal(f.calls[0].credentials, 'omit'); assert.equal(f.calls[0].headers.Authorization, 'Bearer only-memory');
  });
  await test('POST maps status and excludes ids, versions and owner fields', async () => {
    const f = transport(raw, 201); await f.api.save({ ...input, id: 'wrong', userId: 'wrong', version: 99 });
    assert.equal(f.calls[0].method, 'POST'); assert.deepEqual(JSON.parse(f.calls[0].body), { ...input, status: 'STUDYING' });
  });
  await test('PUT transfers semester with original version and full field replacement', async () => {
    const f = transport({ ...raw, version: 3 }); await f.api.save({ ...input, teacher: '', room: '', status: 'Dự kiến' }, { ...row, version: 2 });
    assert.equal(f.calls[0].method, 'PUT'); assert.equal(JSON.parse(f.calls[0].body).status, 'PLANNED'); assert.equal(JSON.parse(f.calls[0].body).version, 2); assert.equal(JSON.parse(f.calls[0].body).teacher, '');
  });
  await test('DELETE supplies version and handles empty 204', async () => {
    const f = transport(null, 204); await f.api.remove(row); assert.equal(f.calls[0].method, 'DELETE'); assert.ok(f.calls[0].url.endsWith(id + '?version=0'));
  });
  await test('missing or negative versions cannot mutate', async () => {
    const f = transport(raw); for (const version of [undefined, -1]) {
      await assert.rejects(f.api.save(input, { ...row, version }), e => e.code === 'COURSE_VERSION_CONFLICT');
      await assert.rejects(f.api.remove({ ...row, version }), e => e.code === 'COURSE_VERSION_CONFLICT');
    } assert.equal(f.calls.length, 0);
  });
  for (const [field, value] of [['id', 'preview'], ['semesterId', 'preview'], ['credits', 3.5], ['status', 'constructor'], ['color', 'bad'], ['version', -1], ['name', ''], ['teacher', null]]) {
    await test('reject malformed course response ' + field, async () => { await assert.rejects(transport([{ ...raw, [field]: value }]).api.list(), e => e.code === 'INVALID_RESPONSE'); });
  }
  await test('reject duplicate ids and malformed list', async () => {
    await assert.rejects(transport([raw, raw]).api.list(), e => e.code === 'INVALID_RESPONSE'); await assert.rejects(transport({ items: [] }).api.list(), e => e.code === 'INVALID_RESPONSE');
  });
  await test('business errors are localized without echoing server internals', async () => {
    await assert.rejects(transport({ code: 'COURSE_ALREADY_EXISTS', detail: 'SQL secret' }, 409).api.list(), e => e.message === 'Mã môn này đã có trong học kỳ đã chọn.' && !e.message.includes('SQL'));
  });
  await test('initial failure differs from loaded empty catalogue', async () => {
    const f = fixture(); f.api.list = async () => { throw new ApiError('Offline', 'NETWORK_ERROR'); }; await assert.rejects(f.manager.reload()); assert.equal(f.manager.state.loaded, false);
    f.api.list = async () => []; await f.manager.reload(); assert.equal(f.manager.state.loaded, true); assert.deepEqual(f.manager.state.courses, []);
  });
  await test('readers coalesce and block overlapping mutations', async () => {
    const f = fixture(), held = deferred(); f.api.list = () => { f.calls.list++; return held.promise; }; const read = f.manager.reload(); assert.equal(read, f.manager.reload());
    await assert.rejects(f.manager.save(input), e => e.code === 'REQUEST_BUSY'); held.resolve([row]); await read; assert.equal(f.calls.list, 1);
  });
  await test('mutation is sent once and blocks duplicate save/delete/reload', async () => {
    const f = fixture(), held = deferred(); await f.manager.reload(); f.api.save = () => { f.calls.save++; return held.promise; }; const pending = f.manager.save(input);
    await assert.rejects(f.manager.save(input), e => e.code === 'REQUEST_BUSY'); await assert.rejects(f.manager.remove(row), e => e.code === 'REQUEST_BUSY'); await assert.rejects(f.manager.reload(), e => e.code === 'REQUEST_BUSY'); held.resolve(row); await pending; assert.equal(f.calls.save, 1);
  });
  await test('lost mutation response blocks resends until GET reconciles', async () => {
    const f = fixture(); await f.manager.reload(); f.api.save = async () => { f.calls.save++; throw new ApiError('Offline', 'NETWORK_ERROR'); };
    await assert.rejects(f.manager.save(input)); await assert.rejects(f.manager.remove(row), e => e.code === 'COURSES_RELOAD_REQUIRED'); assert.equal(f.calls.save, 1); await f.manager.reload(); assert.equal(f.manager.state.needsReload, false);
  });
  await test('conflict keeps cached version and draft owner must reload', async () => {
    const f = fixture(); await f.manager.reload(); f.api.save = async () => { throw new ApiError('Conflict', 'COURSE_VERSION_CONFLICT', 409); };
    await assert.rejects(f.manager.save(input, row)); assert.equal(f.manager.state.courses[0].version, 0); assert.equal(f.manager.state.needsReload, true);
  });
  await test('confirmed save survives failed follow-up GET and retains returned course', async () => {
    const f = fixture(); await f.manager.reload(); f.api.list = async () => { throw new ApiError('Offline', 'NETWORK_ERROR'); };
    const result = await f.manager.save({ ...input, name: 'Đã lưu' }); assert.equal(result.version, 1); assert.equal(f.manager.state.courses[0].name, 'Đã lưu'); assert.equal(f.manager.state.needsReload, true);
  });
  await test('confirmed delete survives failed GET without restoring deleted row', async () => {
    const f = fixture(); await f.manager.reload(); f.api.list = async () => { throw new ApiError('Offline', 'NETWORK_ERROR'); }; await f.manager.remove(row); assert.deepEqual(f.manager.state.courses, []); assert.equal(f.manager.state.needsReload, true);
  });
  await test('validation error allows correcting input without reloading', async () => {
    const f = fixture(); await f.manager.reload(); f.api.save = async () => { throw new ApiError('Invalid', 'VALIDATION_FAILED', 400); }; await assert.rejects(f.manager.save(input)); assert.equal(f.manager.state.needsReload, false);
  });
  await test('disposed identity cannot publish late reads or saves', async () => {
    const f = fixture(), held = deferred(); f.api.list = () => held.promise; const pending = assert.rejects(f.manager.reload(), e => e.code === 'REQUEST_CANCELLED'); f.manager.dispose(); held.resolve([row]); await pending; assert.equal(f.manager.state.loaded, false);
    const g = fixture(), saved = deferred(); await g.manager.reload(); g.api.save = () => saved.promise;
    const old = assert.rejects(g.manager.save(input), e => e.code === 'REQUEST_CANCELLED'); g.manager.dispose(); saved.resolve(row); await old; assert.equal(g.calls.list, 1);
  });
  const trial = () => ({ tasks: [{ id: 'task', courseId: id, course: row.name }], classes: [{ id: 'class', courseId: id, title: row.name, teacher: row.teacher }], exams: [{ id: 'exam', courseId: id, course: row.name }], studySessions: [{ id: 'study', courseId: id }], gradeBook: { [id]: { parts: [{ score: 0 }] }, other: { parts: [], previousCourseId: id } } });
  await test('empty automatic retake links allow management; entered zero protects entire chain', async () => {
    const book = { a: { parts: [{ score: null }] }, b: { previousCourseId: 'a', parts: [] }, c: { previousCourseId: 'b', parts: [] } };
    assert.deepEqual(courseGradeLinks('a', book), { retakeLinked: false, gradeLinked: false });
    book.c.parts.push({ score: 0 }); assert.deepEqual(courseGradeLinks('a', book), { retakeLinked: true, gradeLinked: true });
  });
  await test('rename updates linked labels and inherited teacher using stable id', async () => {
    const result = reconcileCourseLinks([row], [{ ...row, name: 'Tên mới', teacher: 'GV mới' }], trial());
    assert.equal(result.tasks[0].course, 'Tên mới'); assert.equal(result.exams[0].course, 'Tên mới'); assert.equal(result.classes[0].title, 'Tên mới'); assert.equal(result.classes[0].teacher, 'GV mới'); assert.equal(result.cleared, 0); assert.equal(result.gradeBook[id].parts[0].score, 0);
  });
  await test('refresh preserves a manually overridden class teacher', async () => {
    const data = trial(); data.classes[0].teacher = 'Giảng viên dạy thay'; const result = reconcileCourseLinks([row], [{ ...row, teacher: 'GV mới' }], data); assert.equal(result.classes[0].teacher, 'Giảng viên dạy thay');
  });
  for (const [name, next] of [['deleted', []], ['moved', [{ ...row, semesterId: 'other-semester' }]]]) {
    await test(name + ' server course resets only its dependent trial data', async () => {
      const data = trial(); data.tasks.push({ id: 'unrelated', courseId: 'other', course: 'Khác' }); const result = reconcileCourseLinks([row], next, data);
      assert.equal(result.invalidated.has(id), true); assert.deepEqual(result.tasks.map(t => t.id), ['unrelated']); assert.equal(result.classes.length + result.exams.length + result.studySessions.length, 0); assert.equal(result.gradeBook[id], undefined); assert.equal(result.gradeBook.other.previousCourseId, undefined);
    });
  }
  console.log(JSON.stringify({ passed: true, checks: cases.length, cases }));
})().catch(error => { console.error(error); process.exitCode = 1; });
