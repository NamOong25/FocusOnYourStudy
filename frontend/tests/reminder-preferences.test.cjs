const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, path);
const { ApiError } = require('../src/shared/api/http.ts');
const { createReminderPreferencesApi } = require('../src/features/account/preferences/reminderPreferencesApi.ts');
const { ReminderPreferencesManager } = require('../src/features/account/preferences/ReminderPreferencesManager.ts');
const { parseReminderPreferences, reminderPreferencesInput } = require('../src/features/account/preferences/reminderPreferencesData.ts');

const defaults = () => ({ assignments: true, classes: true, exams: true, reminderMinutes: 15, quiet: true, quietStart: '22:00', quietEnd: '07:00', version: 0 });
const response = (data, status = 200) => new Response(JSON.stringify({ data }), { status });
const signal = () => new AbortController().signal;
const gate = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
async function editor(api = {}) {
  const manager = new ReminderPreferencesManager({
    read: async () => defaults(),
    save: async input => ({ ...input, version: input.version + 1 }),
    ...api,
  });
  await manager.read();
  return manager;
}

test('accepts overnight and disabled equal quiet hours while rejecting incomplete or invalid server data', () => {
  assert.deepEqual(parseReminderPreferences(defaults()), defaults());
  assert.equal(reminderPreferencesInput({ ...defaults(), quiet: false, quietEnd: '22:00' }, 0).quiet, false);
  for (const patch of [{ classes: undefined }, { quietEnd: '22:00' }, { quietStart: '24:00' }, { quietEnd: '07:00:00' },
    { reminderMinutes: 20 }, { version: 0.5 }, { version: -1 }, { version: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.throws(() => parseReminderPreferences({ ...defaults(), ...patch }), { code: 'INVALID_REMINDER_PREFERENCES_RESPONSE' });
  }
});

test('API uses the authorized Bearer, omits cookies and strips foreign ownership and preview fields', async () => {
  const calls = [];
  const api = createReminderPreferencesApi('http://localhost:8080', operation => operation('owner-A'), {
    fetcher: async (url, options) => {
      calls.push({ url, ...options });
      return response(options.method === 'PUT' ? { ...JSON.parse(options.body), version: 1 } : defaults());
    },
  });
  await api.read(signal());
  await api.save({ ...defaults(), reminderMinutes: 30, userId: 'owner-B', appearancePreview: 'dark' }, signal());
  assert.equal(calls.length, 2);
  assert.equal(calls[1].url, 'http://localhost:8080/api/v1/notification-preferences');
  assert.equal(calls[1].credentials, 'omit');
  assert.equal(calls[1].headers.Authorization, 'Bearer owner-A');
  assert.deepEqual(JSON.parse(calls[1].body), { ...defaults(), reminderMinutes: 30 });
});

test('API rejects a successful status with mismatched values, version or malformed schema', async () => {
  for (const output of [{ ...defaults(), version: 0 }, { ...defaults(), version: 2 },
    { ...defaults(), reminderMinutes: 60, version: 1 }, { ...defaults(), classes: 'true', version: 1 }]) {
    const api = createReminderPreferencesApi('http://localhost', operation => operation('token'), { fetcher: async () => response(output) });
    await assert.rejects(api.save({ ...defaults(), reminderMinutes: 30 }, signal()), { code: 'INVALID_REMINDER_PREFERENCES_RESPONSE' });
  }
});

test('API displays reminder and quiet-hour errors beside their fields', async () => {
  for (const [payload, field] of [
    [{ code: 'INVALID_QUIET_HOURS' }, 'quietEnd'],
    [{ code: 'INVALID_REMINDER_MINUTES' }, 'reminderMinutes'],
    [{ code: 'VALIDATION_FAILED', errors: [{ field: 'quietStart', message: 'Chọn giờ bắt đầu.' }] }, 'quietStart'],
  ]) {
    const api = createReminderPreferencesApi('http://localhost', operation => operation('token'), {
      fetcher: async () => new Response(JSON.stringify(payload), { status: 400 }),
    });
    await assert.rejects(api.save({ ...defaults(), reminderMinutes: 30 }, signal()), error => error.status === 400 && !!error.fields[field]);
  }
});

test('saves edited preferences once, coalesces clicks and locks fields until confirmation', async () => {
  const pending = gate();
  let writes = 0;
  const manager = await editor({ save: async input => { writes++; await pending.promise; return { ...input, version: 1 }; } });
  manager.edit('classes', false);
  manager.edit('reminderMinutes', 30);
  const first = manager.save(), second = manager.save();
  assert.equal(first, second);
  manager.edit('reminderMinutes', 60);
  assert.equal(manager.state.draft.reminderMinutes, 30);
  pending.resolve();
  await first;
  assert.equal(writes, 1);
  assert.equal(manager.state.baseline.version, 1);
  assert.equal(manager.dirty, false);
  assert.match(manager.state.notice, /Đã lưu/);
  manager.dispose();
});

test('conflict preserves the draft, requires reading and an explicit choice before overwriting', async () => {
  let current = defaults(), writes = 0;
  const manager = await editor({
    read: async () => current,
    save: async input => {
      writes++;
      if (input.version !== current.version) throw new ApiError('Changed', 'NOTIFICATION_PREFERENCES_VERSION_CONFLICT', 409);
      return current = { ...input, version: input.version + 1 };
    },
  });
  manager.edit('classes', false);
  current = { ...defaults(), reminderMinutes: 60, version: 1 };
  await assert.rejects(manager.save());
  assert.equal(manager.state.draft.classes, false);
  await assert.rejects(manager.save(), { code: 'REMINDER_PREFERENCES_REVIEW_REQUIRED' });
  assert.equal(writes, 1);
  await manager.read();
  assert.equal(manager.state.latest.reminderMinutes, 60);
  manager.resolve(true);
  assert.equal(manager.state.baseline.version, 1);
  assert.equal(manager.state.draft.reminderMinutes, 15);
  await manager.save();
  assert.equal(writes, 2);
  assert.equal(current.version, 2);
  manager.dispose();
});

test('using the current configuration discards the local edit without writing', async () => {
  let reads = 0;
  const manager = await editor({ read: async () => ++reads === 1 ? defaults() : { ...defaults(), reminderMinutes: 60, version: 1 } });
  manager.edit('exams', false);
  await manager.read();
  assert.equal(manager.state.draft.exams, false);
  manager.resolve(false);
  assert.equal(manager.state.draft.exams, true);
  assert.equal(manager.state.draft.reminderMinutes, 60);
  assert.equal(manager.dirty, false);
  manager.dispose();
});

test('lost confirmation never retries a write and can confirm the committed values by reading', async () => {
  let current = defaults(), writes = 0;
  const manager = await editor({
    read: async () => current,
    save: async input => { writes++; current = { ...input, version: input.version + 1 }; throw new ApiError('Offline', 'NETWORK_ERROR'); },
  });
  manager.edit('reminderMinutes', 30);
  await assert.rejects(manager.save());
  assert.equal(manager.state.reviewRequired, true);
  await assert.rejects(manager.save());
  await manager.read();
  assert.equal(writes, 1);
  assert.equal(manager.state.reviewRequired, false);
  assert.equal(manager.dirty, false);
  assert.equal(manager.state.baseline.version, 1);
  manager.dispose();
});

test('uncertain failure before commit still requires a deliberate comparison and keeps the draft', async () => {
  const manager = await editor({ save: async () => { throw new ApiError('Unavailable', 'DATABASE_UNAVAILABLE', 503); } });
  manager.edit('quiet', false);
  await assert.rejects(manager.save());
  await manager.read();
  assert.equal(manager.state.reviewRequired, true);
  assert.equal(manager.state.latest.version, 0);
  assert.equal(manager.state.draft.quiet, false);
  manager.resolve(true);
  assert.equal(manager.state.reviewRequired, false);
  assert.equal(manager.dirty, true);
  manager.dispose();
});

test('a failed reread clears an earlier comparison and retains the local choices', async () => {
  let reads = 0;
  const manager = await editor({ read: async () => {
    if (++reads === 3) throw new ApiError('Offline', 'NETWORK_ERROR');
    return { ...defaults(), version: reads - 1 };
  } });
  manager.edit('classes', false);
  await manager.read();
  assert.equal(manager.state.latest.version, 1);
  await assert.rejects(manager.read());
  assert.equal(manager.state.latest, null);
  assert.equal(manager.state.reviewRequired, true);
  assert.equal(manager.state.draft.classes, false);
  manager.resolve(false);
  assert.equal(manager.state.baseline.version, 0);
  manager.dispose();
});

test('quiet-hour validation is local and deliberate HTTP rejections keep the form editable', async () => {
  let writes = 0;
  const manager = await editor({ save: async () => { writes++; throw new ApiError('Check hours', 'VALIDATION_FAILED', 400, { quietEnd: 'Invalid' }); } });
  manager.edit('quietEnd', '22:00');
  await assert.rejects(manager.save(), error => !!error.fields.quietEnd);
  assert.equal(writes, 0);
  manager.edit('quietEnd', '06:00');
  await assert.rejects(manager.save(), { code: 'VALIDATION_FAILED' });
  assert.equal(writes, 1);
  assert.equal(manager.state.reviewRequired, false);
  manager.edit('quietEnd', '07:00');
  assert.equal(manager.state.error, null);
  manager.dispose();
});

test('closing during a request aborts and a late response cannot publish to the next account editor', async () => {
  const pending = gate();
  let requestSignal;
  const manager = await editor({ save: async (input, abort) => { requestSignal = abort; await pending.promise; return { ...input, version: 1 }; } });
  manager.edit('classes', false);
  const work = manager.save();
  await Promise.resolve();
  let updates = 0;
  manager.subscribe(() => updates++);
  manager.dispose();
  pending.resolve();
  await assert.rejects(work, { code: 'REQUEST_CANCELLED' });
  assert.equal(requestSignal.aborted, true);
  assert.equal(updates, 0);
  const next = await editor();
  assert.equal(next.state.draft.classes, true);
  next.dispose();
});
