const { visibleText, backDialog } = require('./qa-navigation-helpers.cjs');
const { chooseDate, chooseTime } = require('./qa-picker-helpers.cjs');
// Development smoke check. Uses the host's bundled Playwright, never a personal browser profile.
// Run: node docs/qa-smoke.cjs [http://localhost:8092]
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const out = path.resolve(__dirname, '../.expo/qa');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') { errors.push(msg.text()); console.error('Browser console:', msg.text()); } });
  const tab = name => page.getByRole('tab', { name, exact: true });
  try {
    await page.goto(process.argv[2] || 'http://localhost:8092', { waitUntil: 'networkidle' });
    await tab('Trang chủ').waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const [name, filename] of [['Trang chủ', 'home'], ['Lịch học', 'schedule'], ['Tập trung', 'focus'], ['Thống kê', 'stats'], ['Trợ lý AI', 'assistant']]) {
      await tab(name).click();
      await page.screenshot({ path: path.join(out, `${filename}-390.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: horizontal overflow`);
    }
    await tab('Lịch học').click();
    await tab('Theo tuần').click();
    await visibleText(page,'Lịch học trong tuần', { exact: true }).waitFor();
    await tab('Theo tháng').click();
    await page.screenshot({ path: path.join(out, 'calendar-month.png') });
    await tab('Theo ngày').click();
    await page.getByRole('button', { name: 'Thêm bài tập mới', exact: true }).click();
    await page.getByLabel('Tên bài tập', { exact: true }).fill('Bài kiểm tra giao diện');
    await chooseDate(page, 'Hạn nộp (YYYY-MM-DD)', '2026-10-28');
    await page.getByRole('button', { name: 'Tạo bài tập', exact: true }).click();
    await tab('Chưa làm').click();
    await visibleText(page,'Bài kiểm tra giao diện', { exact: true }).click();
    await page.getByRole('button', { name: 'Chỉnh sửa bài tập', exact: true }).click();
    await tab('Hoàn thành').last().click();
    await page.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
    await page.getByRole('button', { name: 'Đóng', exact: true }).click();
    await tab('Hoàn thành').click();
    await visibleText(page,'Bài kiểm tra giao diện', { exact: true }).waitFor();
    await tab('Thống kê').click();
    await visibleText(page,'40%', { exact: true }).first().waitFor();
    await tab('Lịch học').click();
    await page.getByRole('button', { name: 'Thêm lịch học', exact: true }).click();
    await page.getByRole('button', { name: 'Lưu lịch học', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Khung giờ bị trùng' }).waitFor();
    await chooseTime(page, 'Bắt đầu (HH:mm)', '11:00');
    await chooseTime(page, 'Kết thúc (HH:mm)', '11:45');
    await page.getByRole('button', { name: 'Lưu lịch học', exact: true }).click();
    await visibleText(page,'11:00 – 11:45', { exact: true }).waitFor();
    await tab('Tập trung').click();
    await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
    await visibleText(page,'24:59', { exact: true }).waitFor();
    await tab('Trang chủ').click();
    await tab('Tập trung').click();
    await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
    const frozen = await visibleText(page,/^24:\d\d$/).textContent();
    await page.waitForTimeout(1200); // A timed assertion specifically verifies pause.
    assert.equal(await visibleText(page,/^24:\d\d$/).textContent(), frozen);
    await tab('Nghỉ ngắn 5′').click();
    await visibleText(page,'05:00', { exact: true }).waitFor();
    await tab('Trợ lý AI').click();
    await page.getByRole('button', { name: 'Xem kế hoạch', exact: true }).click();
    await visibleText(page,'ĐỀ XUẤT MẪU · CHƯA KẾT NỐI AI', { exact: true }).waitFor();
    await tab('Tự học').last().click();
    const aiDay = new Date(); aiDay.setDate(aiDay.getDate() + 1);
    const aiDate = `${aiDay.getFullYear()}-${String(aiDay.getMonth()+1).padStart(2,'0')}-${String(aiDay.getDate()).padStart(2,'0')}`;
    await chooseDate(page, 'Từ ngày (YYYY-MM-DD)', aiDate);
    await chooseDate(page, 'Đến ngày (YYYY-MM-DD)', aiDate);
    await page.getByRole('button', { name: 'Tạo đề xuất mẫu', exact: true }).click();
    await page.getByRole('button', { name: 'Chấp nhận kế hoạch mẫu', exact: true }).click();
    await page.getByRole('button', {name:'Quay lại trợ lý',exact:true}).click();
    await tab('Trang chủ').click();
    await visibleText(page,'Kế hoạch tự học đã chọn', { exact: true }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await tab('Trang chủ').waitFor();
    // Check every screen on a compact phone, a larger phone and desktop.
    for (const width of [320, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of ['Trang chủ', 'Lịch học', 'Tập trung', 'Thống kê', 'Trợ lý AI']) {
        await tab(name).click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px ${name}: overflow`);
      }
      await tab('Trang chủ').click();
      await page.screenshot({ path: path.join(out, `home-${width}.png`) });
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    const result = { passed: true, widths: [320, 390, 430, 1280], checks: ['5 tabs', 'calendar day/week/month', 'task create/edit and selected date', 'shared dashboard/stats state', 'schedule conflict validation/create', 'timer start/pause/tab switch', 'AI preview/approve', 'horizontal overflow', 'browser console'], errors };
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await page.screenshot({ path: path.join(out, 'last-state.png') }); fs.writeFileSync(path.join(out, 'console-errors.json'), JSON.stringify(errors, null, 2)); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
