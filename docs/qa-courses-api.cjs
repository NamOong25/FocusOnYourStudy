const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium, request } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { settleAction } = require('./qa-onboarding-helpers.cjs');
const base = process.env.QA_APP_URL || 'http://localhost:8092', api = process.env.QA_API_URL || 'http://localhost:8080';
// Only run against a disposable backend schema; creates ui-a/ui-b QA accounts.
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-courses-api'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, timezoneId: 'Asia/Ho_Chi_Minh' });
  const native = await request.newContext(), page = await context.newPage(), errors = [], cases = [], writes = [];
  page.setDefaultTimeout(15_000); page.setDefaultNavigationTimeout(90_000); page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => { if (r.method() !== 'GET' && new URL(r.url()).pathname.startsWith('/api/v1/courses')) writes.push(r.method()); });
  const button = name => page.getByRole('button', { name, exact: true }).filter({ visible: true });
  const tab = name => page.getByRole('tab', { name, exact: true }).filter({ visible: true }).last();
  const field = name => page.getByLabel(name, { exact: true });
  const text = value => page.getByText(value, { exact: true }).filter({ visible: true });
  const step = name => { cases.push(name); console.log('CHECK: ' + name); };
  const users = { A: { email: `ui-a-${Date.now()}@example.test`, fullName: 'Môn tài khoản A' }, B: { email: `ui-b-${Date.now()}@example.test`, fullName: 'Môn tài khoản B' } };
  const password = 'FrontendOnlyTest123!', tokens = {}, semesters = [];
  async function business(method, route, data, expected = 200) {
    const response = await native.fetch(api + '/api/v1/' + route, { method, headers: { Authorization: 'Bearer ' + tokens.A }, data });
    assert.equal(response.status(), expected, method + ' ' + route + ' ' + await response.text()); return expected === 204 ? undefined : (await response.json()).data;
  }
  const list = () => business('GET', 'courses');
  const courseBody = c => Object.fromEntries(['semesterId', 'code', 'name', 'credits', 'teacher', 'room', 'description', 'status', 'color', 'version'].map(key => [key, c[key]]));
  async function login(who, switched = false) {
    if (switched) { await button('Hồ sơ').click(); await button('Đăng nhập tài khoản khác').click(); }
    else { if (await button('Khám phá dữ liệu mẫu').count()) await button('Khám phá dữ liệu mẫu').click(); await button('Hồ sơ').click(); await button('Đăng nhập').click(); }
    await field('Email tài khoản').fill(users[who].email); await field('Mật khẩu').fill(password); await button('Đăng nhập').click(); await page.getByTestId('account-full-name').waitFor();
    assert.equal(await page.getByTestId('account-full-name').innerText(), users[who].fullName); await button('Đóng tài khoản').click();
  }
  const academics = async () => { await tab('Lịch học').click(); await tab('Môn & học kỳ').click(); };
  const selectSemester = term => button(`Chọn Học kỳ ${term}, 2026 – 2027`).click();
  const chooseSemester = term => page.getByRole('radio', { name: `Học kỳ ${term}, 2026 – 2027`, exact: true }).click();
  const close = async () => { await button('Quay lại').last().click(); if (await button('Bỏ thay đổi').count()) await button('Bỏ thay đổi').click(); };
  async function create(name, code, term = 1) {
    await selectSemester(term);
    if (await button('Thêm môn đầu tiên').count()) await button('Thêm môn đầu tiên').click(); else await button('+ Thêm môn').click();
    await field('Tên môn học').fill(name); await field('Mã môn học').fill(code); await field('Giảng viên').fill('Giảng viên A'); await field('Phòng học thường dùng').fill('A1.101'); await field('Giới thiệu & mục tiêu môn học').fill('Mục tiêu đã lưu');
    await button('Lưu môn học').click(); await field('Tên môn học').waitFor({ state: 'detached' }); await text('Chi tiết môn học').waitFor();
  }
  async function saveEdit() { await button('Lưu môn học').click(); await field('Tên môn học').waitFor({ state: 'detached' }); await text('Chi tiết môn học').waitFor(); }
  async function addTrialTask(name) {
    await tab('Bài tập').click(); await button('Thêm bài tập cho môn').click(); await field('Tên bài tập').fill(name); await button('Tạo bài tập').click(); await settleAction(page); await text('Chi tiết môn học').waitFor();
  }
  try {
    for (const [who, user] of Object.entries(users)) {
      const response = await native.post(api + '/api/v1/auth/register', { headers: { 'X-Auth-Transport': 'body' }, data: { ...user, password, confirmPassword: password, school: 'IUH', major: 'CNTT' } }); assert.equal(response.status(), 201);
      const signed = await native.post(api + '/api/v1/auth/login', { headers: { 'X-Auth-Transport': 'body' }, data: { email: user.email, password } }); assert.equal(signed.status(), 200); tokens[who] = (await signed.json()).data.accessToken;
    }
    for (const term of [1, 2]) semesters.push(await business('POST', 'semesters', { term, startYear: 2026, status: term === 1 ? 'CURRENT' : 'UPCOMING', note: '' }, 201));
    let releaseInitial; const heldInitial = new Promise(resolve => { releaseInitial = resolve; });
    await page.route('**/api/v1/courses', async route => { await heldInitial; await route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ code: 'DATABASE_UNAVAILABLE' }) }); });
    await page.goto(base, { waitUntil: 'networkidle' }); await login('A'); await text('Đang tải môn học').waitFor(); assert.equal(await text('Học kỳ này chưa có môn học').count(), 0);
    releaseInitial(); await text('Chưa tải được môn học').waitFor(); await page.unrouteAll({ behavior: 'wait' }); await button('Thử tải lại môn học').click();
    await academics(); await create('Web Java', ' web '); let course = (await list()).find(c => c.code === 'WEB'); const stableId = course.id;
    assert.equal(course.name, 'Web Java'); assert.equal(course.semesterId, semesters[0].id); assert.equal(writes.length, 1); await close();
    await page.reload({ waitUntil: 'networkidle' }); await button('Đóng tài khoản').click(); await academics(); await button('Mở môn Web Java').click();
    await button('Chỉnh sửa môn học').click(); assert.equal(await field('Mã môn học').inputValue(), 'WEB'); assert.equal(await field('Giảng viên').inputValue(), 'Giảng viên A'); await close(); await close();
    step('loading/outage/retry differs from empty; create normalizes code and F5 retains all course fields');
    await button('+ Thêm môn').click(); await field('Tên môn học').fill('Trùng'); await field('Mã môn học').fill('web'); const beforeDuplicate = writes.length;
    await button('Lưu môn học').click(); await text('Mã môn này đã có trong học kỳ đã chọn.').waitFor(); assert.equal(writes.length, beforeDuplicate); await close();
    await create('Web kỳ hai', 'WEB', 2); await close(); await selectSemester(1); await button('Mở môn Web Java').click(); await button('Chỉnh sửa môn học').click();
    await chooseSemester(2); await button('Lưu môn học').click(); await text('Mã môn này đã có trong học kỳ đã chọn.').waitFor(); await field('Mã môn học').fill('WEBX'); await saveEdit();
    assert.equal((await list()).find(c => c.id === stableId).semesterId, semesters[1].id); await close();
    assert.equal(await button('Mở môn Web Java').count(), 1); await selectSemester(1); assert.equal(await button('Mở môn Web Java').count(), 0); await selectSemester(2);
    step('same code allowed in another semester; transfer checks duplicate and preserves the course UUID');
    await button('Mở môn Web Java').click(); await button('Chỉnh sửa môn học').click(); await field('Tên môn học').fill('Bản nháp chưa lưu');
    course = (await list()).find(c => c.id === stableId); await business('PUT', 'courses/' + stableId, { ...courseBody(course), name: 'Bản sửa ở nơi khác' });
    await button('Lưu môn học').click(); await button('Nạp bản môn học mới nhất').waitFor(); assert.equal(await field('Tên môn học').inputValue(), 'Bản nháp chưa lưu'); assert.equal(await button('Lưu môn học').isDisabled(), true);
    await button('Nạp bản môn học mới nhất').click(); await page.waitForFunction(() => document.querySelector('[aria-label="Tên môn học"]')?.value === 'Bản sửa ở nơi khác');
    await field('Tên môn học').fill('Web đã sửa'); await field('Số tín chỉ').fill('4'); await field('Giảng viên').fill('Giảng viên mới'); await field('Phòng học thường dùng').fill('B2.202'); await field('Giới thiệu & mục tiêu môn học').fill('Ghi chú mới'); await tab('Dự kiến').click(); await page.getByRole('radio', { name: 'Màu Xanh dương', exact: true }).click(); await saveEdit();
    course = (await list()).find(c => c.id === stableId); assert.equal(course.credits, 4); assert.equal(course.color, 'blue'); assert.equal(course.status, 'PLANNED'); assert.equal(course.teacher, 'Giảng viên mới'); assert.equal(course.room, 'B2.202'); assert.equal(course.description, 'Ghi chú mới');
    await close(); await text('2 môn học · 7 tín chỉ').waitFor(); step('version conflict keeps draft; explicit latest enables editing; totals and all fields follow server');
    await button('+ Thêm môn').click(); await field('Tên môn học').fill('Môn bị trùng từ API'); await field('Mã môn học').fill('REMOTE');
    await business('POST', 'courses', { semesterId: semesters[1].id, code: 'REMOTE', name: 'Đã có trên server', credits: 2 }, 201);
    await button('Lưu môn học').click(); await button('Kiểm tra lại danh sách môn học').waitFor(); assert.equal(await field('Tên môn học').inputValue(), 'Môn bị trùng từ API');
    await button('Kiểm tra lại danh sách môn học').click(); await button('Mở môn Đã có trên server').waitFor({ state: 'attached' }); await close(); step('backend duplicate 409 retains draft and requires catalogue reconciliation');
    await button('Mở môn Web đã sửa').click(); await addTrialTask('Bài thử liên kết'); await button('Chỉnh sửa môn học').click(); await field('Tên môn học').fill('Web đổi tên'); await saveEdit();
    await close(); await tab('Bài tập').click(); await button('Mở bài tập Bài thử liên kết').click(); await text('Web đổi tên').first().waitFor(); await close(); await academics(); await selectSemester(2); await button('Mở môn Web đổi tên').click();
    await button('Chỉnh sửa môn học').click(); assert.equal(await button('Xóa môn học').isDisabled(), true); await chooseSemester(1); await button('Lưu môn học').click();
    await text('Môn còn bài tập, lịch, điểm hoặc liên kết học lại. Xử lý các mục này trước khi chuyển học kỳ.').waitFor(); assert.equal((await list()).find(c => c.id === stableId).semesterId, semesters[1].id); await close(); await close();
    step('rename updates linked trial task; linked trial data blocks transfer and delete');
    await page.reload({ waitUntil: 'networkidle' }); await button('Đóng tài khoản').click(); await academics(); await selectSemester(2); await button('Mở môn Web đổi tên').click(); await tab('Bài tập').click(); await text('Bài thử liên kết').waitFor(); const persistedTask = (await business('GET', 'assignments')).find(t => t.title === 'Bài thử liên kết'); await business('DELETE', `assignments/${persistedTask.id}?version=${persistedTask.version}`, undefined, 204); await close(); await tab('Trang chủ').click(); await button('Tải lại danh sách bài tập').click(); await academics(); await selectSemester(2); await button('Mở môn Web đổi tên').click();
    await button('Chỉnh sửa môn học').click(); await chooseSemester(1); await saveEdit(); await close(); await button('Mở môn Web đổi tên').waitFor(); step('F5 retains real assignments and courses; transfer succeeds after explicit assignment deletion');
    await page.route('**/api/v1/courses', async route => { if (route.request().method() === 'POST') { await route.fetch(); await route.abort('failed'); } else await route.continue(); });
    await button('+ Thêm môn').click(); await field('Tên môn học').fill('Mất phản hồi'); await field('Mã môn học').fill('LOST'); const beforeLost = writes.length;
    await button('Lưu môn học').click(); await button('Kiểm tra lại danh sách môn học').waitFor(); assert.equal(await button('Lưu môn học').isDisabled(), true); assert.equal(writes.length, beforeLost + 1);
    await page.unrouteAll({ behavior: 'wait' }); await button('Kiểm tra lại danh sách môn học').click(); await close(); await button('Mở môn Mất phản hồi').waitFor(); assert.equal((await list()).filter(c => c.code === 'LOST').length, 1);
    step('lost POST response is never replayed; GET discovers the one committed course');
    let failRead = false;
    await page.route('**/api/v1/courses', async route => { if (route.request().method() === 'POST') { const response = await route.fetch(); failRead = true; await route.fulfill({ response }); } else if (failRead) await route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ code: 'DATABASE_UNAVAILABLE' }) }); else await route.continue(); });
    await create('Lưu thành công GET lỗi', 'CONF'); await text('Lưu thành công GET lỗi').first().waitFor(); await close();
    await page.getByText(/Cần kiểm tra lại danh sách môn học trước khi lưu tiếp/).filter({ visible: true }).waitFor();
    await page.unrouteAll({ behavior: 'wait' }); await button('Tải lại danh sách môn học').click(); await button('Mở môn Lưu thành công GET lỗi').click(); await button('Chỉnh sửa môn học').click();
    const beforeDelete = writes.length; await button('Xóa môn học').click(); assert.equal(writes.length, beforeDelete); await button('Giữ môn học').click(); await button('Xóa môn học').click(); await button('Xác nhận xóa môn học').click(); await field('Tên môn học').waitFor({ state: 'detached' }); assert.equal((await list()).some(c => c.code === 'CONF'), false);
    step('confirmed save survives failed follow-up GET; delete needs confirmation and retains semester');
    await context.setOffline(true); await button('Tải lại danh sách môn học').click(); await page.getByText(/Cần kiểm tra lại danh sách môn học trước khi lưu tiếp.*Không thể kết nối/).filter({ visible: true }).waitFor(); await button('Mở môn Web đổi tên').waitFor();
    await context.setOffline(false); await Promise.all([page.waitForResponse(r => r.url().endsWith('/courses') && r.status() === 200), button('Tải lại danh sách môn học').click()]); step('offline reload retains cached courses and reconnect recovers');
    let releaseOld, sentOld, hold = true; const heldOld = new Promise(resolve => { releaseOld = resolve; }), oldSent = new Promise(resolve => { sentOld = resolve; });
    await page.route('**/api/v1/courses', async route => { if (hold) { hold = false; const response = await route.fetch(); sentOld(); await heldOld; try { await route.fulfill({ response }); } catch {} } else await route.continue(); });
    await button('Tải lại danh sách môn học').click(); await oldSent; await login('B', true); await text('Góc học tập đang chờ bạn').waitFor(); releaseOld(); await page.unrouteAll({ behavior: 'wait' });
    await academics(); await text('Chưa có học kỳ').waitFor(); assert.equal(await button('Mở môn Web đổi tên').count(), 0); await login('A', true); await academics(); await selectSemester(1); await button('Mở môn Web đổi tên').waitFor();
    step('late A response cannot leak to B; returning to A restores real courses');
    let first401 = true, refreshes = 0; const track = r => { if (r.method() === 'POST' && r.url().endsWith('/auth/refresh')) refreshes++; }; page.on('request', track);
    await page.route('**/api/v1/courses', async route => { if (first401) { first401 = false; await route.fulfill({ status: 401, contentType: 'application/problem+json', body: JSON.stringify({ code: 'INVALID_ACCESS_TOKEN' }) }); } else await route.continue(); });
    await Promise.all([page.waitForResponse(r => r.url().endsWith('/courses') && r.status() === 200), button('Tải lại danh sách môn học').click()]); assert.equal(refreshes, 1); await page.unrouteAll({ behavior: 'wait' }); page.off('request', track);
    step('course 401 refreshes once and retries without asking for password');
    await create('Môn đổi bên ngoài', 'EXT'); const external = (await list()).find(c => c.code === 'EXT'); await addTrialTask('Bài phải dọn'); await close();
    const externalTask = (await business('GET', 'assignments')).find(t => t.title === 'Bài phải dọn'); await business('DELETE', `assignments/${externalTask.id}?version=${externalTask.version}`, undefined, 204); await business('DELETE', `courses/${external.id}?version=${external.version}`, undefined, 204); await button('Tải lại danh sách môn học').click();
    await button('Mở môn Môn đổi bên ngoài').waitFor({ state: 'detached' }); await tab('Bài tập').click(); await Promise.all([page.waitForResponse(r => r.url().endsWith('/assignments') && r.status() === 200), button('Tải lại danh sách bài tập').click()]); assert.equal(await button('Mở bài tập Bài phải dọn').count(), 0); await academics(); await selectSemester(1);
    step('external assignment and course deletion reconcile after reload without affecting other courses');
    await button('Mở môn Web đổi tên').click(); await button('Chỉnh sửa môn học').click(); await page.waitForTimeout(500);
    for (const width of [320, 390, 430, 1280]) { await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.screenshot({ path: path.join(out, `course-${width}.png`), animations: 'disabled' }); }
    step('course form fits 320/390/430/1280 without runtime errors'); assert.deepEqual(errors, []);
    const result = { passed: true, checks: cases.length, cases, errors }; fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } catch (error) { await page.screenshot({ path: path.join(out, 'failure.png') }); fs.writeFileSync(path.join(out, 'failure.txt'), await page.locator('body').innerText()); throw error; }
  finally { await context.setOffline(false); await native.dispose(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
