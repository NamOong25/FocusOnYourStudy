// Isolated headless UI test. Never attaches to a personal browser profile.
// PLAYWRIGHT_MODULE and CHROME_PATH may point at the host's existing tools.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { enterDemo, settleAction } = require('./qa-onboarding-helpers.cjs');
const { visibleText } = require('./qa-navigation-helpers.cjs');
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-focus'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).filter({ visible: true });
  const text = (value, options = { exact: true }) => visibleText(page, value, options);
  const shot = name => page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' });
  try {
    await page.goto(process.argv[2] || 'http://localhost:8092/', { waitUntil: 'networkidle' });
    await page.clock.install({ time: new Date('2026-10-21T08:00:00+07:00') });
    await enterDemo(page); await tab('Tập trung').click();
    await text('0 / 4 phiên').waitFor(); await text('Chuỗi 3 ngày học').waitFor();
    await button('Sửa mục tiêu').click(); await page.getByRole('radio', { name: 'Mục tiêu 6 phiên', exact: true }).click();
    await button('Hủy thay đổi').click(); await text('0 / 4 phiên').waitFor();
    await button('Sửa mục tiêu').click(); await page.getByRole('radio', { name: 'Mục tiêu 2 phiên', exact: true }).click();
    await button('Lưu mục tiêu').click(); await text('0 / 2 phiên').waitFor();
    await button('Xem lịch sử theo ngày').click(); await text('Hôm qua · 20/10/2026').waitFor();
    assert.equal(await text('25 phút học').count(), 3);
    await tab('Hôm nay').click(); await text('Chưa có phiên hoàn tất').waitFor(); await button('Đóng').click();
    // Link a real study plan: finishing two runs credits 50 minutes, leaves the task pending.
    await tab('Lịch học').click(); await tab('Tự học').click();
    await button('Tập trung: Hoàn thiện bố cục trang chủ').click();
    await button('Bắt đầu').click(); await page.clock.fastForward(600000);
    await button('Tạm dừng').click(); const paused = await text(/^\d{2}:\d{2}$/).innerText();
    await page.clock.fastForward(300000); assert.equal(await text(/^\d{2}:\d{2}$/).innerText(), paused);
    await text('0 / 2 phiên').waitFor();
    await tab('Trang chủ').click(); await tab('Tập trung').click(); await button('Tiếp tục').click();
    await page.clock.fastForward(900600); await text('1 / 2 phiên').waitFor();
    await text('25 / 45 phút từ các phiên đã hoàn tất').waitFor(); await text('Chuỗi 4 ngày học').waitFor();
    await page.clock.fastForward(5000); await text('1 / 2 phiên').waitFor();
    await button('Xem lịch sử theo ngày').click(); await tab('Hôm nay').click();
    assert.equal(await page.getByRole('dialog').last().getByText('Hoàn thiện bố cục trang chủ', { exact: true }).count(), 1); await text('Bài tập: Đồ án cuối kỳ Web App').waitFor();
    await text('1 phiên · 25 phút học').waitFor(); await shot('history-linked-pause'); await button('Đóng').click();
    await button('Học lại').click(); await page.clock.fastForward(1500600);
    await text('2 / 2 phiên').waitFor(); await text('50 / 45 phút từ các phiên đã hoàn tất').waitFor();
    await text('Bạn đã đạt mục tiêu hôm nay. Làm tốt lắm!').waitFor();
    await tab('Nghỉ ngắn 5′').click(); await button('Bắt đầu').click(); await page.clock.fastForward(300600);
    await text('2 / 2 phiên').waitFor(); await tab('Tập trung 25′').click();
    // Restarting a partial run discards it and cannot create another history entry.
    await button('Bắt đầu').click(); await page.clock.fastForward(10000); await button('Đặt lại đồng hồ').click();
    await text('25:00').waitFor(); await text('2 / 2 phiên').waitFor();
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await text('Mục tiêu hôm nay').evaluate(element => element.scrollIntoView({ block: 'start' })); await page.clock.runFor(350); await shot(`summary-${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await button('Sửa mục tiêu').click(); await page.getByRole('radio', { name: 'Mục tiêu 2 phiên', exact: true }).hover(); await shot(`goal-${width}`);
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('[role="radio"]')].some(el => el.getBoundingClientRect().right > innerWidth)), false);
      await button('Hủy thay đổi').click();
      await button('Xem lịch sử theo ngày').click(); await tab('Hôm nay').click(); await page.clock.runFor(350); await shot(`history-${width}`);
      assert.equal(await page.getByRole('dialog').last().getByText('Hoàn thiện bố cục trang chủ', { exact: true }).count(), 2); await button('Đóng').click();
    }
    // The linked task still has its manually managed status.
    await button('Xem kế hoạch tự học').click(); await button('Xem buổi Hoàn thiện bố cục trang chủ').click();
    await button('Xem bài tập liên quan').click(); await settleAction(page);
    assert.equal(await tab('Đang làm').getAttribute('aria-selected'), 'true'); await button('Đóng').click();
    await page.reload({ waitUntil: 'networkidle' });
    await button('Bắt đầu với dữ liệu trống').click(); await tab('Tập trung').click();
    await text('Chọn một môn để bắt đầu tập trung').waitFor(); await text('0 / 4 phiên').waitFor(); await text('Chuỗi 0 ngày học').waitFor();
    await button('Xem lịch sử theo ngày').click(); await text('Chưa có phiên hoàn tất').waitFor(); await shot('empty-history'); await button('Đóng').click();
    assert.deepEqual(errors, []);
    const result = { passed: true, widths: [320, 390, 430, 1280], checks: ['goal save/cancel', 'sample vs empty history', 'pause excludes elapsed wall time', 'tab switch preserves run', 'two completions recorded exactly once', 'linked study credits only', 'break/reset excluded', 'streak and goal update', 'responsive summary/goal/history', 'task status unchanged', 'console'], errors };
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await shot('last-state'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
