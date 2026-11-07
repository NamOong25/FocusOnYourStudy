const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, file);
const http = require('../src/shared/api/http.ts');
const { createDataExportApi, parseDataExport, exportSections } = require('../src/features/account/export/dataExportApi.ts');
const { DataExportManager } = require('../src/features/account/export/DataExportManager.ts');
const owner = '11111111-1111-4111-8111-111111111111';
const filename = 'focusyourstudy-20261106-100000.json';
const signal = () => new AbortController().signal;
const documentValue = () => ({
  format: 'focusyourstudy-personal-data', formatVersion: 1, exportedAt: '2026-11-06T10:00:00Z',
  profile: { id: owner, email: 'export@example.test', fullName: 'Tên tiếng Việt' },
  ...Object.fromEntries(exportSections.map(section => [section, []])),
  notificationPreferences: { reminderMinutes: 15 }, pomodoroGoal: { dailySessions: 4 },
});
const raw = (value = documentValue(), disposition = 'attachment; filename="' + filename + '"') => ({
  text: JSON.stringify(value), value, contentType: 'application/json; charset=utf-8', disposition,
});
const prepared = () => parseDataExport(raw(), owner);
function gate() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
const apiWith = fetcher => createDataExportApi('http://localhost:8080', operation => operation('private-token'), owner, { fetcher });

test('downloads raw file with explicit Bearer and cookies omitted, preserving UTF-8 text and safe filename', async () => {
  const value = documentValue();
  value.assignments = [{ title: 'Bài tập "JSON"\nGhi chú →', score: 0 }];
  let options;
  const api = apiWith(async (url, input) => {
    assert.equal(url, 'http://localhost:8080/api/v1/users/me/export');
    options = input;
    return new Response(JSON.stringify(value), { status: 200, headers: {
      'Content-Type': 'application/json;charset=utf-8', 'Content-Disposition': 'attachment; filename="' + filename + '"',
    } });
  });
  const file = await api.prepare(signal());
  assert.equal(options.headers.Authorization, 'Bearer private-token');
  assert.equal(options.credentials, 'omit');
  assert.equal(file.text, JSON.stringify(value));
  assert.equal(file.filename, filename);
  assert.equal(file.bytes, Buffer.byteLength(file.text, 'utf8'));
  assert.equal(file.counts.assignments, 1);
});

test('missing or unsafe filenames fall back to the validated UTC export timestamp', () => {
  for (const header of [null, 'attachment; filename="../../secret.json"', 'attachment; filename="file.html"', 'inline']) {
    assert.equal(parseDataExport(raw(documentValue(), header), owner).filename, filename);
  }
});

test('foreign account, unknown format, missing sections and HTML cannot become prepared files', () => {
  for (const patch of [
    { formatVersion: 2 }, { profile: { id: 'foreign', email: 'foreign@example.test' } },
    { assignments: undefined }, { exportedAt: 'bad-time' }, { notificationPreferences: null },
  ]) assert.throws(() => parseDataExport(raw({ ...documentValue(), ...patch }), owner), { code: 'INVALID_EXPORT_RESPONSE' });
  assert.throws(() => parseDataExport({ ...raw(), contentType: 'text/html' }, owner), { code: 'INVALID_EXPORT_RESPONSE' });
});

test('HTTP errors stay errors and no failed GET automatically retries', async () => {
  for (const [status, code] of [[413, 'EXPORT_TOO_LARGE'], [401, 'INVALID_ACCESS_TOKEN'], [503, 'DATABASE_UNAVAILABLE']]) {
    let calls = 0;
    const api = apiWith(async () => { calls++; return new Response(JSON.stringify({ code }), { status }); });
    await assert.rejects(api.prepare(signal()), error => error.status === status && error.code === code);
    assert.equal(calls, 1);
  }
  let calls = 0;
  const offline = apiWith(async () => { calls++; throw new Error('Offline'); });
  await assert.rejects(offline.prepare(signal()), { code: 'NETWORK_ERROR' });
  assert.equal(calls, 1);
});

test('abort and timeout stop waiting for a response even when fetch ignores cancellation', async () => {
  const pending = gate(), controller = new AbortController();
  const request = apiWith(async () => pending.promise).prepare(controller.signal);
  controller.abort();
  await assert.rejects(request, { code: 'REQUEST_CANCELLED' });
  const timed = createDataExportApi('http://localhost', operation => operation('token'), owner,
    { timeoutMs: 5, fetcher: async () => pending.promise });
  await assert.rejects(timed.prepare(signal()), { code: 'REQUEST_TIMEOUT' });
  pending.resolve(new Response(JSON.stringify(documentValue()), { headers: { 'Content-Type': 'application/json' } }));
});

