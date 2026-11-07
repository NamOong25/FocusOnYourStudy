// Separate browser profile; uses the prototype's in-memory data only.
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { enterDemo, settleAction } = require('./qa-onboarding-helpers.cjs');
const { chooseTime } = require('./qa-picker-helpers.cjs');
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-unsaved-forms'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const errors = [], checks = [];
  const report = message => { checks.push(message); console.log(`PASS: ${message}`); };
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const b = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).filter({ visible: true });
  const field = name => page.getByLabel(name, { exact: true }).filter({ visible: true });
  const text = name => page.getByText(name, { exact: true }).filter({ visible: true });
  const prompt = () => page.getByTestId('unsaved-changes');
  const back = () => page.getByRole('dialog').last().getByRole('button', { name: 'Quay lại', exact: true }).click();
  const confirm = async action => { await action(); await prompt().waitFor(); assert.equal(await page.getByRole('dialog').count(), 1); };
  const keep = async () => { await b('Tiếp tục chỉnh sửa').click(); await prompt().waitFor({ state: 'hidden' }); };
  const discard = async () => { await b('Bỏ thay đổi').click(); await prompt().waitFor({ state: 'hidden' }); };
  const noPrompt = async () => { assert.equal(await prompt().count(), 0); };
  const shot = async name => { await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' }); };
  try {
    await page.clock.install({ time: new Date('2026-10-21T07:00:00+07:00') });
    await page.goto('data:text/html,<p>Before application</p>');
    await page.goto(process.argv[2] || 'http://localhost:8092/', { waitUntil: 'networkidle' }); await enterDemo(page);
    await tab('Lịch học').click(); await tab('Bài tập').click();
    await b('Thêm bài tập mới').click(); await back(); await b('Thêm bài tập mới').waitFor(); await noPrompt();
    await b('Thêm bài tập mới').click(); await field('Tên bài tập').fill('Bản nháp chưa lưu');
    await confirm(back); await keep(); assert.equal(await field('Tên bài tập').inputValue(), 'Bản nháp chưa lưu');
    await confirm(() => b('Đóng').click()); await page.keyboard.press('Escape'); await field('Tên bài tập').waitFor();
    assert.equal(await field('Tên bài tập').inputValue(), 'Bản nháp chưa lưu');
    await confirm(() => page.keyboard.press('Escape')); await page.goBack(); await field('Tên bài tập').waitFor();
    await confirm(() => page.goBack()); await keep();
    await confirm(() => b('Đóng hộp thoại').click({ position: { x: 8, y: 8 } })); await keep();
    // A date/time picker consumes Back first and does not discard the form draft.
    await b('Chọn giờ hạn nộp').click(); await page.goBack(); await field('Tên bài tập').waitFor(); await noPrompt();
    assert.equal(await field('Tên bài tập').inputValue(), 'Bản nháp chưa lưu');
    await field('Tên bài tập').fill(''); await b('Đóng').click(); await b('Thêm bài tập mới').waitFor(); await noPrompt();
    report('clean/reverted new form; Back/X/Escape/browser Back/backdrop; second Back keeps editing; picker Back first');

    // Discard does not mutate the source. Success and validation failures use different paths.
    await b('Mở bài tập Đồ án cuối kỳ Web App').click(); await b('Chỉnh sửa bài tập').click();
    const oldTitle = await field('Tên bài tập').inputValue();
    await field('Tên bài tập').fill('Tên sẽ bỏ'); await confirm(back); await discard(); await text('Chi tiết bài tập').waitFor();
    await b('Chỉnh sửa bài tập').click(); assert.equal(await field('Tên bài tập').inputValue(), oldTitle); await back();
    await b('Chỉnh sửa bài tập').click(); await field('Tên bài tập').fill(''); await b('Lưu thay đổi').click(); await settleAction(page);
    await text('Nhập tên bài tập trước nhé.').waitFor(); await confirm(back); await keep(); assert.equal(await field('Tên bài tập').inputValue(), '');
    await field('Tên bài tập').fill(oldTitle); await back(); await noPrompt();
    await b('Chỉnh sửa bài tập').click(); await field('Ghi chú').fill('Ghi chú đã lưu trong đợt kiểm tra');
    await b('Lưu thay đổi').click(); await settleAction(page); await text('Chi tiết bài tập').waitFor(); await noPrompt();
    await b('Chỉnh sửa bài tập').click(); assert.equal(await field('Ghi chú').inputValue(), 'Ghi chú đã lưu trong đợt kiểm tra'); await back(); await noPrompt();
    // X discards the whole flow; Back discards only the editing screen.
    await b('Chỉnh sửa bài tập').click(); await field('Tên bài tập').fill('Đóng cả luồng'); await confirm(() => b('Đóng').click()); await discard();
    await b('Thêm bài tập mới').waitFor(); assert.equal(await text('Chi tiết bài tập').count(), 0);
    report('discard preserves stored task; validation preserves draft; save bypasses prompt; reopen clean; Back vs whole-flow X');

    // Delayed prototype save must not run underneath the confirmation.
    await b('Thêm bài tập mới').click(); await field('Tên bài tập').fill('Không được tự lưu sau khi thoát');
    await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now() + 1000)));
    await b('Tạo bài tập').click(); await b('Hủy chờ xử lý').waitFor(); await confirm(() => b('Đóng').click());
    await page.clock.runFor(1000); await keep(); assert.equal(await field('Tên bài tập').inputValue(), 'Không được tự lưu sau khi thoát');
    await confirm(back); await discard(); assert.equal(await b('Mở bài tập Không được tự lưu sau khi thoát').count(), 0);
    await page.clock.resume();
    // A simulated failed save retains the same dirty draft and can be retried after continuing.
    await b('Thử trạng thái giao diện').click(); await b('Bật lỗi cho lần xử lý tới').click(); await b('Quay lại ứng dụng').click();
    await b('Thêm bài tập mới').click(); await field('Tên bài tập').fill('Bản nháp sau lỗi'); await b('Tạo bài tập').click(); await settleAction(page);
    await b('Thử lại thao tác').waitFor(); await confirm(back); await keep(); assert.equal(await field('Tên bài tập').inputValue(), 'Bản nháp sau lỗi');
    await b('Tạo bài tập').click(); await settleAction(page); await b('Mở bài tập Bản nháp sau lỗi').waitFor(); await noPrompt();
    report('pending save canceled before prompt; failed save retains draft; successful retry does not prompt');

    await tab('Môn & học kỳ').click(); await b('Chỉnh sửa học kỳ').click();
    const note = await field('Ghi chú cho học kỳ').inputValue(); await field('Ghi chú cho học kỳ').fill('Nháp học kỳ');
    await confirm(back); await keep(); assert.equal(await field('Ghi chú cho học kỳ').inputValue(), 'Nháp học kỳ');
    await field('Ghi chú cho học kỳ').fill(note); await back(); await noPrompt();
    // New semester defaults are clean; changing only a selector is dirty, reverting it is clean.
    await b('+ Thêm').click(); await b('Năm học tiếp theo').click(); await confirm(back); await keep(); await b('Năm học trước').click(); await back(); await noPrompt();
    await b('Thêm môn học mới').click(); await field('Tên môn học').fill('Môn chưa lưu'); await confirm(back); await discard();
    await b('Mở môn Lập trình Hướng đối tượng').click(); await b('Chỉnh sửa môn học').click();
    const teacher = await field('Giảng viên').inputValue(); await field('Giảng viên').fill('Giảng viên nháp'); await confirm(back); await keep();
    assert.equal(await field('Giảng viên').inputValue(), 'Giảng viên nháp'); await field('Giảng viên').fill(teacher); await back(); await noPrompt();
    report('semester create/edit and year selector; course create/edit; reverted values clear dirty state');

    // Grade entries: zero is a value, blank differs from zero; column changes are drafts too.
    await tab('Điểm số').click(); await b('Nhập / chỉnh sửa điểm').click();
    const score = await field('Điểm thành phần 1').inputValue(); await field('Điểm thành phần 1').fill('0'); await confirm(back); await keep();
    assert.equal(await field('Điểm thành phần 1').inputValue(), '0'); await field('Điểm thành phần 1').fill(score);
    const count = await page.getByLabel(/^Điểm thành phần \d+$/, { exact: true }).count();
    await b('Thêm cột điểm').click(); await confirm(back); await keep(); await b(`Xóa cột điểm ${count + 1}`).click();
    await back(); await noPrompt();
    await b('Nhập / chỉnh sửa điểm').click(); await field('Điểm thành phần 1').fill('0'); await confirm(back); await discard();
    await b('Nhập / chỉnh sửa điểm').click(); assert.equal(await field('Điểm thành phần 1').inputValue(), score);
    await field('Điểm thành phần 1').fill('7.5'); await b('Lưu điểm môn học').click(); await settleAction(page); await noPrompt();
    await b('Nhập / chỉnh sửa điểm').click(); assert.equal(await field('Điểm thành phần 1').inputValue(), '7.5'); await back(); await noPrompt(); await b('Đóng').click();
    report('grade score/zero and added/deleted columns; discard old score; save/reopen clean');

    await tab('Thời khóa biểu').click(); await b('Thêm lịch học').click();
    const room = await field('Phòng học').inputValue(); await field('Phòng học').fill('Phòng nháp'); await confirm(back); await keep();
    await field('Phòng học').fill(room);
    // Rechecking the same day changes array insertion order but not schedule content.
    const checkedDay = page.getByRole('checkbox', { checked: true }).first(); const dayName = await checkedDay.getAttribute('aria-label');
    await page.getByRole('checkbox', { name: 'Học vào T2', exact: true }).click();
    await page.getByRole('checkbox', { name: dayName, exact: true }).click(); await page.getByRole('checkbox', { name: dayName, exact: true }).click();
    await page.getByRole('checkbox', { name: 'Học vào T2', exact: true }).click(); await back(); await noPrompt();
    await b('Xem buổi học Lập trình Hướng đối tượng').click(); await b('Đổi giờ hoặc phòng buổi này').click();
    await field('Phòng học buổi này').fill('Ngoại lệ chưa lưu'); await confirm(back); await discard(); await text('Chi tiết buổi học').waitFor();
    await b('Nghỉ buổi này').click(); await field('Lý do / ghi chú').fill('Lý do chưa lưu'); await confirm(back); await keep();
    assert.equal(await field('Lý do / ghi chú').inputValue(), 'Lý do chưa lưu'); await confirm(back); await discard(); await b('Đóng').click();
    report('recurring class, reordered weekdays and reverted room; single-occurrence change/cancellation drafts');

    await tab('Kỳ thi').click(); await b('+ Thêm lịch').click(); await field('Phòng thi').fill('Phòng thi nháp');
    await confirm(back); await keep(); assert.equal(await field('Phòng thi').inputValue(), 'Phòng thi nháp'); await confirm(back); await discard();
    await b('Xem lịch thi Toán rời rạc').click(); await b('Chỉnh sửa lịch thi').click();
    await field('Ghi chú kỳ thi').fill('Nháp lịch thi'); await confirm(back); await discard(); await text('Chi tiết lịch thi').waitFor(); await b('Đóng').click();
    await tab('Tự học').click(); await b('Lên kế hoạch mới').click(); await field('Nội dung tự học').fill('Nội dung chưa lưu');
    await chooseTime(page, 'Bắt đầu', '21:00'); await confirm(back); await keep();
    assert.equal(await field('Nội dung tự học').inputValue(), 'Nội dung chưa lưu'); await confirm(back); await discard();
    report('exam create/edit and independent study form with confirmed time picker');

    // Native browser unload confirmation protects refresh/close; ordinary Back uses the custom panel.
    await tab('Bài tập').click(); await b('Thêm bài tập mới').click(); await field('Tên bài tập').fill('Giữ khi tải lại');
    const unload = page.waitForEvent('dialog'); const reload = page.reload().catch(() => null); const nativeDialog = await unload;
    assert.equal(nativeDialog.type(), 'beforeunload'); await nativeDialog.dismiss(); await reload;
    assert.equal(await field('Tên bài tập').inputValue(), 'Giữ khi tải lại'); await noPrompt();
    await confirm(back); await keep();
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 844 }); await confirm(() => b('Đóng').click());
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const name of ['Tiếp tục chỉnh sửa', 'Bỏ thay đổi']) { const box = await b(name).boundingBox(); assert.ok(box.y >= 0 && box.y + box.height <= 844); }
      await shot(`confirmation-${width}`); await keep(); assert.equal(await field('Tên bài tập').inputValue(), 'Giữ khi tải lại');
    }
    await page.setViewportSize({ width: 844, height: 390 }); await confirm(() => b('Đóng').click());
    await b('Bỏ thay đổi').scrollIntoViewIfNeeded(); const shortBox = await b('Bỏ thay đổi').boundingBox();
    assert.ok(shortBox.y >= 0 && shortBox.y + shortBox.height <= 390); await shot('confirmation-landscape'); await keep();
    await confirm(back); await discard(); await tab('Trang chủ').click();
    await page.waitForFunction(() => !window.history.state?.__focusStudyBack);
    await page.goBack(); assert.ok(page.url().startsWith('data:text/html'));
    report('beforeunload cancel preserves form; 320/390/430/1280 prompt buttons reachable; browser Back exits at root');
    assert.deepEqual(errors, []); const result = { passed: true, checks, errors }; fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await shot('last-state'); await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
