const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), ts = require('typescript');
const out = path.resolve(__dirname, '../.expo/qa-account-api/unit'); fs.mkdirSync(out, { recursive: true });
for (const name of ['shared/api/http', 'features/account/api/accountApi']) {
  const file = path.join(out, name + '.js'); fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src', name + '.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText);
}
const { createHttpClient } = require(path.join(out, 'shared/api/http.js'));
const { createAccountApi } = require(path.join(out, 'features/account/api/accountApi.js'));
const profile = { id: 'user-a', email: 'a@example.test', fullName: 'Bạn học A', school: '', major: '', timeZone: 'Asia/Ho_Chi_Minh' };
const pair = { accessToken: 'access-only-test', tokenType: 'Bearer', expiresIn: 900, user: profile, refreshToken: 'refresh-only-test' };
const reply = (data, status = 200, headers = {}) => new Response(JSON.stringify(status >= 400 ? data : { data }), { status, headers });
(async () => {
  let checks = 0, calls = [];
  const web = createAccountApi('http://test', 'cookie', { fetcher: async (url, options) => {
    calls.push({ url, ...options }); return url.endsWith('/csrf') ? reply({ headerName: 'X-XSRF-TOKEN', token: 'masked-test' })
      : url.endsWith('/login') ? reply({ ...pair, refreshToken: undefined }) : reply(profile);
  } });
  await web.login({ email: profile.email, password: 'Password123!' });
  assert.equal(calls.length, 2); assert.equal(calls[1].credentials, 'include'); assert.equal(calls[1].headers['X-XSRF-TOKEN'], 'masked-test');
  assert.equal(calls[1].headers['X-Auth-Transport'], 'cookie'); assert.equal(calls[1].headers.Authorization, undefined); checks++;
  await web.profile('access-only-test'); assert.equal(calls[2].headers.Authorization, 'Bearer access-only-test'); checks++;
  calls = [];
  const native = createAccountApi('http://test', 'body', { fetcher: async (url, options) => { calls.push({ url, ...options }); return reply(pair); } });
  await native.login({ email: profile.email, password: 'Password123!' });
  assert.equal(calls.length, 1); assert.equal(calls[0].credentials, 'omit'); assert.equal(calls[0].headers['X-Auth-Transport'], 'body'); checks++;
  const failing = (status, data, headers) => createHttpClient('http://test', { fetcher: async () => reply(data, status, headers) });
  await assert.rejects(failing(409, { code: 'EMAIL_ALREADY_EXISTS' })('/register'), e => e.code === 'EMAIL_ALREADY_EXISTS' && e.message.includes('đăng nhập')); checks++;
  await assert.rejects(failing(400, { code: 'VALIDATION_FAILED', errors: [{ field: 'fullName', message: 'Cần nhập họ tên', rejectedValue: 'secret' }] })('/register'), e => e.fields.fullName === 'Cần nhập họ tên' && !JSON.stringify(e).includes('secret')); checks++;
  await assert.rejects(failing(429, { code: 'AUTH_RATE_LIMITED' }, { 'Retry-After': '35' })('/login'), /35 giây/); checks++;
  await assert.rejects(createHttpClient('http://test', { fetcher: async () => new Response('<html>private stack</html>', { status: 503 }) })('/login'), e => !e.message.includes('private stack')); checks++;
  await assert.rejects(createHttpClient('http://test', { fetcher: async () => { throw new Error('secret URL'); } })('/login'), e => e.code === 'NETWORK_ERROR' && !e.message.includes('secret')); checks++;
  let abortSignal;
  await assert.rejects(createHttpClient('http://test', { timeoutMs: 20, fetcher: (_, options) => { abortSignal = options.signal; return new Promise(() => {}); } })('/login'), e => e.code === 'REQUEST_TIMEOUT');
  assert.equal(abortSignal.aborted, true); checks++;
  await assert.rejects(createHttpClient('http://test', { timeoutMs: 20, fetcher: async () => ({ ok: true, text: () => new Promise(() => {}) }) })('/login'), e => e.code === 'REQUEST_TIMEOUT'); checks++;
  const controller = new AbortController();
  const request = createHttpClient('http://test', { fetcher: () => new Promise(() => {}) })('/login', { signal: controller.signal });
  controller.abort(); await assert.rejects(request, e => e.code === 'REQUEST_CANCELLED'); checks++;
  const bad = createAccountApi('http://test', 'body', { fetcher: async () => reply({ fullName: 'Thiếu định danh' }) });
  await assert.rejects(bad.profile('token'), e => e.code === 'INVALID_RESPONSE'); checks++;
  let attempts = 0;
  await assert.rejects(createHttpClient('http://test', { fetcher: async () => { attempts++; return reply({ code: 'INVALID_CREDENTIALS' }, 401); } })('/login'));
  assert.equal(attempts, 1); checks++;
  const mutations = [];
  for (const transport of ['cookie', 'body']) {
    const api = createAccountApi('http://test', transport, { fetcher: async (url, options) => {
      mutations.push({ url, ...options });
      if (url.endsWith('/csrf')) return reply({ headerName: 'X-XSRF-TOKEN', token: 'proof' });
      if (url.endsWith('/logout')) return new Response(null, { status: 204 });
      return reply(transport === 'cookie' ? { ...pair, refreshToken: undefined } : pair);
    } });
    let journaled = false; await api.refresh('old-refresh', async () => { journaled = true; }); assert.equal(journaled, true);
    await api.logout('old-refresh');
    const posts = mutations.filter(call => call.method === 'POST').slice(-2);
    assert.ok(posts.every(call => call.headers.Authorization === undefined && call.headers['X-Auth-Transport'] === transport));
    assert.ok(posts.every(call => call.body === (transport === 'cookie' ? '{}' : JSON.stringify({ refreshToken: 'old-refresh' })))); checks++;
  }
  console.log(JSON.stringify({ passed: true, checks, scope: 'transport, CSRF, bearer, errors, bounded timeout/body read, cancel, invalid profile and no automatic retry' }));
})().catch(e => { console.error(e); process.exitCode = 1; });
