const assert = require('node:assert/strict');
const fs = require('node:fs');
const Module = require('node:module');
const { test } = require('node:test');
const ts = require('typescript');

require.extensions['.ts'] = (module, path) => module._compile(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, path);

const flush = () => new Promise(resolve => setImmediate(resolve));

test('focus alarms replace earlier timers, cancel on pause, and alert once in the foreground', async t => {
  const scheduled = new Map(), delivered = [];
  const callbacks = new Map();
  let nextHandle = 0, notificationChannel;
  t.mock.method(globalThis, 'setTimeout', callback => {
    callbacks.set(++nextHandle, callback);
    return nextHandle;
  });
  t.mock.method(globalThis, 'clearTimeout', handle => callbacks.delete(handle));

  const mocks = {
    'react-native': { AppState: { currentState: 'active' }, Platform: { OS: 'android' } },
    'expo-notifications': {
      AndroidImportance: { HIGH: 4 }, SchedulableTriggerInputTypes: { DATE: 'date' },
      setNotificationHandler: () => {},
      setNotificationChannelAsync: async (_, config) => { notificationChannel = config; },
      getPermissionsAsync: async () => ({ granted: true }),
      cancelScheduledNotificationAsync: async identifier => { scheduled.delete(identifier); },
      dismissNotificationAsync: async () => { delivered.length = 0; },
      scheduleNotificationAsync: async request => {
        if (request.trigger?.type === 'date') scheduled.set(request.identifier, request);
        else delivered.push({ request });
      },
      getAllScheduledNotificationsAsync: async () => [...scheduled.values()],
      getPresentedNotificationsAsync: async () => delivered,
    },
  };
  const load = Module.prototype.require;
  const interceptor = t.mock.method(Module.prototype, 'require', function (name) {
    return mocks[name] ?? load.call(this, name);
  });
  const { scheduleFocusAlarm, cancelFocusAlarm } = require('../src/features/focus/focusAlarm.native.ts');
  interceptor.mock.restore();

  scheduleFocusAlarm(90_000, 'Đã hết giờ tập trung');
  await flush();
  assert.equal(scheduled.size, 1);
  assert.equal(notificationChannel.sound, 'default');
  assert.equal(notificationChannel.enableVibrate, true);

  cancelFocusAlarm();
  await flush();
  assert.equal(scheduled.size, 0);
  assert.equal(callbacks.size, 0);

  scheduleFocusAlarm(90_000, 'Đã hết giờ nghỉ ngắn');
  scheduleFocusAlarm(60_000, 'Đã hết giờ nghỉ dài');
  await flush();
  assert.deepEqual([...scheduled.values()].map(alarm => alarm.content.title), ['Đã hết giờ nghỉ dài']);
  for (const fire of callbacks.values()) fire();
  await flush();
  assert.equal(scheduled.size, 0);
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].request.content.title, 'Đã hết giờ nghỉ dài');

  scheduleFocusAlarm(60_000, 'Đã hết giờ tập trung');
  await flush();
  assert.equal(delivered.length, 0);
  assert.equal(scheduled.size, 1);
});
