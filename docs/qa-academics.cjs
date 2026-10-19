// Optional browser smoke check: start Metro, provide Playwright/Chromium or their environment paths.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-academics'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  const button = name => page.getByRole('button', { name, exact: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).last();
  const close = () => button('Đóng').click();
  try {
    await page.goto(process.argv[2] || 'http://localhost:8092', { waitUntil: 'networkidle' });
    await tab('Lịch học').click(); await tab('Môn & học kỳ').click();
    await page.getByText('Môn học & học kỳ', { exact: true }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [390, 320, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.screenshot({ path: path.join(out, `courses-${width}.png`) });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await button('Mở môn Cấu trúc dữ liệu & Giải thuật').click();
    await button('Chỉnh sửa môn học').hover();
    await page.screenshot({ path: path.join(out, 'course-detail.png') });
    await tab('Bài tập').click(); await button('Mở bài tập Ôn tập chương Cây nhị phân').waitFor();
    await tab('Điểm số').click(); await page.getByText('Chưa đủ dữ liệu', { exact: true }).waitFor();
    await page.screenshot({ path: path.join(out, 'course-grades.png') }); await close();
    await page.getByLabel('Tìm môn học', { exact: true }).fill('IT303');
    await button('Mở môn Cơ sở dữ liệu').waitFor(); assert.equal(await button('Mở môn Mạng máy tính').count(), 0);
    await button('Xóa tìm kiếm').click();
    await tab('Hoàn thành').click(); await page.getByText('Chưa tìm thấy môn phù hợp', { exact: true }).waitFor();
    await button('Xem tất cả môn').click();
    await button('Chọn Học kỳ 4').click(); await button('Mở môn Nhập môn lập trình').waitFor();
    await button('Chọn Học kỳ 6').click(); await page.getByText('Học kỳ mới đang chờ bạn', { exact: true }).waitFor();
    await button('+ Thêm').click(); await button('Lưu học kỳ').click();
    await page.getByRole('alert').filter({ hasText: 'đặt tên' }).waitFor();
    await page.getByLabel('Tên học kỳ', { exact: true }).fill('Học kỳ thử nghiệm');
    await page.getByLabel('Năm học', { exact: true }).fill('2027 – 2028');
    await button('Lưu học kỳ').click();
    await button('Thêm môn đầu tiên').click();
    await page.getByLabel('Tên môn học', { exact: true }).fill('Công nghệ phần mềm');
    await page.getByLabel('Mã môn học', { exact: true }).fill('SE301');
    await page.getByLabel('Số tín chỉ', { exact: true }).fill('0');
    await button('Lưu môn học').click(); await page.getByRole('alert').filter({ hasText: 'Số tín chỉ' }).waitFor();
    await page.getByLabel('Số tín chỉ', { exact: true }).fill('4');
    await page.getByLabel('Giảng viên', { exact: true }).fill('ThS. Minh Anh');
    await page.getByLabel('Phòng học thường dùng', { exact: true }).fill('A3.401');
    await page.screenshot({ path: path.join(out, 'course-form.png') });
    await button('Lưu môn học').click(); await page.getByText('SE301 · 4 tín chỉ', { exact: true }).waitFor();
    await tab('Bài tập').click(); await button('Thêm bài tập cho môn').click();
    assert.equal(await page.getByRole('radio', { name: 'Công nghệ phần mềm · SE301', exact: true }).getAttribute('aria-checked'), 'true');
    await page.getByLabel('Tên bài tập', { exact: true }).fill('Báo cáo thiết kế học phần');
    await button('Tạo bài tập').click(); await tab('Bài tập').click();
    await button('Mở bài tập Báo cáo thiết kế học phần').waitFor();
    await tab('Lịch học').click(); await button('Thêm ca học cho môn').click();
    await page.getByLabel('Bắt đầu (HH:mm)', { exact: true }).fill('18:00');
    await page.getByLabel('Kết thúc (HH:mm)', { exact: true }).fill('19:00');
    assert.equal(await page.getByLabel('Giảng viên', { exact: true }).inputValue(), 'ThS. Minh Anh');
    await button('Lưu lịch học').click(); await tab('Lịch học').click();
    await page.getByText('18:00 – 19:00', { exact: true }).waitFor();
    await button('Chỉnh sửa môn học').click();
    assert.equal(await button('Xóa môn học').isDisabled(), true);
    await page.getByLabel('Tên môn học', { exact: true }).fill('Kỹ nghệ phần mềm');
    await button('Lưu môn học').click(); await tab('Bài tập').click();
    await button('Mở bài tập Báo cáo thiết kế học phần').click();
    await button('Chỉnh sửa bài tập').click();
    assert.equal(await page.getByRole('radio', { name: 'Kỹ nghệ phần mềm · SE301', exact: true }).getAttribute('aria-checked'), 'true');
    await close(); await close(); await close();
    // The same subject/code in another semester must not inherit the original subject's tasks.
    await button('+ Thêm môn').click();
    await page.getByLabel('Tên môn học', { exact: true }).fill('Cấu trúc dữ liệu & Giải thuật');
    await page.getByLabel('Mã môn học', { exact: true }).fill('IT301');
    await button('Lưu môn học').click(); await tab('Bài tập').click();
    await page.getByText('Chưa có bài tập cho môn này', { exact: true }).waitFor(); await close();
    await button('+ Thêm môn').click();
    await page.getByLabel('Tên môn học', { exact: true }).fill('Môn tạm');
    await page.getByLabel('Mã môn học', { exact: true }).fill('IT301');
    await button('Lưu môn học').click(); await page.getByRole('alert').filter({ hasText: 'Mã môn này đã có' }).waitFor();
    await page.getByLabel('Mã môn học', { exact: true }).fill('TMP999');
    await button('Lưu môn học').click(); await button('Chỉnh sửa môn học').click();
    await button('Xóa môn học').click(); await button('Xác nhận xóa môn học').click();
    assert.equal(await button('Mở môn Môn tạm').count(), 0);
    await button('Mở môn Kỹ nghệ phần mềm').click(); await button('Tập trung môn này').click();
    await page.getByText('Kỹ nghệ phần mềm', { exact: true }).first().waitFor();
    await tab('Trang chủ').click(); await page.getByText('Kỹ nghệ phần mềm', { exact: true }).first().waitFor();
    assert.deepEqual(errors, []);
    const result = { passed: true, widths: [320, 390, 430, 1280], checks: ['semester switch/create/validation', 'course search/status filter', 'course create/edit/delete validation', 'course default in task/schedule forms', 'teacher/room prefilling', 'rename keeps linked tasks', 'same name across semesters isolated by ID', 'linked course deletion blocked', 'course focus link', 'grade preview without zero defaults', 'browser console'], errors };
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await page.screenshot({ path: path.join(out, 'last-state.png') }); fs.writeFileSync(path.join(out, 'console-errors.json'), JSON.stringify(errors)); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