test('unexpected successful status, malformed JSON and oversized content are rejected', async () => {
  for (const response of [
    new Response(JSON.stringify(documentValue()), { status: 202, headers: { 'Content-Type': 'application/json' } }),
    new Response('<html>error</html>', { status: 200, headers: { 'Content-Type': 'text/html' } }),
  ]) await assert.rejects(apiWith(async () => response).prepare(signal()));
  const large = documentValue();
  large.assignments = Array.from({ length: 10001 }, () => ({}));
  assert.throws(() => parseDataExport(raw(large), owner), { code: 'EXPORT_TOO_LARGE' });
  assert.throws(() => parseDataExport({ ...raw(), text: 'a'.repeat(20 * 1024 * 1024 + 1) }, owner), { code: 'EXPORT_TOO_LARGE' });
});

test('preparation coalesces clicks and keeps full exported contents out of observable state', async () => {
  const pending = gate();
  let reads = 0, deliveries = 0;
  const manager = new DataExportManager({
    prepare: async () => { reads++; await pending.promise; return prepared(); },
    deliver: async () => { deliveries++; return 'browser'; },
  });
  const first = manager.prepare(), second = manager.prepare();
  assert.equal(first, second);
  pending.resolve();
  await first;
  assert.equal(reads, 1);
  assert.equal(deliveries, 0);
  assert.equal(manager.state.phase, 'ready');
  assert.equal(JSON.stringify(manager.state).includes('Tên tiếng Việt'), false);
  await manager.save();
  assert.equal(deliveries, 1);
  assert.equal(manager.state.delivery, 'browser');
  manager.dispose();
});

test('cancel and a late old response cannot replace a newer prepared snapshot', async () => {
  const old = gate();
  let calls = 0;
  const manager = new DataExportManager({
    prepare: async () => ++calls === 1 ? old.promise : { ...prepared(), filename: 'new.json' },
    deliver: async () => 'browser',
  });
  const first = manager.prepare();
  await Promise.resolve();
  manager.cancel();
  await manager.prepare();
  old.resolve(prepared());
  await assert.rejects(first, { code: 'REQUEST_CANCELLED' });
  assert.equal(manager.state.file.filename, 'new.json');
  manager.dispose();
});

test('a save error retains the prepared file for deliberate retry without requesting another export', async () => {
  let reads = 0, saves = 0;
  const manager = new DataExportManager({
    prepare: async () => { reads++; return prepared(); },
    deliver: async () => { if (++saves === 1) throw new http.ApiError('Blocked', 'EXPORT_SAVE_FAILED'); return 'browser'; },
  });
  await manager.prepare();
  await assert.rejects(manager.save(), { code: 'EXPORT_SAVE_FAILED' });
  assert.equal(manager.state.phase, 'ready');
  await manager.save();
  assert.equal(reads, 1);
  assert.equal(saves, 2);
  manager.dispose();
});

test('disposing during preparation discards secret contents and prevents any later delivery', async () => {
  const pending = gate();
  let deliveries = 0;
  const manager = new DataExportManager({ prepare: async () => pending.promise, deliver: async () => { deliveries++; return 'browser'; } });
  const reading = manager.prepare();
  await Promise.resolve();
  manager.dispose();
  pending.resolve(prepared());
  await assert.rejects(reading, { code: 'REQUEST_CANCELLED' });
  assert.throws(() => manager.save(), { code: 'REQUEST_CANCELLED' });
  assert.equal(manager.state.file, null);
  assert.equal(deliveries, 0);
});

function loadPlatform(filename, modules, globals = {}) {
  const module = { exports: {} };
  const path = require.resolve('../src/features/account/export/' + filename);
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name.endsWith('/api/http')) return http;
    if (modules[name]) return modules[name];
    throw new Error('Unexpected module ' + name);
  }, ...globals });
  return module.exports.saveExport;
}

