// Preview-only regression. Real account API checks: qa-account-api.cjs (disposable backend required).
const { enterDemo, settleAction } = require('./qa-onboarding-helpers.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const errors = [], writes = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(r.method())) writes.push(r.method()); });
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  try {
    await page.goto(process.argv[2] || 'http://localhost:8092', { waitUntil: 'networkidle' }); await enterDemo(page);
    await button('Hồ sơ').click(); await button('Chỉnh sửa hồ sơ mẫu').click();
    await page.getByLabel('Họ và tên', { exact: true }).fill('Hồ sơ minh họa mới'); await button('Lưu hồ sơ').click(); await settleAction(page);
    await page.getByRole('dialog').getByText('Hồ sơ minh họa mới', { exact: true }).waitFor();
    await button('Giao diện & ngôn ngữ').click(); await page.getByRole('tab', { name: 'Tối', exact: true }).click();
    await page.getByRole('tab', { name: 'English', exact: true }).click(); await page.getByText('Your study space', { exact: true }).waitFor();
    await button('Lưu lựa chọn xem trước').click(); await settleAction(page); await button('Quay lại tài khoản').click();
    await button('Tùy chọn nhắc học').click(); await page.getByRole('switch', { name: 'Nhắc bài tập', exact: true }).click(); await button('Lưu tùy chọn nhắc học').click(); await settleAction(page);
    assert.deepEqual(errors, []); assert.deepEqual(writes, []);
    console.log(JSON.stringify({ passed: true, checks: ['preview profile', 'appearance/language', 'reminders', 'no API writes or runtime errors'] }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
