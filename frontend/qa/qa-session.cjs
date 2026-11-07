const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.QA_APP_URL || 'http://localhost:8092', api = process.env.QA_API_URL || 'http://localhost:8080';
// Registers disposable QA users. Run against an isolated backend schema, never production.
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-session'); fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage(), errors = [], checks = [], refreshRequests = [];
  context.on('page', p => p.on('pageerror', e => errors.push(e.message)));
  page.on('pageerror', e => errors.push(e.message));
  context.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/auth/refresh')) refreshRequests.push(r.url()); });
  const button = (p, name) => p.getByRole('button', { name, exact: true }).filter({ visible: true });
  const name = 'Bạn học kiểm thử A', email = `ui-a-${Date.now()}@example.test`, password = 'FrontendOnlyTest123!';
  const profile = p => p.getByTestId('account-full-name');
  async function openGuest(p) {
    if (await button(p, 'Khám phá dữ liệu mẫu').count()) await button(p, 'Khám phá dữ liệu mẫu').click();
    if (!await button(p, 'Đăng nhập').count()) await button(p, 'Hồ sơ').click();
    await button(p, 'Đăng nhập').click();
  }
  async function login(p) {
    await p.getByLabel('Email tài khoản', { exact: true }).fill(email); await p.getByLabel('Mật khẩu', { exact: true }).fill(password);
    await button(p, 'Đăng nhập').click(); await profile(p).waitFor(); assert.equal(await profile(p).innerText(), name);
  }
  try {
    const registered = await context.request.post(api + '/api/v1/auth/register', { headers: { 'X-Auth-Transport': 'body' },
      data: { email, password, confirmPassword: password, fullName: name, school: 'IUH', major: 'CNTT' } });
    assert.equal(registered.status(), 201);
    await page.goto(base, { waitUntil: 'networkidle' }); await openGuest(page); await login(page);
    const firstCookie = (await context.cookies()).find(c => c.name === 'FOCUS_REFRESH'); assert.ok(firstCookie?.httpOnly);
    await page.reload({ waitUntil: 'networkidle' }); await profile(page).waitFor();
    assert.equal(await profile(page).innerText(), name); assert.equal(refreshRequests.length, 1);
    const nextCookie = (await context.cookies()).find(c => c.name === 'FOCUS_REFRESH'); assert.notEqual(nextCookie.value, firstCookie.value);
    checks.push('F5 restores via rotated HttpOnly cookie');
    const storage = await page.evaluate(() => ({ local: { ...localStorage }, session: { ...sessionStorage } }));
    const stored = JSON.stringify(storage); assert.ok(!stored.includes(password) && !stored.includes(firstCookie.value) && !stored.includes(nextCookie.value) && !stored.includes('accessToken') && !stored.includes(email));
    const marker = Object.entries(storage.local).find(([key]) => key.startsWith('focus-study.session.v1.'));
    assert.ok(marker); assert.deepEqual(Object.keys(JSON.parse(marker[1])).sort(), ['kind', 'userId']); checks.push('browser storage has only nonsecret session marker');
    const second = await context.newPage(); await second.goto(base, { waitUntil: 'networkidle' }); await profile(second).waitFor();
    const count = refreshRequests.length;
    await Promise.all([page.reload({ waitUntil: 'networkidle' }), second.reload({ waitUntil: 'networkidle' })]);
    await Promise.all([profile(page).waitFor(), profile(second).waitFor()]); assert.equal(refreshRequests.length - count, 2);
    checks.push('two tabs restore simultaneously without refresh replay');
    let rejected = false;
    await page.route('**/api/v1/users/me', async route => {
      if (!rejected) { rejected = true; await route.fulfill({ status: 401, contentType: 'application/problem+json', body: JSON.stringify({ code: 'INVALID_ACCESS_TOKEN' }) }); }
      else await route.continue();
    });
    const before401 = refreshRequests.length; await button(page, 'Tải lại hồ sơ').click();
    await page.waitForResponse(r => r.url().endsWith('/users/me') && r.status() === 200); await profile(page).waitFor();
    assert.equal(refreshRequests.length - before401, 1); await page.unroute('**/api/v1/users/me'); checks.push('401 refreshes once and retries profile');
    for (const width of [320, 390, 430, 1280]) {
      await page.setViewportSize({ width, height: 900 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(out, `profile-${width}.png`) });
    }
    checks.push('320/390/430/1280 layouts');
    await page.setViewportSize({ width: 390, height: 844 });
    await button(page, 'Đăng xuất').click(); await button(page, 'Xác nhận đăng xuất').click();
    await page.getByText('Đã đăng xuất.', { exact: true }).filter({ visible: true }).waitFor();
    await profile(second).waitFor({ state: 'detached' }); await second.close();
    assert.equal((await context.cookies()).filter(c => c.name === 'FOCUS_REFRESH').length, 0);
    await page.reload({ waitUntil: 'networkidle' }); assert.equal(await profile(page).count(), 0); checks.push('logout clears cookie, resets UI and signs out other tab');
    await openGuest(page); await login(page);
    await page.route('**/api/v1/auth/csrf', route => route.abort());
    await button(page, 'Đăng xuất').click(); await button(page, 'Xác nhận đăng xuất').click();
    await button(page, 'Hoàn tất đăng xuất').waitFor(); assert.equal(await profile(page).count(), 0);
    const beforeOfflineReload = refreshRequests.length; await page.reload({ waitUntil: 'networkidle' }); await button(page, 'Hoàn tất đăng xuất').waitFor();
    assert.equal(refreshRequests.length, beforeOfflineReload); assert.equal(await profile(page).count(), 0);
    await page.unroute('**/api/v1/auth/csrf'); await button(page, 'Hoàn tất đăng xuất').click();
    await page.getByText('Đã đăng xuất.', { exact: true }).filter({ visible: true }).waitFor(); checks.push('network failure during logout cannot restore account on F5; explicit retry revokes server session');
    await openGuest(page); await login(page);
    let lost = false;
    await page.route('**/api/v1/auth/refresh', async route => { lost = true; const response = await route.fetch(); assert.equal(response.status(), 200); await route.abort(); });
    const beforeLoss = refreshRequests.length; await page.reload({ waitUntil: 'networkidle' });
    await button(page, 'Hoàn tất đăng xuất').waitFor(); assert.equal(lost, true); assert.equal(await profile(page).count(), 0);
    await page.unroute('**/api/v1/auth/refresh'); await page.reload({ waitUntil: 'networkidle' });
    assert.equal(refreshRequests.length - beforeLoss, 1); assert.equal(await profile(page).count(), 0);
    checks.push('lost successful refresh response is not replayed after restart');
    await openGuest(page); await login(page);
    const proof = (await (await context.request.get(api + '/api/v1/auth/csrf')).json()).data;
    const revoked = await context.request.post(api + '/api/v1/auth/logout', { headers: { Origin: base, 'X-Auth-Transport': 'cookie', 'X-XSRF-TOKEN': proof.token }, data: {} });
    assert.equal(revoked.status(), 204);
    await button(page, 'Tải lại hồ sơ').click(); await profile(page).waitFor({ state: 'detached' });
    await page.getByText('Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại.', { exact: true }).filter({ visible: true }).waitFor();
    checks.push('revoked session returns to login without infinite retry'); assert.deepEqual(errors, []);
    const result = { passed: true, checks: checks.length, cases: checks }; fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(result, null, 2)); console.log(JSON.stringify(result));
  } finally { await page.screenshot({ path: path.join(out, 'last-state.png') }); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
