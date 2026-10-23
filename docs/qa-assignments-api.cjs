const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,request}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {chooseDate,chooseTime}=require('./qa-picker-helpers.cjs');
const base=process.env.QA_APP_URL||'http://localhost:8092',api=process.env.QA_API_URL||'http://localhost:8080';
// Creates QA accounts only: point at a disposable backend schema, never the application schema.
(async()=>{
  const out=path.resolve(__dirname,'../.expo/qa-assignments-api');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  const context=await browser.newContext({viewport:{width:390,height:900},timezoneId:'Asia/Ho_Chi_Minh'}),native=await request.newContext(),page=await context.newPage();
  const errors=[],cases=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);
  page.on('request',r=>{if(r.method()!=='GET'&&new URL(r.url()).pathname.startsWith('/api/v1/assignments'))writes.push(r.method());});
  const button=(name,p=page)=>p.getByRole('button',{name,exact:true}).filter({visible:true});
  const tab=(name,p=page)=>p.getByRole('tab',{name,exact:true}).filter({visible:true}).last();
  const field=name=>page.getByLabel(name,{exact:true}),text=value=>page.getByText(value,{exact:true}).filter({visible:true});
  const step=name=>{cases.push(name);console.log('CHECK: '+name);};
  const stamp=Date.now(),password='FrontendOnlyTest123!',users={A:{email:`assign-a-${stamp}@example.test`,fullName:'Bài tập tài khoản A'},B:{email:`assign-b-${stamp}@example.test`,fullName:'Bài tập tài khoản B'}},tokens={};
  async function business(method,route,data,expected=200,who='A'){
    const response=await native.fetch(api+'/api/v1/'+route,{method,headers:{Authorization:'Bearer '+tokens[who]},data});
    assert.equal(response.status(),expected,method+' '+route+' '+await response.text());return expected===204?undefined:(await response.json()).data;
  }
  const list=()=>business('GET','assignments');
  const body=t=>Object.fromEntries(['courseId','title','dueAt','priority','status','notes','version'].map(k=>[k,t[k]]));
  async function login(who,switched=false){
    if(switched){await button('Hồ sơ').click();await button('Đăng nhập tài khoản khác').click();}
    else {if(await button('Khám phá dữ liệu mẫu').count())await button('Khám phá dữ liệu mẫu').click();await button('Hồ sơ').click();await button('Đăng nhập').click();}
    await field('Email tài khoản').fill(users[who].email);await field('Mật khẩu').fill(password);await button('Đăng nhập').click();await page.getByTestId('account-full-name').waitFor();await button('Đóng tài khoản').click();
  }
  const assignments=async()=>{await tab('Lịch học').click();await tab('Bài tập').click();await button('Thêm bài tập mới').waitFor();};
  const close=async()=>{await button('Quay lại').last().click();if(await button('Bỏ thay đổi').count())await button('Bỏ thay đổi').click();};
  const reload=async()=>{await Promise.all([page.waitForResponse(r=>r.url().endsWith('/assignments')&&r.status()===200),button('Tải lại danh sách bài tập').click()]);await button('Tải lại danh sách bài tập').isEnabled();};
  async function create(title,course='Java Web · JAVA'){
    await button('Thêm bài tập mới').click();await field('Tên bài tập').fill(title);await page.getByRole('radio',{name:course,exact:true}).click();
    await chooseDate(page,'Hạn nộp','2026-11-06');await chooseTime(page,'Giờ hạn nộp','18:45');await field('Ghi chú').fill('Ghi chú đã lưu');await tab('Cao').click();
    await button('Tạo bài tập').click();await field('Tên bài tập').waitFor({state:'detached'});
  }
  const open=title=>button('Mở bài tập '+title).click();
  const edit=async title=>{await open(title);await button('Chỉnh sửa bài tập').click();};
  try{
    for(const [who,user] of Object.entries(users)){
      let r=await native.post(api+'/api/v1/auth/register',{headers:{'X-Auth-Transport':'body'},data:{...user,password,confirmPassword:password,school:'IUH',major:'CNTT'}});assert.equal(r.status(),201);
      r=await native.post(api+'/api/v1/auth/login',{headers:{'X-Auth-Transport':'body'},data:{email:user.email,password}});assert.equal(r.status(),200);tokens[who]=(await r.json()).data.accessToken;
    }
    const sem1=await business('POST','semesters',{term:1,startYear:2026,status:'CURRENT'},201),sem2=await business('POST','semesters',{term:2,startYear:2026,status:'UPCOMING'},201);
    const c1=await business('POST','courses',{semesterId:sem1.id,code:'JAVA',name:'Java Web',credits:3},201),c2=await business('POST','courses',{semesterId:sem2.id,code:'REACT',name:'React',credits:3},201);
    let release;const held=new Promise(resolve=>release=resolve);await page.route('**/api/v1/assignments',async route=>{await held;await route.fulfill({status:503,contentType:'application/problem+json',body:JSON.stringify({code:'DATABASE_UNAVAILABLE'})});});
    await page.goto(base,{waitUntil:'networkidle'});await login('A');await text('Đang tải bài tập').waitFor();assert.equal(await text('Chưa có bài tập').count(),0);release();await text('Chưa tải được bài tập').waitFor();await page.unrouteAll({behavior:'wait'});await button('Thử tải lại bài tập').click();await assignments();await text('Chưa có bài tập').waitFor();
    step('initial loading/outage/retry distinguished from an empty account');
    await create('Báo cáo Java');let task=(await list()).find(t=>t.title==='Báo cáo Java');assert.equal(task.courseId,c1.id);assert.equal(task.dueAt,'2026-11-06T11:45:00Z');assert.equal(task.notes,'Ghi chú đã lưu');assert.equal(task.priority,'HIGH');assert.equal(writes.length,1);
    await page.reload({waitUntil:'networkidle'});await button('Đóng tài khoản').click();await assignments();await edit('Báo cáo Java');assert.equal(await field('Ghi chú').inputValue(),'Ghi chú đã lưu');await button('Chọn giờ hạn nộp').getByText('18:45').waitFor();await close();await close();
    step('create uses server UUID and correct UTC; F5 restores date/time, notes and priority');
    await open('Báo cáo Java');await tab('Hoàn thành').click();await text('Đã lưu thay đổi bài tập vào tài khoản.').waitFor();assert.equal((await list())[0].status,'COMPLETED');await close();await tab('Trang chủ').click();await page.getByTestId('dashboard-task-count').waitFor();assert.equal(await page.getByTestId('dashboard-task-count').innerText(),'1/1 bài tập');assert.equal(await page.getByTestId('dashboard-task-percent').innerText(),'100%');
    step('quick status awaits confirmed save; Dashboard uses same completed-task catalogue');
    await assignments();await edit('Báo cáo Java');await field('Tên bài tập').fill('Bản nháp chưa lưu');task=(await list())[0];await business('PUT','assignments/'+task.id,{...body(task),title:'Bản sửa nơi khác'});
    await button('Lưu thay đổi').click();await button('Nạp bản bài tập mới nhất').waitFor();assert.equal(await field('Tên bài tập').inputValue(),'Bản nháp chưa lưu');assert.equal(await button('Lưu thay đổi').isDisabled(),true);await button('Nạp bản bài tập mới nhất').click();await page.waitForFunction(()=>document.querySelector('[aria-label="Tên bài tập"]')?.value==='Bản sửa nơi khác');await field('Tên bài tập').fill('Bài đã sửa');await button('Lưu thay đổi').click();await field('Tên bài tập').waitFor({state:'detached'});await close();
    step('concurrent edit preserves dirty draft and requires explicit latest version');
    await page.route('**/api/v1/assignments',async route=>{if(route.request().method()==='POST'){await route.fetch();await route.abort('failed');}else await route.continue();});
    const beforeLost=writes.length;await button('Thêm bài tập mới').click();await field('Tên bài tập').fill('Mất phản hồi');await button('Tạo bài tập').click();await button('Kiểm tra lại danh sách bài tập').waitFor();assert.equal(await button('Tạo bài tập').isDisabled(),true);assert.equal(writes.length,beforeLost+1);assert.equal(await field('Tên bài tập').inputValue(),'Mất phản hồi');await page.unrouteAll({behavior:'wait'});await button('Kiểm tra lại danh sách bài tập').click();await close();await button('Mở bài tập Mất phản hồi').waitFor();assert.equal((await list()).filter(t=>t.title==='Mất phản hồi').length,1);
    step('lost POST response is not replayed; read discovers exactly one committed assignment');
    let failRead=false;await page.route('**/api/v1/assignments',async route=>{if(route.request().method()==='POST'){const response=await route.fetch();failRead=true;await route.fulfill({response});}else if(failRead)await route.fulfill({status:503,contentType:'application/problem+json',body:JSON.stringify({code:'DATABASE_UNAVAILABLE'})});else await route.continue();});
    await create('Lưu được GET lỗi');await button('Mở bài tập Lưu được GET lỗi').waitFor();await page.getByText(/Đang hiển thị dữ liệu lần tải thành công gần nhất/).filter({visible:true}).waitFor();await page.unrouteAll({behavior:'wait'});await reload();
    step('confirmed save remains successful when follow-up list fails; cached response retained');
    await context.setOffline(true);await button('Tải lại danh sách bài tập').click();await page.getByText(/Đang hiển thị.*Không thể kết nối/).filter({visible:true}).waitFor();await button('Mở bài tập Bài đã sửa').waitFor();await context.setOffline(false);await reload();
    step('offline reload retains confirmed catalogue and reconnect recovers');
    await button('Thêm bài tập mới').click();await field('Tên bài tập').fill('Chuyển môn');await page.getByRole('radio',{name:'React · REACT',exact:true}).click();await button('Tạo bài tập').click();await field('Tên bài tập').waitFor({state:'detached'});
    assert.equal(await button('Mở bài tập Chuyển môn').count(),0);await button('Học kỳ bài tập: Học kỳ 1 · 2026 – 2027').click();await button('Bài tập Học kỳ 2 · 2026 – 2027').click();await button('Mở bài tập Chuyển môn').waitFor();await edit('Chuyển môn');await page.getByRole('radio',{name:'Java Web · JAVA',exact:true}).click();await button('Lưu thay đổi').click();await field('Tên bài tập').waitFor({state:'detached'});await close();await button('Học kỳ bài tập: Học kỳ 2 · 2026 – 2027').click();await button('Bài tập tất cả học kỳ').click();await field('Tìm bài tập').fill('java');await button('Mở bài tập Chuyển môn').waitFor();await field('Tìm bài tập').fill('không có kết quả');await text('Không tìm thấy bài tập phù hợp').waitFor();await button('Xóa tìm kiếm và bộ lọc').click();
    step('semester selection and search use shared course links; reassignment preserves task identity');
    const now=Date.now();await business('POST','assignments',{courseId:c1.id,title:'Bài quá hạn',dueAt:new Date(now-3600000).toISOString()},201);await business('POST','assignments',{courseId:c1.id,title:'Bài sắp hạn',dueAt:new Date(now+3600000).toISOString()},201);await reload();await tab('Lọc hạn nộp: Quá hạn').click();await button('Mở bài tập Bài quá hạn').waitFor();assert.equal(await button('Mở bài tập Bài sắp hạn').count(),0);await tab('Lọc hạn nộp: Sắp hạn').click();await button('Mở bài tập Bài sắp hạn').waitFor();assert.equal(await button('Mở bài tập Bài quá hạn').count(),0);await tab('Lọc hạn nộp: Tất cả').click();
    step('deadline filters combine with real data and use current local time');
    await open('Lưu được GET lỗi');await button('Lên lịch học cho bài này').click();await field('Nội dung tự học').fill('Buổi học giữ lại');await chooseDate(page,'Ngày học','2026-11-06');await chooseTime(page,'Bắt đầu','17:00');await button('Lưu buổi tự học').click();await field('Nội dung tự học').waitFor({state:'detached'});await button('Chỉnh sửa bài tập').click();
    const beforeGuard=writes.length;await chooseTime(page,'Giờ hạn nộp','16:00');await button('Lưu thay đổi').click();await page.getByText(/Hạn nộp mới.*đang trước lúc kết thúc buổi/).waitFor();assert.equal(writes.length,beforeGuard);
    await chooseTime(page,'Giờ hạn nộp','18:45');await page.getByRole('radio',{name:'React · REACT',exact:true}).click();await button('Lưu thay đổi').click();await text('Bài tập đang có buổi tự học liên quan. Gỡ liên kết các buổi trước khi đổi môn.').waitFor();assert.equal(writes.length,beforeGuard);await close();await close();
    task=(await list()).find(t=>t.title==='Lưu được GET lỗi');await business('PUT','assignments/'+task.id,{...body(task),dueAt:'2026-11-06T09:00:00Z'},409);await business('DELETE',`assignments/${task.id}?version=${task.version}`,undefined,204);await reload();await tab('Tự học').click();await button('Đổi ngày xem tự học').click();await chooseDate(page,'Ngày xem tự học','2026-11-06');await button('Xem ngày đã chọn').click();await button('Xem buổi Buổi học giữ lại').waitFor();await page.getByText('Tự học độc lập · 45 phút dự kiến',{exact:true}).waitFor();await assignments();
    step('persisted study blocks invalid parent edits at UI/backend; parent delete preserves independent study');
    let unauthorized=true,refreshCount=0;const track=r=>{if(r.method()==='POST'&&r.url().endsWith('/auth/refresh'))refreshCount++;};page.on('request',track);
    await page.route('**/api/v1/assignments',async route=>{if(unauthorized){unauthorized=false;await route.fulfill({status:401,contentType:'application/problem+json',body:JSON.stringify({code:'INVALID_ACCESS_TOKEN'})});}else await route.continue();});await reload();await page.unrouteAll({behavior:'wait'});page.off('request',track);assert.equal(refreshCount,1);
    step('assignment 401 renews session once and reloads without a password prompt');
    await edit('Bài đã sửa');const beforeDelete=writes.length;await button('Xóa bài tập').click();assert.equal(writes.length,beforeDelete);await button('Giữ bài tập').click();await button('Xóa bài tập').click();await button('Xác nhận xóa bài tập').click();await field('Tên bài tập').waitFor({state:'detached'});assert.equal((await list()).some(t=>t.title==='Bài đã sửa'),false);
    step('delete requires explicit confirmation and removes the persisted assignment');
    await edit('Chuyển môn');task=(await list()).find(t=>t.title==='Chuyển môn');await business('DELETE',`assignments/${task.id}?version=${task.version}`,undefined,204);await field('Tên bài tập').fill('Không được phục hồi');await button('Lưu thay đổi').click();await button('Nạp bản bài tập mới nhất').waitFor();await button('Nạp bản bài tập mới nhất').click();await text('Bài tập đã bị xóa. Đóng biểu mẫu để xem danh sách mới.').waitFor();await close();await button('Đóng chi tiết bài tập').click();
    step('remote delete cannot be resurrected from a stale editor');
    // A read arriving after account switch must not populate B's workspace.
    let releaseOld,sentOld,first=true;const heldOld=new Promise(r=>releaseOld=r),sent=new Promise(r=>sentOld=r);await page.route('**/api/v1/assignments',async route=>{if(first){first=false;const response=await route.fetch();sentOld();await heldOld;try{await route.fulfill({response});}catch{}}else await route.continue();});
    await button('Tải lại danh sách bài tập').click();await sent;await login('B',true);await text('Góc học tập đang chờ bạn').waitFor();releaseOld();await page.unrouteAll({behavior:'wait'});await assignments();await text('Chưa có bài tập').waitFor();assert.equal(await button('Mở bài tập Mất phản hồi').count(),0);await login('A',true);await assignments();await button('Mở bài tập Mất phản hồi').waitFor();
    step('late A response cannot leak to B; returning to A restores persisted assignments');
    // Same-browser tabs share session cookies; a second tab restores A without another login.
    const second=await context.newPage();await second.goto(base,{waitUntil:'networkidle'});await page.getByTestId('account-full-name').waitFor({state:'detached'});await button('Đóng tài khoản',second).click();await tab('Lịch học',second).click();await tab('Bài tập',second).click();await button('Mở bài tập Mất phản hồi',second).waitFor();await second.close();
    step('second tab restores the session and persisted assignment catalogue');
    await button('Thêm bài tập mới').click();await field('Tên bài tập').fill('Kiểm tra bố cục');await page.waitForTimeout(400);
    for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,`assignment-${width}.png`),animations:'disabled'});}
    step('assignment form fits 320/390/430/1280; no uncaught browser errors');assert.deepEqual(errors,[]);
    const result={passed:true,checks:cases.length,cases,errors};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }catch(e){await page.screenshot({path:path.join(out,'failure.png')});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());throw e;}
  finally{await context.setOffline(false);await native.dispose();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
