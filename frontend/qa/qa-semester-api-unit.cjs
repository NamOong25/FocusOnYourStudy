const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-semesters-api/unit');
for (const name of ['shared/api/http', 'features/academics/academic', 'features/academics/api/semestersApi', 'features/academics/api/SemesterManager']) {
  const dest = path.join(out, name + '.js'); fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText);
}
const { createSemestersApi } = require(path.join(out, 'features/academics/api/semestersApi.js'));
const { SemesterManager } = require(path.join(out, 'features/academics/api/SemesterManager.js'));
const { ApiError } = require(path.join(out, 'shared/api/http.js'));
const raw = { id: '12345678-1234-1234-1234-123456789012', term: 1, startYear: 2026, status: 'CURRENT', note: '', version: 0 };
const input = { term: 1, startYear: 2026, status: 'Đang học', note: 'Ghi chú' };
const row = { id: raw.id, term: 1, name: 'Học kỳ 1', academicYear: '2026 – 2027', status: 'Đang học', note: '', version: 0 };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function transport(response = [raw], code = 200) {
  const calls = [];
  const api = createSemestersApi('http://localhost:8080', work => work('access-test'), { fetcher: async (url, options) => {
    calls.push({ url, ...options }); return code === 204 ? new Response(null, { status: code }) : new Response(JSON.stringify({ data: response }), { status: code });
  } });
  return { api, calls };
}
function fixture() {
  const calls = { list: 0, save: 0, remove: 0 };
  const api = { async list() { calls.list++; return [row]; }, async save() { calls.save++; return { ...row, version: 1 }; }, async remove() { calls.remove++; } };
  return { api, calls, manager: new SemesterManager(api) };
}
(async () => {
  const passed = [];
  async function test(name, work) { await work(); passed.push(name); }
  await test('GET sends explicit bearer without cookies or CSRF', async () => {
    const { api, calls } = transport(); assert.deepEqual(await api.list(), [row]);
    assert.equal(calls[0].headers.Authorization, 'Bearer access-test'); assert.equal(calls[0].credentials, 'omit');
    assert.equal(calls[0].headers['X-XSRF-TOKEN'], undefined); assert.ok(calls[0].url.endsWith('/api/v1/semesters'));
  });
  await test('POST maps Vietnamese status and sends only allowed fields', async () => {
    const { api, calls } = transport(raw, 201); await api.save(input);
    assert.equal(calls[0].method, 'POST'); assert.deepEqual(JSON.parse(calls[0].body), { ...input, status: 'CURRENT' });
  });
  await test('PUT uses original server version', async () => {
    const { api, calls } = transport({ ...raw, version: 4 }); await api.save(input, { ...row, version: 3 });
    assert.equal(calls[0].method, 'PUT'); assert.ok(calls[0].url.endsWith('/' + row.id)); assert.equal(JSON.parse(calls[0].body).version, 3);
  });
  await test('DELETE accepts empty 204 and supplies version', async () => {
    const { api, calls } = transport(null, 204); await api.remove(row);
    assert.equal(calls[0].method, 'DELETE'); assert.ok(calls[0].url.endsWith('?version=0'));
  });
  await test('missing version prevents PUT and DELETE', async () => {
    const { api, calls } = transport(raw); const old = { ...row, version: undefined };
    await assert.rejects(api.save(input, old), e => e.code === 'SEMESTER_VERSION_CONFLICT');
    await assert.rejects(api.remove(old), e => e.code === 'SEMESTER_VERSION_CONFLICT'); assert.equal(calls.length, 0);
  });
  for (const [field, value] of [['id', 'preview'], ['term', 4], ['startYear', 1800], ['status', 'UNKNOWN'], ['note', null], ['version', -1]]) {
    await test('rejects invalid response ' + field, async () => { await assert.rejects(transport([{ ...raw, [field]: value }]).api.list(), e => e.code === 'INVALID_RESPONSE'); });
  }
  await test('rejects duplicate identities and malformed list', async () => {
    await assert.rejects(transport([raw, raw]).api.list(), e => e.code === 'INVALID_RESPONSE');
    await assert.rejects(transport({ items: [] }).api.list(), e => e.code === 'INVALID_RESPONSE');
  });
  await test('initial load failure is distinct from an empty loaded list', async () => {
    const f = fixture(); f.api.list = async () => { throw new ApiError('Offline', 'NETWORK_ERROR'); };
    await assert.rejects(f.manager.reload()); assert.equal(f.manager.state.loaded, false); assert.equal(f.manager.state.needsReload, true);
    f.api.list = async () => []; await f.manager.reload(); assert.equal(f.manager.state.loaded, true); assert.deepEqual(f.manager.state.semesters, []);
  });
  await test('concurrent readers share one request and mutations wait for reads', async () => {
    const f = fixture(), held = deferred(); f.api.list = () => { f.calls.list++; return held.promise; };
    const first = f.manager.reload(), second = f.manager.reload(); assert.equal(first, second);
    await assert.rejects(f.manager.save(input), e => e.code === 'REQUEST_BUSY'); held.resolve([row]); await first; assert.equal(f.calls.list, 1);
  });
  await test('successful write reloads authoritative status and version for all rows', async () => {
    const f = fixture(); await f.manager.reload();
    f.api.list = async () => [{ ...row, status: 'Đã kết thúc', version: 7 }, { ...row, id: 'other', term: 2, status: 'Đang học', version: 0 }];
    await f.manager.save({ ...input, term: 2 }); assert.equal(f.manager.state.semesters[0].version, 7); assert.equal(f.manager.state.semesters[0].status, 'Đã kết thúc');
  });
  await test('duplicate clicks and reload cannot overlap a write', async () => {
    const f = fixture(), held = deferred(); await f.manager.reload(); f.api.save = () => held.promise;
    const first = f.manager.save(input); await assert.rejects(f.manager.save(input), e => e.code === 'REQUEST_BUSY');
    await assert.rejects(f.manager.reload(), e => e.code === 'REQUEST_BUSY'); held.resolve(row); await first;
  });
  await test('lost mutation response never retries and blocks writes until GET reconciliation', async () => {
    const f = fixture(); await f.manager.reload(); f.api.save = async () => { f.calls.save++; throw new ApiError('Offline', 'NETWORK_ERROR'); };
    await assert.rejects(f.manager.save(input)); assert.equal(f.calls.save, 1); assert.equal(f.manager.state.needsReload, true);
    await assert.rejects(f.manager.remove(row), e => e.code === 'SEMESTERS_RELOAD_REQUIRED'); assert.equal(f.calls.remove, 0);
    await f.manager.reload(); assert.equal(f.manager.state.needsReload, false);
  });
  await test('version conflict keeps cached server version and requires reload', async () => {
    const f = fixture(); await f.manager.reload(); f.api.save = async () => { throw new ApiError('Conflict', 'SEMESTER_VERSION_CONFLICT', 409); };
    await assert.rejects(f.manager.save(input, row)); assert.equal(f.manager.state.semesters[0].version, 0); assert.equal(f.manager.state.needsReload, true);
  });
  await test('validation failure permits correction without forced reload', async () => {
    const f = fixture(); await f.manager.reload(); f.api.save = async () => { throw new ApiError('Invalid', 'VALIDATION_FAILED', 400); };
    await assert.rejects(f.manager.save(input)); assert.equal(f.manager.state.needsReload, false); assert.equal(f.manager.state.busy, false);
  });
  await test('confirmed commit followed by GET failure still reports save success', async () => {
    const f = fixture(); await f.manager.reload(); f.api.list = async () => { throw new ApiError('Offline', 'NETWORK_ERROR'); };
    const saved = await f.manager.save(input); assert.equal(saved.version, 1); assert.equal(f.manager.state.needsReload, true); assert.equal(f.manager.state.busy, false);
  });
  await test('delete reloads list instead of selecting a fabricated current semester', async () => {
    const f = fixture(); await f.manager.reload(); f.api.list = async () => [];
    await f.manager.remove(row); assert.deepEqual(f.manager.state.semesters, []); assert.equal(f.calls.remove, 1);
  });
  await test('disposed account ignores late read response', async () => {
    const f = fixture(), held = deferred(); f.api.list = () => held.promise;
    const pending = assert.rejects(f.manager.reload(), e => e.code === 'REQUEST_CANCELLED'); f.manager.dispose(); held.resolve([row]); await pending;
    assert.equal(f.manager.state.loaded, false);
  });
  await test('disposed account ignores late mutation and cannot announce success', async () => {
    const f = fixture(), held = deferred(); await f.manager.reload(); f.api.save = () => held.promise;
    const pending = assert.rejects(f.manager.save(input), e => e.code === 'REQUEST_CANCELLED'); f.manager.dispose(); held.resolve(row); await pending; assert.equal(f.calls.list, 1);
  });
  console.log(JSON.stringify({ passed: true, checks: passed.length, cases: passed }));
})().catch(error => { console.error(error); process.exitCode = 1; });
