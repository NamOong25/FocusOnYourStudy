// Uses a fresh headless browser and a test clock; never attaches to a personal profile.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { enterDemo, settleAction } = require('./qa-onboarding-helpers.cjs');
const { chooseDate, chooseTime } = require('./qa-picker-helpers.cjs');
const { visibleText } = require('./qa-navigation-helpers.cjs');
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-statistics'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const errors = []; page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).filter({ visible: true });
  const text = (value, options = { exact: true }) => visibleText(page, value, options);
  const shot = name => page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' });
  const dialog = () => page.getByRole('dialog').last();
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const chooseSemester = async (name, year) => {
    await button('Chọn học kỳ thống kê').click(); await page.getByRole('radio', { name: `Thống kê: ${name}, ${year}`, exact: true }).click();
  };
  try {
    await page.goto(process.argv[2] || 'http://localhost:8092/', { waitUntil: 'networkidle' });
    await page.clock.install({ time: new Date('2026-10-21T08:00:00+07:00') });
    await enterDemo(page); await tab('Thống kê').click();
    await text('Thống kê học tập').waitFor(); await text('Từ 3 phiên hoàn tất').waitFor(); await text('1 giờ 15 phút').first().waitFor();
    await text('3 ngày').waitFor(); await text('1/4 bài đã hoàn thành').waitFor(); await text('100%').waitFor();
    await button('Ngày 20/10/2026: 25 phút, 1 phiên').click(); await text('25 phút · 1 phiên hoàn tất').waitFor();
    await tab('30 ngày').click(); await text('Thời gian học theo giai đoạn').waitFor();
    assert.equal(await page.getByTestId('page-stats').getByRole('button', { name: / đến .*: .* phiên$/ }).count(), 6);
    await tab('Tùy chọn').click();
    await chooseDate(page, 'Từ ngày thống kê', '2026-10-19'); await chooseDate(page, 'Đến ngày thống kê', '2026-10-20');
    await button('Áp dụng khoảng ngày').click(); await text('Từ 2 phiên hoàn tất').waitFor(); await text('50 phút').first().waitFor();
    await text('19/10/2026 – 20/10/2026').waitFor(); await text('1/4 bài đã hoàn thành').waitFor();
    await tab('Tùy chọn').click(); await chooseDate(page, 'Từ ngày thống kê', '2026-10-22');
    await button('Áp dụng khoảng ngày').click(); await page.getByRole('alert').filter({ hasText: 'Ngày kết thúc' }).waitFor();
    await button('Hủy chọn khoảng ngày').click(); await text('19/10/2026 – 20/10/2026').waitFor();
    await chooseSemester('Học kỳ 2', '2025 – 2026'); await text('Từ 0 phiên hoàn tất').waitFor(); await text('Chưa có phiên học trong khoảng này').waitFor(); await text('Chưa có bài tập trong học kỳ này.').waitFor();
    await chooseSemester('Học kỳ 2', '2026 – 2027'); await button('Thêm môn cho học kỳ').waitFor();
    await chooseSemester('Học kỳ 1', '2026 – 2027'); await tab('7 ngày').click();
    // A timer-completed session updates the summary, daily bar and course distribution.
    await tab('Tập trung').click(); await button('Bắt đầu').click(); await page.clock.fastForward(1500600);
    await text('1 / 4 phiên').waitFor(); await tab('Thống kê').click();
    await text('Từ 4 phiên hoàn tất').waitFor(); await text('1 giờ 40 phút').first().waitFor(); await text('4 ngày').waitFor();
    await button('Ngày 21/10/2026: 25 phút, 1 phiên').click();
    await tab('Tập trung').click(); await tab('Nghỉ ngắn 5′').click(); await button('Bắt đầu').click(); await page.clock.fastForward(300600);
    await tab('Thống kê').click(); await text('Từ 4 phiên hoàn tất').waitFor();
    // Deadline counts refresh at minute boundaries without reopening the screen.
    await button('Đến danh sách bài tập').click(); await text('Xây dựng Socket TCP').click();
    await button('Chỉnh sửa bài tập').click(); await chooseDate(page, 'Hạn nộp', '2026-10-21'); await chooseTime(page, 'Giờ hạn nộp', '08:45');
    await button('Lưu thay đổi').click(); await settleAction(page); await button('Đóng').click();
    await tab('Thống kê').click(); await page.clock.fastForward(16 * 60000);
    const lateRow = text('Chưa xong, quá hạn').locator('../..'); assert.equal(await lateRow.innerText(), 'Chưa xong, quá hạn\n1');
    await button('Đến danh sách bài tập').click(); await text('Xây dựng Socket TCP').click();
    await dialog().getByRole('tab', { name: 'Hoàn thành', exact: true }).click(); await button('Đóng').click();
    await tab('Thống kê').click(); await text('2/4 bài đã hoàn thành').waitFor(); await text('50%').waitFor();
    // Keep the selected dates/semester through tab switches and retain the grade entry route.
    await tab('Điểm & GPA').click(); await text('Điểm số & GPA').waitFor(); await tab('Tổng quan').click(); await text('Từ 4 phiên hoàn tất').waitFor();
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByTestId('page-stats').evaluate(element => { element.scrollTop = 0; }); await shot(`overview-${width}`); await noOverflow();
      await text('Thời gian học mỗi ngày').evaluate(element => element.scrollIntoView({ block: 'start' })); await shot(`chart-${width}`); await noOverflow();
      await text('Phân bổ theo môn').evaluate(element => element.scrollIntoView({ block: 'start' })); await shot(`distribution-${width}`); await noOverflow();
      await tab('Tùy chọn').click(); await button('Chọn từ ngày thống kê').hover(); await shot(`range-${width}`); await noOverflow(); await button('Hủy chọn khoảng ngày').click();
    }
    await page.setViewportSize({ width: 390, height: 900 });
    // The empty workspace can grow into real statistics; it is not permanently gated by its initial mode.
    await page.reload({ waitUntil: 'networkidle' }); await button('Bắt đầu với dữ liệu trống').click(); await tab('Thống kê').click();
    await text('Bắt đầu thống kê từ học kỳ đầu tiên').waitFor(); await shot('empty-semester');
    await button('Thêm học kỳ và môn học').click(); await button('Tạo học kỳ đầu tiên').click(); await button('Lưu học kỳ').click(); await settleAction(page);
    await button('Thêm môn đầu tiên').click(); await page.getByRole('textbox', { name: 'Tên môn học', exact: true }).fill('React từ dữ liệu trống');
    await page.getByRole('textbox', { name: 'Mã môn học', exact: true }).fill('RX01'); await button('Lưu môn học').click(); await settleAction(page); await button('Đóng').click();
    await tab('Thống kê').click(); await text('Từ 0 phiên hoàn tất').waitFor(); await text('Chưa có phiên học trong khoảng này').waitFor(); await shot('empty-study');
    await button('Đến Pomodoro').click(); await button('Bắt đầu').click(); await page.clock.fastForward(1500600);
    await tab('Thống kê').click(); await text('Từ 1 phiên hoàn tất').waitFor(); await text('React từ dữ liệu trống').waitFor(); await text('100%').waitFor();
    assert.equal(await text(/Có \d+ phiên mẫu trong số liệu/).count(), 0); await shot('empty-grown-to-study');
    assert.deepEqual(errors, []);
    const result = { passed: true, widths: [320, 390, 430, 1280], checks: ['sample-derived totals and daily selection', '7/30/custom and validation/cancel', 'semester isolation', 'Pomodoro completion vs breaks', 'live deadline and completion counts', 'grade route retained', 'responsive overview/chart/distribution/date sheet', 'empty workspace grows into statistics', 'console'], errors };
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await shot('last-state'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
