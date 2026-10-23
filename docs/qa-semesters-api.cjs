const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, request } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_APP_URL || 'http://localhost:8092', api = process.env.QA_API_URL || 'http://localhost:8080';
// Registers ui-a/ui-b QA users. Use a disposable backend schema, never production.
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-semesters-api'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const native = await request.newContext();
  const page = await context.newPage(), errors = [], cases = [], writes = [];
  page.setDefaultTimeout(15_000); page.setDefaultNavigationTimeout(90_000); page.on('pageerror', error => errors.push(error.message));
  page.on('request', r => { if (r.method() !== 'GET' && new URL(r.url()).pathname.startsWith('/api/v1/semesters')) writes.push(r.method()); });
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).filter({ visible: true }).last();
  const text = value => page.getByText(value, { exact: true }).filter({ visible: true });
  const note = () => page.getByLabel('Ghi chú cho học kỳ', { exact: true });
  const card = term => button(`Chọn Học kỳ ${term}${term === 3 ? ' (Hè)' : ''}, 2026 – 2027`);
  const suffix = Date.now(), password = 'FrontendOnlyTest123!';
  const users = { A: { email: `ui-a-${suffix}@example.test`, fullName: 'Học kỳ tài khoản A' }, B: { email: `ui-b-${suffix}@example.test`, fullName: 'Học kỳ tài khoản B' } };
  const tokens = {};
  const step = name => { cases.push(name); console.log('CHECK: ' + name); };
  async function business(who, method, route, data, expected = 200) {
    const response = await native.fetch(api + '/api/v1/' + route, { method, headers: { Authorization: 'Bearer ' + tokens[who] }, data });
    assert.equal(response.status(), expected, method + ' ' + route + ' ' + await response.text());
    return expected === 204 ? undefined : (await response.json()).data;
  }
  const list = () => business('A', 'GET', 'semesters');
  async function login(who, switched = false) {
    if (switched) { await button('Hồ sơ').click(); await button('Đăng nhập tài khoản khác').click(); }
    else { if (await button('Khám phá dữ liệu mẫu').count()) await button('Khám phá dữ liệu mẫu').click(); await button('Hồ sơ').click(); await button('Đăng nhập').click(); }
    await page.getByLabel('Email tài khoản', { exact: true }).fill(users[who].email);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(password); await button('Đăng nhập').click();
    await page.getByTestId('account-full-name').waitFor(); assert.equal(await page.getByTestId('account-full-name').innerText(), users[who].fullName);
    await button('Đóng tài khoản').click();
  }
  async function academics() { await tab('Lịch học').click(); await tab('Môn & học kỳ').click(); }
  async function closeDraft() { await button('Quay lại').last().click(); if (await button('Bỏ thay đổi').count()) await button('Bỏ thay đổi').click(); }
  async function create(term, status, content) {
    if (await button('Tạo học kỳ đầu tiên').count()) await button('Tạo học kỳ đầu tiên').click(); else await button('+ Thêm').click();
    await page.getByRole('radio', { name: term === 3 ? 'Học kỳ 3 (Hè) — Tùy chọn' : `Học kỳ ${term} — Kỳ chính`, exact: true }).click();
    await tab(status).click(); await note().fill(content); await button('Lưu học kỳ').click(); await note().waitFor({ state: 'detached' }); await card(term).waitFor();
  }
  try {
    for (const [who, user] of Object.entries(users)) {
      const response = await native.post(api + '/api/v1/auth/register', { headers: { 'X-Auth-Transport': 'body' }, data: { ...user, password, confirmPassword: password, school: 'IUH', major: 'CNTT' } }); assert.equal(response.status(), 201);
      const signed = await native.post(api + '/api/v1/auth/login', { headers: { 'X-Auth-Transport': 'body' }, data: { email: user.email, password } }); assert.equal(signed.status(), 200); tokens[who] = (await signed.json()).data.accessToken;
    }
    let releaseRead; const heldRead = new Promise(resolve => { releaseRead = resolve; });
    await page.route('**/api/v1/semesters', async route => { await heldRead; await route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ code: 'DATABASE_UNAVAILABLE' }) }); });
    await page.goto(base, { waitUntil: 'networkidle' }); await login('A'); await text('Đang tải học kỳ').waitFor();
    assert.equal(await text('Góc học tập đang chờ bạn').count(), 0); releaseRead(); await text('Chưa tải được học kỳ').waitFor();
    await page.unrouteAll({ behavior: 'wait' }); await button('Thử tải lại học kỳ').click(); await text('Góc học tập đang chờ bạn').waitFor();
    step('initial loading and API outage never appear as an empty account; retry recovers');
    await academics(); await create(1, 'Đang học', 'Học kỳ thật đầu tiên');
    let rows = await list(); assert.equal(rows.length, 1); const firstId = rows[0].id; assert.equal(rows[0].note, 'Học kỳ thật đầu tiên'); assert.equal(writes.length, 1);
    await page.reload({ waitUntil: 'networkidle' }); await button('Đóng tài khoản').click(); await academics(); await card(1).waitFor();
    await button('Chỉnh sửa học kỳ').click(); assert.equal(await note().inputValue(), 'Học kỳ thật đầu tiên'); await closeDraft();
    step('create stores a UUID in PostgreSQL and F5 restores the same semester and note');
    await create(2, 'Đang học', 'Kỳ chính thứ hai'); rows = await list();
    assert.equal(rows.find(s => s.id === firstId).status, 'COMPLETED'); assert.equal(rows.filter(s => s.status === 'CURRENT').length, 1); assert.equal(rows.length, 2);
    assert.equal(await card(3).count(), 0); await tab('Trang chủ').click(); await text('Học kỳ 2').first().waitFor();
    step('current promotion completes the previous semester; dashboard follows; summer is optional');
    await academics(); let releaseOldRead, oldReadSent;
    const oldReadHeld = new Promise(resolve => { releaseOldRead = resolve; }), oldReadStarted = new Promise(resolve => { oldReadSent = resolve; }); let holdOldRead = true;
    await page.route('**/api/v1/semesters', async route => {
      if (holdOldRead) { holdOldRead = false; const response = await route.fetch(); oldReadSent(); await oldReadHeld; try { await route.fulfill({ response }); } catch {} }
      else await route.continue();
    });
    await button('Tải lại danh sách học kỳ').click(); await oldReadStarted;
    await login('B', true); await text('Góc học tập đang chờ bạn').waitFor(); releaseOldRead(); await page.unrouteAll({ behavior: 'wait' });
    await academics(); await text('Chưa có học kỳ').waitFor(); assert.equal(await card(1).count(), 0);
    await login('A', true); await academics(); await card(1).waitFor(); await card(2).waitFor();
    step('late A semester response cannot enter B; returning to A restores its saved semesters');
    await card(1).click(); await button('Chỉnh sửa học kỳ').click(); await note().fill('Bản nháp trên UI');
    let original = (await list()).find(s => s.id === firstId);
    await business('A', 'PUT', 'semesters/' + firstId, { term: original.term, startYear: original.startYear, status: original.status, note: 'Bản mới ở nơi khác', version: original.version });
    await button('Lưu học kỳ').click(); await button('Nạp bản học kỳ mới nhất').waitFor();
    assert.equal(await note().inputValue(), 'Bản nháp trên UI'); assert.equal(await button('Lưu học kỳ').isDisabled(), true);
    await button('Nạp bản học kỳ mới nhất').click(); await page.waitForFunction(() => document.querySelector('[aria-label="Ghi chú cho học kỳ"]')?.value === 'Bản mới ở nơi khác');
    await note().fill('Đã kiểm tra bản mới'); await button('Lưu học kỳ').click(); await note().waitFor({ state: 'detached' });
    assert.equal((await list()).find(s => s.id === firstId).note, 'Đã kiểm tra bản mới');
    step('stale version keeps draft and disables save until explicitly loading latest before editing');
    const course = await business('A', 'POST', 'courses', { semesterId: firstId, code: 'GUARD', name: 'Môn đã lưu từ API', credits: 3 }, 201);
    await button('Chỉnh sửa học kỳ').click(); const beforeDelete = writes.length; await button('Xóa học kỳ').click(); assert.equal(writes.length, beforeDelete);
    await button('Xác nhận xóa học kỳ').click(); await text('Học kỳ còn môn học đã lưu. Hãy xử lý các môn trước khi xóa học kỳ.').waitFor();
    assert.ok((await list()).some(s => s.id === firstId)); await closeDraft();
    await business('A', 'DELETE', `courses/${course.id}?version=${course.version}`, undefined, 204);
    await button('Tải lại danh sách học kỳ').click(); await button('Chỉnh sửa học kỳ').click(); await button('Xóa học kỳ').click(); await button('Xác nhận xóa học kỳ').click();
    await note().waitFor({ state: 'detached' }); assert.equal((await list()).some(s => s.id === firstId), false); await card(2).waitFor();
    step('delete requires confirmation and backend blocks a semester with real courses');
    await context.setOffline(true); await button('Tải lại danh sách học kỳ').click(); await page.getByText(/Cần kiểm tra lại danh sách trước khi lưu tiếp.*Không thể kết nối/).filter({ visible: true }).waitFor();
    await card(2).waitFor(); await context.setOffline(false); await button('Tải lại danh sách học kỳ').click();
    await button('Tải lại danh sách học kỳ').waitFor({ state: 'visible' });
    step('offline refresh retains the loaded semester list and reconnect retry succeeds');
    // Commit POST on the server, then deliberately lose the response. Never resend it automatically.
    let lost = false;
    await page.route('**/api/v1/semesters', async route => {
      if (route.request().method() === 'POST') { await route.fetch(); lost = true; await route.abort('failed'); } else await route.continue();
    });
    await button('+ Thêm').click(); await page.getByRole('radio', { name: 'Học kỳ 3 (Hè) — Tùy chọn', exact: true }).click(); await note().fill('Đã lưu nhưng mất phản hồi');
    const beforeLost = writes.length; await button('Lưu học kỳ').click(); await button('Kiểm tra lại danh sách học kỳ').waitFor();
    assert.equal(lost, true); assert.equal(await button('Lưu học kỳ').isDisabled(), true); assert.equal(writes.length, beforeLost + 1);
    await page.unrouteAll({ behavior: 'wait' }); await button('Kiểm tra lại danh sách học kỳ').click(); await card(3).waitFor();
    assert.equal((await list()).filter(s => s.term === 3).length, 1); await closeDraft();
    step('lost POST response blocks resending; explicit GET discovers the single committed semester');
    // A request already sent can finish after its sheet closes. The result updates the same account only.
    let releaseSave, sent; const heldSave = new Promise(resolve => { releaseSave = resolve; }), saveSent = new Promise(resolve => { sent = resolve; });
    await card(2).click(); await button('Chỉnh sửa học kỳ').click(); await note().fill('Lưu khi đã đóng biểu mẫu');
    await page.route('**/api/v1/semesters/*', async route => { if (route.request().method() === 'PUT') { const response = await route.fetch(); sent(); await heldSave; try { await route.fulfill({ response }); } catch {} } else await route.continue(); });
    await button('Lưu học kỳ').click(); await saveSent; await closeDraft();
    const reconciled = page.waitForResponse(r => r.url().endsWith('/semesters') && r.status() === 200); releaseSave(); await page.unrouteAll({ behavior: 'wait' }); await reconciled;
    await button('Chỉnh sửa học kỳ').click(); assert.equal(await note().inputValue(), 'Lưu khi đã đóng biểu mẫu'); await closeDraft();
    step('closing an in-flight save does not reopen the sheet or falsely cancel a committed change');
    let first401 = true, refreshes = 0; const track = r => { if (r.method() === 'POST' && r.url().endsWith('/auth/refresh')) refreshes++; }; page.on('request', track);
    await page.route('**/api/v1/semesters', async route => { if (first401) { first401 = false; await route.fulfill({ status: 401, contentType: 'application/problem+json', body: JSON.stringify({ code: 'INVALID_ACCESS_TOKEN' }) }); } else await route.continue(); });
    await button('Tải lại danh sách học kỳ').click(); await page.waitForResponse(r => r.url().endsWith('/semesters') && r.status() === 200); assert.equal(refreshes, 1);
    await page.unrouteAll({ behavior: 'wait' }); page.off('request', track); step('business 401 refreshes the access token once and reloads without password');
    await card(3).click(); await button('Chỉnh sửa học kỳ').click(); await page.waitForTimeout(500);
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(out, `semester-${width}.png`), animations: 'disabled' });
    }
    await closeDraft(); await button('Chỉnh sửa học kỳ').click(); await button('Xóa học kỳ').click(); await button('Xác nhận xóa học kỳ').click(); await note().waitFor({ state: 'detached' });
    await card(2).click(); await button('Chỉnh sửa học kỳ').click(); await button('Xóa học kỳ').click(); await button('Xác nhận xóa học kỳ').click(); await text('Chưa có học kỳ').waitFor(); assert.deepEqual(await list(), []);
    step('forms fit 320/390/430/1280; deleting the last semester returns to setup');
    assert.deepEqual(errors, []); const result = { passed: true, checks: cases.length, cases, errors };
    fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } catch (error) { await page.screenshot({ path: path.join(out, 'failure.png') }); fs.writeFileSync(path.join(out, 'failure.txt'), await page.locator('body').innerText()); throw error; }
  finally { await context.setOffline(false); await native.dispose(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