function webEnvironment(blocked = false) {
  const revoked = [], timers = [], links = [], blobs = [];
  return { revoked, timers, links, blobs, globals: {
    Blob, URL: { createObjectURL: blob => { blobs.push(blob); return 'blob:private-export'; }, revokeObjectURL: url => revoked.push(url) },
    document: { body: { appendChild: link => links.push(link) }, createElement: () => ({
      style: {}, click() { if (blocked) throw new Error('Blocked'); this.clicked = true; }, remove() { this.removed = true; },
    }) }, setTimeout: (fn, delay) => { timers.push({ fn, delay }); },
  } };
}

test('web saves a JSON Blob with a safe filename and releases its temporary link and URL', async () => {
  const env = webEnvironment();
  const save = loadPlatform('saveExport.web.ts', {}, env.globals);
  assert.equal(await save(prepared(), signal(), () => {}), 'browser');
  assert.equal(env.links[0].href, 'blob:private-export');
  assert.equal(env.links[0].download, filename);
  assert.equal(env.links[0].clicked, true);
  assert.equal(env.links[0].removed, true);
  assert.equal(await env.blobs[0].text(), prepared().text);
  assert.equal(env.revoked.length, 0);
  env.timers[0].fn();
  assert.deepEqual(env.revoked, ['blob:private-export']);
});

test('a blocked web download or changed owner cleans up and reports failure', async () => {
  const blocked = webEnvironment(true);
  await assert.rejects(loadPlatform('saveExport.web.ts', {}, blocked.globals)(prepared(), signal(), () => {}),
    { code: 'EXPORT_SAVE_FAILED' });
  assert.equal(blocked.links[0].removed, true);
  assert.equal(blocked.revoked.length, 1);
  const changed = webEnvironment();
  let checks = 0;
  await assert.rejects(loadPlatform('saveExport.web.ts', {}, changed.globals)(prepared(), signal(), () => {
    if (++checks > 1) throw http.cancelledRequest();
  }), { code: 'REQUEST_CANCELLED' });
  assert.equal(changed.links[0].clicked, undefined);
  assert.equal(changed.revoked.length, 1);
});

function nativeEnvironment(available = true) {
  const files = [], shared = [], directories = [], timers = [];
  class Directory {
    constructor(...parts) { this.uri = parts.join('/'); this.exists = false; directories.push(this); }
    create() { this.exists = true; }
    delete() { this.exists = false; this.deleted = true; }
  }
  class File {
    constructor(directory, name) { this.uri = directory.uri + '/' + name; files.push(this); }
    create() {}
    write(text, options) { this.text = text; this.encoding = options.encoding; }
  }
  return { files, shared, directories, timers, modules: {
    'expo-file-system': { Directory, File, Paths: { cache: 'file:///private/cache' } },
    'expo-sharing': { isAvailableAsync: async () => available, shareAsync: async (url, options) => shared.push({ url, options }) },
  }, globals: { setTimeout: (fn, delay) => timers.push({ fn, delay }) } };
}

test('native sharing uses a private UTF-8 file and lets the recipient read before cache cleanup', async () => {
  const env = nativeEnvironment();
  const save = loadPlatform('saveExport.ts', env.modules, env.globals);
  assert.equal(await save(prepared(), signal(), () => {}), 'sharing');
  assert.equal(env.files[0].text, prepared().text);
  assert.equal(env.files[0].encoding, 'utf8');
  assert.equal(env.shared[0].options.mimeType, 'application/json');
  assert.equal(env.shared[0].options.UTI, 'public.json');
  assert.ok(env.shared[0].url.startsWith('file:///private/cache/focus-export-'));
  assert.ok(env.shared[0].url.endsWith('/' + filename));
  assert.equal(env.directories[0].deleted, undefined);
  env.timers[0].fn();
  assert.equal(env.directories[0].deleted, true);
});

test('unavailable sharing and cancellation before opening the sheet never transmit a file', async () => {
  const unavailable = nativeEnvironment(false);
  await assert.rejects(loadPlatform('saveExport.ts', unavailable.modules, unavailable.globals)(prepared(), signal(), () => {}),
    { code: 'EXPORT_SHARING_UNAVAILABLE' });
  assert.equal(unavailable.directories.length, 0);
  const cancelled = nativeEnvironment();
  let checks = 0;
  await assert.rejects(loadPlatform('saveExport.ts', cancelled.modules, cancelled.globals)(prepared(), signal(), () => {
    if (++checks === 3) throw http.cancelledRequest();
  }), { code: 'REQUEST_CANCELLED' });
  assert.equal(cancelled.shared.length, 0);
  assert.equal(cancelled.directories[0].deleted, true);
});
