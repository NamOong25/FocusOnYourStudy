const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { settleAction } = require('./qa-onboarding-helpers.cjs');
const { backDialog } = require('./qa-navigation-helpers.cjs');
const base = process.env.QA_APP_URL || 'http://localhost:8092', api = process.env.QA_API_URL || 'http://localhost:8080';
// Requires a disposable backend schema. Never attach to a personal browser profile.
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-account-isolation'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const page = await context.newPage(), errors = [], cases = [], logs = [], requests = [];
  context.on('page', p => { p.on('pageerror', error => errors.push(error.message)); p.on('console', m => logs.push(m.text())); });
  page.on('pageerror', error => errors.push(error.message)); page.on('console', m => logs.push(m.text()));
  context.on('request', r => { if (r.url().includes('/api/v1/')) requests.push({ method: r.method(), path: new URL(r.url()).pathname }); });
  const button = (name, p = page) => p.getByRole('button', { name, exact: true }).filter({ visible: true });
  const tab = (name, p = page) => p.getByRole('tab', { name, exact: true }).filter({ visible: true }).last();
  const text = (value, p = page) => p.getByText(value, { exact: true }).filter({ visible: true });
  const field = (name, p = page) => p.getByLabel(name, { exact: true });
  const profile = p => p.getByTestId('account-full-name');
  const suffix = Date.now(), password = 'FrontendOnlyTest123!';
  const users = { A: { email: `ui-a-${suffix}@example.test`, fullName: 'Tài khoản kiểm thử A' }, B: { email: `ui-b-${suffix}@example.test`, fullName: 'Tài khoản kiểm thử B' } };
  const step = name => { cases.push(name); console.log('CHECK: ' + name); };
  const save = async name => { await button(name).click(); await settleAction(page); };
  async function guestLogin(p = page) {
    if (await button('Khám phá dữ liệu mẫu', p).count()) await button('Khám phá dữ liệu mẫu', p).click();
    if (!await button('Đăng nhập', p).count()) await button('Hồ sơ', p).click();
    await button('Đăng nhập', p).click();
  }
  async function login(who, p = page) {
    await field('Email tài khoản', p).fill(users[who].email); await field('Mật khẩu', p).fill(password); await button('Đăng nhập', p).click();
    await profile(p).waitFor(); assert.equal(await profile(p).innerText(), users[who].fullName);
  }
  async function switchTo(who, p = page) { await button('Hồ sơ', p).click(); await button('Đăng nhập tài khoản khác', p).click(); await login(who, p); }
  async function seed(who) {
    await text('Góc học tập đang chờ bạn').waitFor();
    await button('Tạo học kỳ đầu tiên').click(); await button('Tạo học kỳ đầu tiên').click(); await tab('Đang học').click(); await save('Lưu học kỳ');
    await button('Thêm môn đầu tiên').click(); await field('Tên môn học').fill('Môn riêng ' + who); await field('Mã môn học').fill('QA' + who); await save('Lưu môn học');
    await backDialog(page); await tab('Bài tập').click(); await button('Thêm bài tập mới').click(); await field('Tên bài tập').fill('Bài riêng ' + who); await save('Tạo bài tập');
    await tab('Lịch học').click(); await tab('Tự học').click(); await button('Lên kế hoạch mới').click(); await field('Nội dung tự học').fill('Buổi riêng ' + who); await save('Lưu buổi tự học');
    await button('Tập trung: Buổi riêng ' + who).click(); await button('Bắt đầu').click(); await text('ĐANG HỌC SÂU').waitFor();
    await tab('Lịch học').click(); await tab('Bài tập').click(); await button('Thêm bài tập mới').click(); await field('Tên bài tập').fill('Bản nháp riêng ' + who);
  }
  async function emptyChecks(who) {
    await text('Góc học tập đang chờ bạn').waitFor(); assert.equal(await text('Bản nháp riêng ' + who).count(), 0);
    await tab('Lịch học').click(); await tab('Bài tập').click(); assert.equal(await button('Mở bài tập Bài riêng ' + who).count(), 0);
    await tab('Tập trung').click(); await text('Chọn một môn để bắt đầu tập trung').waitFor(); await text('0 / 4 phiên').waitFor();
    assert.equal(await button('Tạm dừng').count(), 0); await button('Xem lịch sử theo ngày').click(); await text('Chưa có phiên hoàn tất').waitFor(); await button('Đóng').click();
    await button('Thông báo').click(); assert.equal(await button('Mở nhắc bài Bài riêng ' + who).count(), 0); await button('Đóng').click(); await tab('Trang chủ').click();
  }
  try {
    for (const user of Object.values(users)) {
      const response = await context.request.post(api + '/api/v1/auth/register', { headers: { 'X-Auth-Transport': 'body' }, data: { ...user, password, confirmPassword: password, school: 'IUH', major: 'CNTT' } }); assert.equal(response.status(), 201);
    }
    await page.goto(base, { waitUntil: 'networkidle' }); await guestLogin(); await login('A'); await button('Đóng tài khoản').click(); await seed('A');
    step('A has its own semester/course/task/study, running Pomodoro and dirty draft');
    const second = await context.newPage(); await second.goto(base, { waitUntil: 'networkidle' }); await profile(second).waitFor();
    await button('Đăng nhập tài khoản khác', second).click(); await login('B', second); await profile(page).waitFor(); assert.equal(await profile(page).innerText(), users.B.fullName);
    assert.equal(await field('Tên bài tập').count(), 0); await button('Đóng tài khoản').click(); await emptyChecks('A');
    assert.equal(await button('Bỏ thay đổi').count(), 0); step('switch A to B in another tab discards dirty form, learning data, timer and reminders');
    await button('Thử trạng thái giao diện').click(); await button('Bật lỗi cho lần xử lý tới').click(); await button('Đóng').click();
    await switchTo('A'); await button('Đóng tài khoản').click(); await button('Thử trạng thái giao diện').click();
    await button('Bật lỗi cho lần xử lý tới').waitFor(); assert.equal(await button('Đã bật lỗi cho lần xử lý tới').count(), 0); await button('Đóng').click();
    step('feedback notices and simulated save failures reset on identity change');
    await emptyChecks('A'); step('returning to A starts empty; trial learning data is not persisted');
    await seed('A');
    await button('Đăng xuất', second).waitFor(); await button('Đăng xuất', second).click(); await button('Xác nhận đăng xuất', second).click();
    await text('Đã đăng xuất.', second).waitFor(); await profile(page).waitFor({ state: 'detached' });
    assert.equal(await field('Tên bài tập').count(), 0); assert.equal(await button('Bỏ thay đổi').count(), 0); await second.close();
    step('logout in other tab closes dirty form without preserving old workspace');
    await page.reload({ waitUntil: 'networkidle' }); await guestLogin(); await login('B'); await button('Đóng tài khoản').click(); await emptyChecks('A');
    await button('Hồ sơ').click();
    let releaseProfile; const delayedProfile = new Promise(resolve => { releaseProfile = resolve; }); let profileIntercepted;
    const intercepted = new Promise(resolve => { profileIntercepted = resolve; });
    await page.route('**/api/v1/users/me', async route => { const response = await route.fetch(); profileIntercepted(); await delayedProfile; try { await route.fulfill({ response }); } catch {} });
    await button('Tải lại hồ sơ').click(); await intercepted; await text('Đang tải hồ sơ').waitFor();
    await button('Đăng xuất').click(); await button('Xác nhận đăng xuất').click(); await text('Đã đăng xuất.').waitFor(); releaseProfile();
    await page.unrouteAll({ behavior: 'wait' }); assert.equal(await profile(page).count(), 0);
    step('late profile response after logout cannot resurrect account');
    await button('Đăng nhập').click(); await login('A');
    await context.setOffline(true); await button('Tải lại hồ sơ').click(); await text('Chưa tải được hồ sơ').waitFor();
    await context.setOffline(false); await button('Thử tải lại hồ sơ').click(); await profile(page).waitFor(); assert.equal(await profile(page).innerText(), users.A.fullName);
    step('profile offline error keeps session and reconnect retry succeeds');
    await context.setOffline(true); await button('Đăng xuất').click(); await button('Xác nhận đăng xuất').click(); await button('Hoàn tất đăng xuất').waitFor();
    await context.setOffline(false); await page.reload({ waitUntil: 'networkidle' }); assert.equal(await profile(page).count(), 0);
    step('offline logout plus reload does not restore old identity');
    await guestLogin(); await login('B');
    await button('Đăng nhập tài khoản khác').click(); let releaseLogin; const heldLogin = new Promise(resolve => { releaseLogin = resolve; });
    let loginIntercepted; const loginSent = new Promise(resolve => { loginIntercepted = resolve; });
    await page.route('**/api/v1/auth/login', async route => { const response = await route.fetch(); loginIntercepted(); await heldLogin; try { await route.fulfill({ response }); } catch {} });
    await field('Email tài khoản').fill(users.A.email); await field('Mật khẩu').fill(password); await button('Đăng nhập').click(); await loginSent; await button('Đóng tài khoản').click(); releaseLogin();
    await page.unrouteAll({ behavior: 'wait' });
    if (await button('Hồ sơ').count()) await button('Hồ sơ').click();
    await button('Hoàn tất đăng xuất').waitFor(); assert.equal(await profile(page).count(), 0);
    await button('Hoàn tất đăng xuất').click(); await page.reload({ waitUntil: 'networkidle' }); assert.equal(await profile(page).count(), 0);
    step('closing switched-login after server accepted it cannot display late identity or restore it');
    await guestLogin(); await login('A');
    // Let the account modal's native animation finish before layout captures.
    await page.waitForTimeout(500);
    for (const width of [320, 390, 430, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.screenshot({ path: path.join(out, `account-${width}.png`) }); }
    step('account layouts at 320/390/430/1280'); assert.deepEqual(errors, []); assert.ok(!logs.join('|').includes(password));
    assert.ok(requests.every(r => r.method === 'GET' || r.path.startsWith('/api/v1/auth/'))); step('no learning API writes or password logs; learning data remains prototype');
    const result = { passed: true, checks: cases.length, cases, errors }; fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } catch (error) { await page.screenshot({ path: path.join(out, 'failure.png') }); fs.writeFileSync(path.join(out, 'failure.txt'), await page.locator('body').innerText()); throw error; }
  finally { await context.setOffline(false); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
