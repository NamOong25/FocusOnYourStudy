const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-session/unit');
for (const name of ['shared/api/http', 'features/account/auth/SessionManager']) {
  const dest = path.join(out, name + '.js'); fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText);
}
const { SessionManager } = require(path.join(out, 'features/account/auth/SessionManager.js'));
const { ApiError } = require(path.join(out, 'shared/api/http.js'));
const unauthorized = () => new ApiError('Invalid session', 'INVALID_ACCESS_TOKEN', 401);
const offline = () => new ApiError('Offline', 'NETWORK_ERROR');
const signal = () => new AbortController().signal;
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture() {
  let record = null, sequence = 0, clock = 0, tail = Promise.resolve();
  const calls = { login: 0, refresh: [], logout: [], profile: [] };
  const user = { id: 'a', email: 'a@example.test', fullName: 'A', school: '', major: '', timeZone: 'Asia/Ho_Chi_Minh' };
  const pair = () => ({ accessToken: 'access-' + ++sequence, refreshToken: 'refresh-' + sequence, expiresIn: 900, tokenType: 'Bearer', user });
  const store = { async read() { return record && { ...record }; }, async write(value) { record = { ...value }; } };
  const coordinator = { run(work) { const result = tail.then(work); tail = result.catch(() => {}); return result; }, notify() {}, listen() { return () => {}; } };
  const api = {
    async login(input, s, before) { await before(); calls.login++; return pair(); },
    async refresh(token, before) { await before(); calls.refresh.push(token); return pair(); },
    async logout(token) { calls.logout.push(token); },
    async profile(token) { calls.profile.push(token); return { ...user }; },
  };
  const manager = () => new SessionManager(api, store, coordinator, () => clock);
  return { api, store, calls, manager, pair, user, record: () => record, advance() { clock += 901_000; },
    async login(m) { await m.signIn({ email: user.email, password: 'NeverPersist123!' }, signal()); } };
}
(async () => {
  const passed = [];
  async function test(name, work) { await work(); passed.push(name); }
  await test('empty boot makes no API requests', async () => { const f = fixture(), m = f.manager(); await m.restore(); assert.equal(m.state.phase, 'ready'); assert.equal(m.state.hasSession, false); assert.deepEqual(f.calls.refresh, []); });
  await test('sign in persists refresh only; reload rotates before profile', async () => {
    const f = fixture(), a = f.manager(); await f.login(a); assert.equal(a.state.profile.id, 'a');
    assert.deepEqual(Object.keys(f.record()).sort(), ['kind', 'refreshToken', 'userId']);
    const b = f.manager(); await b.restore(); assert.deepEqual(f.calls.refresh, ['refresh-1']); assert.equal(b.state.hasSession, true); assert.equal(f.record().refreshToken, 'refresh-2');
  });
  await test('expiry and concurrent readers share one refresh', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); f.advance();
    await Promise.all([m.reloadProfile(signal()), m.reloadProfile(signal()), m.tick()]);
    assert.deepEqual(f.calls.refresh, ['refresh-1']); assert.equal(m.state.profile.id, 'a');
  });
  await test('401 retries profile once with new bearer', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); let rejected = false;
    f.api.profile = async token => { if (!rejected) { rejected = true; throw unauthorized(); } assert.equal(token, 'access-2'); return f.user; };
    await m.reloadProfile(signal()); assert.equal(f.calls.refresh.length, 1); assert.equal(m.state.hasSession, true);
  });
  await test('401 after refresh cannot loop', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); f.api.profile = async () => { throw unauthorized(); };
    await assert.rejects(m.reloadProfile(signal())); assert.equal(f.calls.refresh.length, 1); assert.equal(m.state.hasSession, false); assert.equal(f.record().kind, 'logout-pending');
  });
  await test('invalid refresh clears session', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); f.api.refresh = async (token, before) => { await before(); throw unauthorized(); };
    f.advance(); await m.tick(); assert.equal(m.state.hasSession, false); assert.equal(f.record().kind, 'signed-out');
  });
  await test('CSRF failure before POST can safely retry', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const original = f.api.refresh;
    f.api.refresh = async () => { throw offline(); }; f.advance(); await m.tick(); assert.equal(f.record().kind, 'active'); assert.equal(m.state.hasSession, true);
    f.api.refresh = original; await m.tick(); assert.equal(f.calls.refresh.length, 1);
  });
  await test('lost refresh response is never replayed, including after restart', async () => {
    const f = fixture(), m = f.manager(); await f.login(m);
    f.api.refresh = async (token, before) => { await before(); f.calls.refresh.push(token); throw offline(); };
    f.advance(); await m.tick(); assert.equal(m.state.hasSession, false); assert.equal(f.record().kind, 'logout-pending');
    await m.tick(); const restarted = f.manager(); await restarted.restore();
    assert.deepEqual(f.calls.refresh, ['refresh-1']); assert.deepEqual(f.calls.logout, ['refresh-1']); assert.equal(restarted.state.hasSession, false);
  });
  await test('interrupted journal logs out instead of consuming old refresh', async () => {
    const f = fixture(); await f.store.write({ kind: 'inflight', userId: 'a', refreshToken: 'old' }); await f.manager().restore();
    assert.deepEqual(f.calls.refresh, []); assert.deepEqual(f.calls.logout, ['old']); assert.equal(f.record().kind, 'signed-out');
  });
  await test('offline logout stays signed out across reload and retries later', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const logout = f.api.logout; f.api.logout = async () => { throw offline(); };
    await m.logout(); assert.equal(m.state.hasSession, false); assert.equal(m.state.logoutPending, true);
    const restarted = f.manager(); await restarted.restore(); assert.equal(restarted.state.hasSession, false); assert.equal(f.calls.refresh.length, 0);
    f.api.logout = logout; await restarted.logout(); assert.equal(f.record().kind, 'signed-out'); assert.equal(restarted.state.logoutPending, false);
  });
  await test('logout waits for rotation then revokes newest token', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const started = deferred(), release = deferred(), original = f.api.refresh;
    f.api.refresh = async (...args) => { started.resolve(); await release.promise; return original(...args); };
    f.advance(); const refreshing = m.tick(); await started.promise; const logout = m.logout(); release.resolve(); await Promise.all([refreshing, logout]);
    assert.deepEqual(f.calls.logout, ['refresh-2']); assert.equal(m.state.hasSession, false); assert.equal(f.record().kind, 'signed-out');
  });
  await test('simultaneous tabs rotate the latest stored token under shared lock', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const a = f.manager(), b = f.manager(); await Promise.all([a.restore(), b.restore()]);
    assert.deepEqual(f.calls.refresh, ['refresh-1', 'refresh-2']); assert.equal(a.state.hasSession && b.state.hasSession, true);
  });
  await test('cancelling one caller does not cancel shared rotation', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const started = deferred(), release = deferred(), original = f.api.refresh;
    f.api.refresh = async (...args) => { started.resolve(); await release.promise; return original(...args); }; f.advance();
    const controller = new AbortController(); const a = m.reloadProfile(controller.signal); const rejected = assert.rejects(a, e => e.code === 'REQUEST_CANCELLED');
    const b = m.reloadProfile(signal()); await started.promise; controller.abort(); release.resolve(); await Promise.all([rejected, b]);
    assert.equal(f.calls.refresh.length, 1); assert.equal(m.state.hasSession, true);
  });
  await test('storage failure before journal prevents mutation', async () => {
    const f = fixture(), m = f.manager(); f.store.write = async () => { throw new ApiError('Storage unavailable', 'SESSION_STORAGE_ERROR'); };
    await assert.rejects(f.login(m)); assert.equal(f.calls.login, 0); assert.equal(m.state.hasSession, false);
  });
  await test('storage failure after rotation clears memory and retains crash journal', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const write = f.store.write;
    f.store.write = async record => { if (record.kind !== 'inflight') throw new ApiError('Cannot save', 'SESSION_STORAGE_ERROR'); await write(record); };
    f.advance(); await m.tick(); assert.equal(m.state.hasSession, false); assert.equal(f.record().kind, 'inflight'); assert.equal(m.state.logoutPending, true);
    f.store.write = write; await f.manager().restore(); assert.equal(f.calls.refresh.length, 1); assert.deepEqual(f.calls.logout, ['refresh-1']);
  });
  await test('failed login leaves previous session, but accepted login plus profile 401 blocks it', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const original = f.api.login;
    f.api.login = async (input, s, before) => { await before(); throw new ApiError('Wrong', 'INVALID_CREDENTIALS', 401); };
    await assert.rejects(f.login(m)); assert.equal(f.record().refreshToken, 'refresh-1'); assert.equal(m.state.hasSession, true);
    f.api.login = original; f.api.profile = async () => { throw unauthorized(); };
    await assert.rejects(f.login(m)); assert.equal(f.record().kind, 'logout-pending'); assert.equal(f.record().refreshToken, 'refresh-2'); assert.equal(m.state.hasSession, false);
  });
  await test('profile outage preserves session but hides stale profile until retry', async () => {
    const f = fixture(), m = f.manager(); f.api.profile = async () => { throw offline(); }; await f.login(m);
    assert.equal(m.state.hasSession, true); assert.equal(m.state.profile, null); f.api.profile = async () => f.user; await m.reloadProfile(signal()); assert.equal(m.state.profile.id, 'a');
  });
  await test('late profile response cannot resurrect logged out identity', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const started = deferred(), release = deferred();
    f.api.profile = async () => { started.resolve(); await release.promise; return f.user; };
    const loading = assert.rejects(m.reloadProfile(signal()), e => e.code === 'REQUEST_CANCELLED'); await started.promise;
    await m.logout(); release.resolve(); await loading; assert.equal(m.state.hasSession, false); assert.equal(m.state.profile, null);
  });
  await test('native adapter uses SecureStore and deletes credentials on logout', async () => {
    const vm = require('node:vm'), exports = {}, operations = []; let stored = null;
    const secure = { WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'device-only',
      async getItemAsync(key, options) { operations.push({ key, options }); return stored; },
      async setItemAsync(key, value, options) { operations.push({ key, options }); stored = value; },
      async deleteItemAsync(key, options) { operations.push({ key, options }); stored = null; } };
    const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/features/account/auth/sessionPlatform.ts'), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;
    vm.runInNewContext(compiled, { exports, require(name) { if (name === 'expo-secure-store') return secure;
      if (name.endsWith('/config')) return { API_BASE_URL: 'http://localhost:8080' }; if (name.endsWith('/http')) return { ApiError }; throw new Error(name); } });
    await exports.sessionStore.write({ kind: 'active', userId: 'a', refreshToken: 'secret-native-refresh' });
    assert.equal((await exports.sessionStore.read()).refreshToken, 'secret-native-refresh');
    assert.ok(operations.every(op => /^[\w.-]+$/.test(op.key) && op.options.keychainAccessible === 'device-only'));
    await exports.sessionStore.write({ kind: 'signed-out' }); assert.equal(stored, null); assert.equal(await exports.sessionStore.read(), null);
  });
  await test('refresh sees another-tab identity before its storage event; never retains old profile', async () => {
    const f = fixture(), m = f.manager(); await f.login(m);
    const other = { ...f.user, id: 'b', email: 'b@example.test', fullName: 'B' };
    await f.store.write({ kind: 'active', userId: 'b', refreshToken: 'refresh-b' });
    f.api.refresh = async (token, before) => { await before(); f.calls.refresh.push(token); return { ...f.pair(), user: other }; };
    f.api.profile = async () => other;
    f.advance(); await m.tick(); assert.equal(m.state.profile.id, 'b'); assert.equal(m.state.email, other.email);
  });
  await test('another-tab identity with unavailable refresh hides old workspace and allows retry', async () => {
    const f = fixture(), m = f.manager(); await f.login(m);
    await f.store.write({ kind: 'active', userId: 'b', refreshToken: 'refresh-b' });
    f.api.refresh = async () => { throw offline(); }; f.advance(); await m.tick();
    assert.equal(m.state.profile, null); assert.equal(m.state.hasSession, false); assert.equal(m.state.phase, 'unavailable'); assert.equal(m.state.canRestore, true);
    const other = { ...f.user, id: 'b' }; f.api.refresh = async (token, before) => { await before(); return { ...f.pair(), user: other }; };
    f.api.profile = async () => other; await m.restore(); assert.equal(m.state.profile.id, 'b');
  });
  await test('late A profile cannot overwrite B after switching account', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); const started = deferred(), release = deferred();
    const other = { ...f.user, id: 'b', email: 'b@example.test' };
    f.api.profile = async token => { if (token === 'access-1') { started.resolve(); await release.promise; return f.user; } return other; };
    const old = assert.rejects(m.reloadProfile(signal()), e => e.code === 'REQUEST_CANCELLED'); await started.promise;
    f.api.login = async (input, s, before) => { await before(); return { ...f.pair(), user: other }; };
    await f.login(m); release.resolve(); await old; assert.equal(m.state.profile.id, 'b'); assert.equal(m.state.email, other.email);
  });
  await test('business requests refresh once on 401 and share concurrent rotation', async () => {
    const f = fixture(), m = f.manager(); await f.login(m);
    const work = async token => { if (token === 'access-1') throw unauthorized(); return token; };
    assert.deepEqual(await Promise.all([m.authorized(work), m.authorized(work)]), ['access-2', 'access-2']); assert.equal(f.calls.refresh.length, 1);
  });
  await test('expired business token refreshes before invoking mutation', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); f.advance(); const tokens = [];
    await m.authorized(async token => { tokens.push(token); }); assert.deepEqual(tokens, ['access-2']); assert.equal(f.calls.refresh.length, 1);
  });
  await test('business mutation network or server failure is never replayed', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); let attempts = 0;
    await assert.rejects(m.authorized(async () => { attempts++; throw offline(); }));
    await assert.rejects(m.authorized(async () => { attempts++; throw new ApiError('Unavailable', 'SERVER_ERROR', 503); }));
    assert.equal(attempts, 2); assert.equal(f.calls.refresh.length, 0); assert.equal(m.state.hasSession, true);
  });
  await test('business 401 after refresh ends session without a retry loop', async () => {
    const f = fixture(), m = f.manager(); await f.login(m); let attempts = 0;
    await assert.rejects(m.authorized(async () => { attempts++; throw unauthorized(); }));
    assert.equal(attempts, 2); assert.equal(f.calls.refresh.length, 1); assert.equal(m.state.hasSession, false);
  });
  await test('late business response after logout cannot restore or return A data', async () => {
    const f = fixture(), m = f.manager(), held = deferred(), started = deferred(); await f.login(m);
    const pending = assert.rejects(m.authorized(async () => { started.resolve(); await held.promise; return 'A semester'; }), e => e.code === 'REQUEST_CANCELLED');
    await started.promise; await m.logout(); held.resolve(); await pending; assert.equal(m.state.hasSession, false);
  });
  await test('cancelled business reader does not cancel shared token refresh', async () => {
    const f = fixture(), m = f.manager(), held = deferred(), started = deferred(); await f.login(m); f.advance();
    const original = f.api.refresh; f.api.refresh = async (...args) => { started.resolve(); await held.promise; return original(...args); };
    const controller = new AbortController(); const cancelled = assert.rejects(m.authorized(async () => 'old', controller.signal), e => e.code === 'REQUEST_CANCELLED');
    const other = m.authorized(async token => token); await started.promise; controller.abort(); held.resolve();
    await cancelled; assert.equal(await other, 'access-2'); assert.equal(f.calls.refresh.length, 1);
  });
  await test('late business 401 after logout does not refresh or replace logout notice', async () => {
    const f = fixture(), m = f.manager(), held = deferred(), started = deferred(); await f.login(m);
    const pending = assert.rejects(m.authorized(async () => { started.resolve(); await held.promise; throw unauthorized(); }), e => e.code === 'REQUEST_CANCELLED');
    await started.promise; await m.logout(); const notice = m.state.notice; held.resolve(); await pending;
    assert.equal(f.calls.refresh.length, 0); assert.equal(m.state.notice, notice); assert.equal(m.state.hasSession, false);
  });
  console.log(JSON.stringify({ passed: true, checks: passed.length, cases: passed }));
})().catch(error => { console.error(error); process.exitCode = 1; });
