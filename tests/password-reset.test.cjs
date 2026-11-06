const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, path);
const { createAccountApi } = require('../src/features/account/api/accountApi.ts');
const { readPasswordResetLink, resetPasswordErrors } = require('../src/features/account/password/passwordResetData.ts');

const token = 'Z'.repeat(43);
const password = '  Mật khẩu mới  ';
const draft = { token, newPassword: password, confirmPassword: password };
const response = (status, body, headers) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers });
const proof = () => response(200, { data: { headerName: 'X-XSRF-TOKEN', token: 'csrf-proof' } });
const signal = () => new AbortController().signal;

function apiWith(...responses) {
  const calls = [];
  const api = createAccountApi('http://localhost:8080', 'cookie', {
    fetcher: async (url, options) => {
      calls.push({ path: new URL(url).pathname, ...options });
      const next = responses.shift();
      if (next instanceof Error) throw next;
      return next;
    },
  });
  return { api, calls };
}

test('reads only a single well-formed fragment token and preserves unrelated hash content', () => {
  assert.deepEqual(readPasswordResetLink('#notes&reset-token=' + token + '&view=day%202'), {
    link: { kind: 'valid', token }, remainingHash: '#notes&view=day%202',
  });
  for (const value of ['reset-token', 'reset-token=bad', 'reset-token=' + token + '&reset%2Dtoken=' + token]) {
    assert.deepEqual(readPasswordResetLink('#' + value), { link: { kind: 'invalid' }, remainingHash: '' });
  }
  assert.equal(readPasswordResetLink('#help'), null);
});

test('validates both new password fields without trimming a legitimate password', () => {
  assert.ok(resetPasswordErrors(' ', '').newPassword);
  assert.ok(resetPasswordErrors(password, '').confirmPassword);
  assert.ok(resetPasswordErrors(password, password.trim()).confirmPassword);
  assert.deepEqual(resetPasswordErrors(password, password), { newPassword: undefined, confirmPassword: undefined });
});

test('request normalizes the email, uses web CSRF and expects HTTP 202', async () => {
  const { api, calls } = apiWith(proof(), response(202, { data: { message: 'Generic' } }));
  await api.requestPasswordReset('  SAMPLE@EXAMPLE.TEST ', signal());
  assert.deepEqual(calls.map(call => [call.method, call.path, call.credentials]), [
    ['GET', '/api/v1/auth/csrf', 'include'],
    ['POST', '/api/v1/auth/password-reset/request', 'include'],
  ]);
  assert.deepEqual(JSON.parse(calls[1].body), { email: 'sample@example.test' });
  assert.equal(calls[1].headers['X-XSRF-TOKEN'], 'csrf-proof');
  const bad = apiWith(proof(), response(200, { data: { message: 'unexpected status' } }));
  await assert.rejects(bad.api.requestPasswordReset('sample@example.test', signal()), { code: 'INVALID_RESPONSE' });
});

test('confirm sends the secret in the body and distinguishes 204 from an unusable link', async () => {
  const ok = apiWith(proof(), response(204));
  assert.equal(await ok.api.confirmPasswordReset(draft, signal()), 'changed');
  assert.equal(ok.calls[1].path, '/api/v1/auth/password-reset/confirm');
  assert.deepEqual(JSON.parse(ok.calls[1].body), draft);
  const invalid = apiWith(proof(), response(400, { code: 'PASSWORD_RESET_LINK_INVALID' }));
  assert.equal(await invalid.api.confirmPasswordReset(draft, signal()), 'invalid');
});

test('lost or inconclusive confirmation gives an unconfirmed outcome and sends one POST', async () => {
  for (const reply of [new Error('lost'), response(502), response(408), response(200, { data: {} })]) {
    const { api, calls } = apiWith(proof(), reply);
    assert.equal(await api.confirmPasswordReset(draft, signal()), 'unconfirmed');
    assert.equal(calls.filter(call => call.method === 'POST').length, 1);
  }
});

test('preflight and explicit rejections retain a deliberate retry path', async () => {
  const preflight = apiWith(new Error('offline'));
  await assert.rejects(preflight.api.confirmPasswordReset(draft, signal()), { code: 'NETWORK_ERROR' });
  assert.equal(preflight.calls.length, 1);
  const limited = apiWith(proof(), response(429, { code: 'AUTH_RATE_LIMITED' }, { 'Retry-After': '15' }));
  await assert.rejects(limited.api.confirmPasswordReset(draft, signal()), error => error.status === 429 && error.message.includes('15'));
  const disabled = apiWith(proof(), response(503, { code: 'PASSWORD_RESET_UNAVAILABLE' }));
  await assert.rejects(disabled.api.confirmPasswordReset(draft, signal()), { code: 'PASSWORD_RESET_UNAVAILABLE' });
  const mismatch = apiWith(proof(), response(400, { code: 'PASSWORD_CONFIRMATION_MISMATCH' }));
  await assert.rejects(mismatch.api.confirmPasswordReset(draft, signal()), error => !!error.fields.confirmPassword);
});
