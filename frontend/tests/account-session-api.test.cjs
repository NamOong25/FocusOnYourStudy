const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, path);

const { createAccountApi } = require('../src/features/account/api/accountApi.ts');

test('logout can confirm a slow response with one request', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let finish;
  let calls = 0;
  const api = createAccountApi('https://test.onrender.com', 'body', {
    fetcher: async () => {
      calls++;
      return new Promise(resolve => { finish = resolve; });
    },
  });

  const logout = api.logout('test-refresh');
  await Promise.resolve();
  assert.equal(calls, 1);
  t.mock.timers.tick(65_000);
  finish(new Response(null, { status: 204 }));

  await logout;
  assert.equal(calls, 1);
});

test('session requests still time out and regular requests keep the shorter deadline', async (t) => {
  const timers = [];
  t.mock.method(globalThis, 'setTimeout', (expire, delay) => {
    const timer = { expire, delay };
    timers.push(timer);
    return timer;
  });
  t.mock.method(globalThis, 'clearTimeout', () => {});
  const paths = [];
  let markLoginStarted;
  const loginStarted = new Promise(resolve => { markLoginStarted = resolve; });
  const api = createAccountApi('https://test.onrender.com', 'body', {
    fetcher: async url => {
      const path = new URL(url).pathname;
      paths.push(path);
      if (path === '/api/v1/auth/login') markLoginStarted();
      return new Promise(() => {});
    },
  });

  const profile = assert.rejects(api.profile('test-access'), { code: 'REQUEST_TIMEOUT' });
  assert.equal(timers[0]?.delay, 10_000);
  timers[0].expire();
  await profile;

  const login = assert.rejects(api.login({ email: 'test@example.com', password: 'test-password' }), { code: 'REQUEST_TIMEOUT' });
  await loginStarted;
  assert.equal(timers[1]?.delay, 90_000);
  timers[1].expire();
  await login;
  assert.deepEqual(paths, ['/api/v1/users/me', '/api/v1/auth/login']);
});
