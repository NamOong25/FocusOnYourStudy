// Runs in a separate headless browser, using in-memory sample/empty workspaces.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { enterDemo, settleAction } = require('./qa-onboarding-helpers.cjs');
const { chooseTime } = require('./qa-picker-helpers.cjs');
const { visibleText } = require('./qa-navigation-helpers.cjs');
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-notifications'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const errors = []; page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const matchingButton = name => page.getByRole('button', { name }).filter({ visible: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).filter({ visible: true });
  const text = (value, options = { exact: true }) => visibleText(page, value, options);
  const dialog = () => page.getByRole('dialog').last();
  const back = () => dialog().getByRole('button', { name: 'Quay lại', exact: true }).click();
  const unread = count => page.waitForFunction(expected => Number(document.querySelector('[data-testid="notification-unread-count"]')?.textContent || 0) === expected, count);
  const openClass = () => matchingButton(/^Mở nhắc lịch học Lập trình Hướng đối tượng,/).click();
  const openExam = () => matchingButton(/^Mở nhắc lịch thi Toán rời rạc,/).click();
  const shot = async name => {
    const dismiss = button('Đóng thông báo kết quả'); if (await dismiss.count()) await dismiss.click();
    await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' });
  };
  try {
    await page.clock.install({ time: new Date('2026-10-21T07:00:00+07:00') });
    await page.goto(process.argv[2] || 'http://localhost:8092/', { waitUntil: 'networkidle' }); await enterDemo(page);
    await unread(8); await button('Thông báo').click(); await text('8 mục · 8 chưa đọc').waitFor(); await unread(8);
    await button('Mở nhắc bài Đồ án cuối kỳ Web App').click(); await text('Chi tiết bài tập').waitFor(); await unread(7); await back();
    await text('8 mục · 7 chưa đọc').waitFor(); await tab('Chưa đọc').click();
    assert.equal(await button('Mở nhắc bài Đồ án cuối kỳ Web App').count(), 0);
    await matchingButton(/^Đánh dấu đã đọc: Báo cáo bài tập lớn Cơ sở dữ liệu ·/).click(); await unread(6);
    assert.equal(await button('Mở nhắc bài Báo cáo bài tập lớn Cơ sở dữ liệu').count(), 0);
    await button('Đánh dấu tất cả đã đọc').click(); await unread(0); await text('Bạn đã đọc hết nhắc việc').waitFor();
    await button('Đóng').click(); await tab('Thống kê').click(); await button('Thông báo').click(); await text('8 mục · 0 chưa đọc').waitFor();
    // Editing a deadline creates one unread revision; opening it acknowledges that revision.
    await button('Mở nhắc bài Đồ án cuối kỳ Web App').click(); await button('Chỉnh sửa bài tập').click();
    await chooseTime(page, 'Giờ hạn nộp', '23:45'); await button('Lưu thay đổi').click(); await settleAction(page); await unread(1); await back();
    await text('8 mục · 1 chưa đọc').waitFor(); await button('Mở nhắc bài Đồ án cuối kỳ Web App').click(); await unread(0);
    await dialog().getByRole('tab', { name: 'Hoàn thành', exact: true }).click(); await back();
    await text('7 mục · 0 chưa đọc').waitFor(); assert.equal(await button('Mở nhắc bài Đồ án cuối kỳ Web App').count(), 0);
    // A class notification opens the precise occurrence, including edits and cancellation.
    await openClass(); await text('Chi tiết buổi học').waitFor(); await dialog().getByText('21/10/2026', { exact: true }).waitFor();
    await button('Đổi giờ hoặc phòng buổi này').click(); await page.getByRole('textbox', { name: 'Phòng học buổi này', exact: true }).fill('A9.999');
    await button('Lưu thay đổi buổi này').click(); await settleAction(page); await unread(1); await back();
    await text('Buổi học đã đổi thông tin').waitFor(); await openClass(); await unread(0);
    await button('Nghỉ buổi này').click(); await button('Xác nhận nghỉ buổi này').click(); await settleAction(page); await back();
    await text('6 mục · 0 chưa đọc').waitFor(); assert.equal(await matchingButton(/^Mở nhắc lịch học Lập trình Hướng đối tượng,/).count(), 0);
    // Exam detail returns to the inbox; updates become unread and deletion removes its row.
    await openExam(); await text('Chi tiết lịch thi').waitFor(); await button('Chỉnh sửa lịch thi').click();
    await page.getByRole('textbox', { name: 'Phòng thi', exact: true }).fill('B9.999'); await button('Lưu lịch thi').click(); await settleAction(page); await unread(1); await back();
    await openExam(); await unread(0); await button('Chỉnh sửa lịch thi').click(); await button('Xóa lịch thi').click(); await button('Xác nhận xóa lịch thi').click(); await settleAction(page);
    await text('5 mục · 0 chưa đọc').waitFor(); assert.equal(await matchingButton(/^Mở nhắc lịch thi Toán rời rạc,/).count(), 0);
    await button('Đóng').click(); await tab('Lịch học').click(); await tab('Bài tập').click(); await button('Thêm bài tập mới').click();
    await page.getByRole('textbox', { name: 'Tên bài tập', exact: true }).fill('Nhắc việc mới sau khi đã đọc hết'); await button('Tạo bài tập').click(); await settleAction(page); await unread(1);
    await button('Thông báo').click(); await tab('Chưa đọc').click(); await button('Mở nhắc bài Nhắc việc mới sau khi đã đọc hết').click(); await page.keyboard.press('Escape');
    await text('Bạn đã đọc hết nhắc việc').waitFor(); await unread(0); await button('Xem tất cả nhắc việc').click();
    assert.equal(await button('Đánh dấu tất cả đã đọc').isDisabled(), true); await button('Đóng').click();
    // Fresh sample data for snapshots, count persistence on close and browser Back/X behavior.
    await page.reload({ waitUntil: 'networkidle' }); await enterDemo(page); await unread(8);
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 }); await button('Thông báo').click(); await button('Đánh dấu tất cả đã đọc').hover(); await shot(`inbox-${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await button('Mở nhắc bài Đồ án cuối kỳ Web App').evaluate(element => element.scrollIntoView({ block: 'center' })); await shot(`cards-${width}`);
      await openClass(); await button('Đổi giờ hoặc phòng buổi này').hover(); await shot(`class-target-${width}`); await back(); await button('Đóng').click();
    }
    await page.setViewportSize({ width: 390, height: 900 }); await button('Thông báo').click(); await openExam(); await page.goBack(); await text('Góc nhắc nhở').waitFor();
    await button('Mở nhắc bài Đồ án cuối kỳ Web App').click(); await button('Đóng').click(); await button('Thông báo').waitFor();
    assert.equal(await text('Góc nhắc nhở').count(), 0); // X closes the complete notification flow
    await page.reload({ waitUntil: 'networkidle' }); await button('Bắt đầu với dữ liệu trống').click(); await unread(0);
    await button('Thông báo').click(); await text('Chưa có nhắc việc').waitFor(); assert.equal(await button('Đánh dấu tất cả đã đọc').isDisabled(), true); await shot('empty-inbox');
    await tab('Chưa đọc').click(); await text('Chưa có nhắc việc').waitFor(); await button('Đóng').click();
    assert.deepEqual(errors, []);
    const result = { passed: true, widths: [320, 390, 430, 1280], checks: ['opening bell does not mark read', 'individual/open/all read and numeric badge', 'unread filter and read persistence across tabs', 'deadline/class/exam revisions become unread', 'completed/canceled/deleted sources removed', 'new data becomes unread', 'exact class occurrence and exam/task links', 'Back/Escape/browser Back/X', 'empty inbox and disabled actions', 'responsive cards/inbox/details', 'console'], errors };
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await shot('last-state'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
