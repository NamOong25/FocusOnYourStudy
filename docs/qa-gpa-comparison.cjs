// Headless project test using its own browser profile and in-memory demo data.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { enterDemo, settleAction } = require('./qa-onboarding-helpers.cjs');
const { visibleText } = require('./qa-navigation-helpers.cjs');
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-gpa-comparison'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const errors = []; page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).filter({ visible: true });
  const text = (value, options = { exact: true }) => visibleText(page, value, options);
  const dialog = () => page.getByRole('dialog').last();
  const back = () => dialog().getByRole('button', { name: 'Quay lại', exact: true }).click();
  const shot = async name => {
    const dismiss = button('Đóng thông báo kết quả'); if (await dismiss.count()) await dismiss.click();
    await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' });
  };
  const openBoard = (name, year) => button(`Xem bảng điểm so sánh: ${name}, ${year}`).click();
  const choose = async (slot, name, year) => {
    await button(`Chọn học kỳ ${slot} để so sánh`).click();
    await page.getByRole('radio', { name: `So sánh ${slot}: ${name}, ${year}`, exact: true }).click();
  };
  try {
    await page.goto(process.argv[2] || 'http://localhost:8092/', { waitUntil: 'networkidle' }); await enterDemo(page);
    await tab('Thống kê').click(); await tab('So sánh GPA').click();
    await text('Tăng 0.10 điểm GPA').waitFor(); await text('Chênh lệch tạm tính').waitFor();
    await button('Chọn học kỳ B để so sánh').click();
    assert.equal(await page.getByRole('radio', { name: 'So sánh B: Học kỳ 2, 2025 – 2026', exact: true }).isDisabled(), true);
    await page.getByRole('radio', { name: 'So sánh B: Học kỳ 2, 2026 – 2027', exact: true }).click();
    await text('Chưa đủ dữ liệu để so sánh').waitFor(); await text('Chưa đủ dữ liệu · Chưa vẽ thanh GPA').waitFor(); await shot('missing-semester');
    await choose('B', 'Học kỳ 1', '2026 – 2027');
    await button('Đổi chiều so sánh GPA').click(); await text('Giảm 0.10 điểm GPA').waitFor();
    await button('Đổi chiều so sánh GPA').click(); await text('Tăng 0.10 điểm GPA').waitFor();
    await openBoard('Học kỳ 2', '2025 – 2026'); await dialog().getByText('Bảng điểm học kỳ', { exact: true }).waitFor();
    await dialog().getByRole('button', { name: 'Mở điểm so sánh: Nhập môn lập trình · IT101', exact: true }).waitFor();
    assert.equal(await dialog().getByRole('button', { name: /Cấu trúc dữ liệu/ }).count(), 0); await back();
    await openBoard('Học kỳ 1', '2026 – 2027');
    await button('Mở điểm so sánh: Cấu trúc dữ liệu & Giải thuật · IT301').click(); await button('Nhập / chỉnh sửa điểm').click();
    for (let index = 1; index <= 3; index++) await page.getByRole('textbox', { name: `Điểm thành phần ${index}`, exact: true }).fill('8');
    await button('Lưu điểm môn học').click(); await settleAction(page); await back();
    await dialog().getByText(/^3\.35\s*\/4$/).waitFor(); await back(); await text('Tăng 0.20 điểm GPA').waitFor();
    // Cancel a different score draft: no changes to the comparison or stored board.
    await openBoard('Học kỳ 1', '2026 – 2027'); await button('Mở điểm so sánh: Cấu trúc dữ liệu & Giải thuật · IT301').click(); await button('Nhập / chỉnh sửa điểm').click();
    await page.getByRole('textbox', { name: 'Điểm thành phần 1', exact: true }).fill('10'); await back(); await button('Bỏ thay đổi').click(); await back(); await back();
    await text('Tăng 0.20 điểm GPA').waitFor();
    // The main grade screen shares these results and links back to comparison.
    await tab('Điểm & GPA').click(); await button('Xem điểm Học kỳ 1, 2026 – 2027').click(); await text(/^3\.35\s*\/4\.0$/).waitFor();
    await button('So sánh GPA giữa các học kỳ').click(); await text('Tăng 0.20 điểm GPA').waitFor();
    await tab('Trang chủ').click(); await tab('Thống kê').click(); await text('Tăng 0.20 điểm GPA').waitFor();
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.getByTestId('page-stats').evaluate(element => { element.scrollTop = 0; }); await shot(`comparison-${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await button('Xem bảng điểm so sánh: Học kỳ 1, 2026 – 2027').evaluate(element => element.scrollIntoView({ block: 'center' })); await shot(`cards-${width}`);
      await text('GPA trên thang 4').evaluate(element => element.scrollIntoView({ block: 'start' })); await shot(`chart-${width}`);
      await button('Chọn học kỳ A để so sánh').click(); await page.getByRole('radio', { name: 'So sánh A: Học kỳ 2, 2025 – 2026', exact: true }).hover(); await shot(`picker-${width}`); await back();
      await openBoard('Học kỳ 1', '2026 – 2027'); await dialog().getByRole('button', { name: /Mở điểm so sánh:/ }).first().hover(); await shot(`board-${width}`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await back();
    }
    await page.setViewportSize({ width: 390, height: 900 });
    // A complete zero-score practical course creates GPA 0.00, not a missing value.
    await tab('Lịch học').click(); await tab('Môn & học kỳ').click(); await button('Chọn Học kỳ 2, 2026 – 2027').click();
    await button('Thêm môn đầu tiên').click(); await page.getByRole('textbox', { name: 'Tên môn học', exact: true }).fill('Thực hành kiểm tra GPA 0');
    await page.getByRole('textbox', { name: 'Mã môn học', exact: true }).fill('ZERO01'); await button('Lưu môn học').click(); await settleAction(page); await button('Đóng').click();
    await tab('Thống kê').click(); await choose('B', 'Học kỳ 2', '2026 – 2027'); await openBoard('Học kỳ 2', '2026 – 2027');
    await button('Mở điểm so sánh: Thực hành kiểm tra GPA 0 · ZERO01').click(); await button('Nhập / chỉnh sửa điểm').click();
    await tab('Thực hành').click(); await button('Áp dụng bộ cột mới').click();
    for (let index = 1; index <= 5; index++) await page.getByRole('textbox', { name: `Điểm thành phần ${index}`, exact: true }).fill('0');
    await button('Lưu điểm môn học').click(); await settleAction(page); await back(); await back();
    await text('Giảm 3.15 điểm GPA').waitFor(); await button('Xem bảng điểm so sánh: Học kỳ 2, 2026 – 2027').getByText(/^0\.00\s*\/4$/).waitFor(); await shot('real-zero-gpa');
    await openBoard('Học kỳ 2', '2026 – 2027'); await button('Đóng').click(); await text('Giảm 3.15 điểm GPA').waitFor(); // X closes the whole grade flow
    // Empty and one-semester states use actionable messages instead of a fabricated comparison.
    await page.reload({ waitUntil: 'networkidle' }); await button('Bắt đầu với dữ liệu trống').click(); await tab('Thống kê').click(); await tab('So sánh GPA').click();
    await text('Chưa có học kỳ để so sánh').waitFor(); await shot('no-semesters');
    await button('Quản lý học kỳ').click(); await button('Tạo học kỳ đầu tiên').click(); await button('Lưu học kỳ').click(); await settleAction(page);
    await tab('Thống kê').click(); await text('Thêm học kỳ thứ hai để so sánh').waitFor(); await shot('one-semester');
    assert.deepEqual(errors, []);
    const result = { passed: true, widths: [320, 390, 430, 1280], checks: ['default comparison and swap direction', 'distinct semester picker and missing result', 'correct semester board/course navigation', 'score save updates board/chart/delta', 'unsaved draft unchanged', 'main grade screen agreement', 'tab selection retained', 'real GPA zero vs missing', 'Back/X close flow', 'zero/one-semester states', 'responsive cards/chart/picker/board', 'console'], errors };
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await shot('last-state'); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
