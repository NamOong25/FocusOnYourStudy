const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,request}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {chooseDate,chooseTime}=require('./qa-picker-helpers.cjs');
const base=process.env.QA_APP_URL||'http://localhost:8092',api=process.env.QA_API_URL||'http://localhost:8080';
// Use only a disposable backend schema; this runner creates QA accounts and plans.
(async()=>{
  const out=path.resolve(__dirname,'../.expo/qa-study-api');fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  const context=await browser.newContext({viewport:{width:390,height:900},timezoneId:'Asia/Ho_Chi_Minh'}),native=await request.newContext(),page=await context.newPage();
  const errors=[],cases=[],writes=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(90000);
  page.on('request',r=>{if(r.method()!=='GET'&&new URL(r.url()).pathname.startsWith('/api/v1/study-sessions'))writes.push(r.method());});
  const button=(name,p=page)=>p.getByRole('button',{name,exact:true}).filter({visible:true});
  const tab=(name,p=page)=>p.getByRole('tab',{name,exact:true}).filter({visible:true}).last();
  const field=name=>page.getByLabel(name,{exact:true}),text=value=>page.getByText(value,{exact:true}).filter({visible:true});
  const step=name=>{cases.push(name);console.log('CHECK: '+name);};
  const stamp=Date.now(),password='FrontendOnlyTest123!',users={A:{email:`study-a-${stamp}@example.test`,fullName:'Tự học tài khoản A'},B:{email:`study-b-${stamp}@example.test`,fullName:'Tự học tài khoản B'}},tokens={};
  async function business(method,route,data,expected=200,who='A'){
    const response=await native.fetch(api+'/api/v1/'+route,{method,headers:{Authorization:'Bearer '+tokens[who]},data});
    assert.equal(response.status(),expected,method+' '+route+' '+await response.text());return expected===204?undefined:(await response.json()).data;
  }
  const list=()=>business('GET','study-sessions');
  const body=s=>Object.fromEntries(['courseId','assignmentId','title','startsAt','timeZone','durationMinutes','status','notes','version'].map(k=>[k,s[k]]));
  async function login(who,switched=false){
    if(switched){await button('Hồ sơ').click();await button('Đăng nhập tài khoản khác').click();}
    else {if(await button('Khám phá dữ liệu mẫu').count())await button('Khám phá dữ liệu mẫu').click();await button('Hồ sơ').click();await button('Đăng nhập').click();}
    await field('Email tài khoản').fill(users[who].email);await field('Mật khẩu').fill(password);await button('Đăng nhập').click();await page.getByTestId('account-full-name').waitFor();await button('Đóng tài khoản').click();
  }
  const studies=async()=>{await tab('Lịch học').click();await tab('Tự học').click();await button('Lên kế hoạch mới').waitFor();};
  const close=async()=>{await button('Quay lại').last().click();if(await button('Bỏ thay đổi').count())await button('Bỏ thay đổi').click();};
  const reload=async()=>{await Promise.all([page.waitForResponse(r=>r.url().endsWith('/study-sessions')&&r.status()===200),button('Tải lại danh sách tự học').click()]);};
  const viewDay=async(p=page)=>{await button('Đổi ngày xem tự học',p).click();await chooseDate(p,'Ngày xem tự học','2026-11-06');await button('Xem ngày đã chọn',p).click();};
  async function fill(title,time='17:00',linked=true){
    await field('Nội dung tự học').fill(title);await page.getByRole('radio',{name:'Java Web · JAVA',exact:true}).click();
    await page.getByRole('radio',{name:'Liên kết: '+(linked?'Báo cáo Java':'Tự học độc lập'),exact:true}).click();
    await chooseDate(page,'Ngày học','2026-11-06');await chooseTime(page,'Bắt đầu',time);await field('Ghi chú buổi học').fill('Ghi chú đã lưu');
  }
  async function create(title,time='17:00',linked=true){await button('Lên kế hoạch mới').click();await fill(title,time,linked);await button('Lưu buổi tự học').click();await field('Nội dung tự học').waitFor({state:'detached'});}
  const open=title=>button('Xem buổi '+title).click();
  const edit=async title=>{await open(title);await button('Chỉnh sửa buổi tự học').click();};
  try{
    for(const [who,user] of Object.entries(users)){
      let r=await native.post(api+'/api/v1/auth/register',{headers:{'X-Auth-Transport':'body'},data:{...user,password,confirmPassword:password,school:'IUH',major:'CNTT'}});assert.equal(r.status(),201);
      r=await native.post(api+'/api/v1/auth/login',{headers:{'X-Auth-Transport':'body'},data:{email:user.email,password}});assert.equal(r.status(),200);tokens[who]=(await r.json()).data.accessToken;
    }
    const sem=await business('POST','semesters',{term:1,startYear:2026,status:'CURRENT'},201);
    const course=await business('POST','courses',{semesterId:sem.id,code:'JAVA',name:'Java Web',credits:3},201);
    const task=await business('POST','assignments',{courseId:course.id,title:'Báo cáo Java',dueAt:'2026-11-06T11:45:00Z'},201);
    let release;const held=new Promise(r=>release=r);await page.route('**/api/v1/study-sessions',async route=>{await held;await route.fulfill({status:503,contentType:'application/problem+json',body:JSON.stringify({code:'DATABASE_UNAVAILABLE'})});});
    await page.goto(base,{waitUntil:'networkidle'});await login('A');await text('Đang tải buổi tự học').waitFor();release();await text('Chưa tải được buổi tự học').waitFor();await page.unrouteAll({behavior:'wait'});await button('Thử tải lại buổi tự học').click();await studies();await text('Một khoảng trống cho bạn').waitFor();
    step('initial loading/outage/retry distinguished from confirmed empty');
    await create('Đọc báo cáo');await create('Rà soát báo cáo','18:00');let rows=await list();assert.equal(rows.length,2);assert.equal(rows.find(s=>s.title==='Đọc báo cáo').startsAt,'2026-11-06T10:00:00Z');assert.equal(rows[0].assignmentId,task.id);assert.equal(writes.length,2);
    await page.reload({waitUntil:'networkidle'});await button('Đóng tài khoản').click();await studies();await viewDay();await button('Xem buổi Đọc báo cáo').waitFor();await tab('Theo tuần').click();await button('Xem buổi Rà soát báo cáo').waitFor();await edit('Đọc báo cáo');assert.equal(await field('Ghi chú buổi học').inputValue(),'Ghi chú đã lưu');await close();await close();
    step('two plans for one assignment persist after F5 with correct UTC; day/week/detail share saved data');
    await tab('Bài tập').click();await button('Mở bài tập Báo cáo Java').click();await tab('Buổi học').click();await button('Xem buổi Đọc báo cáo').waitFor();await close();await tab('Tự học').click();await viewDay();
    await open('Đọc báo cáo');await button('Đánh dấu buổi học đã xong').click();await text('Đã lưu thay đổi buổi tự học vào tài khoản.').waitFor();assert.equal((await list()).find(s=>s.title==='Đọc báo cáo').status,'COMPLETED');assert.equal((await business('GET','assignments'))[0].status,'TODO');await close();await tab('Tập trung').click();await text('0 / 4 phiên').waitFor();await studies();await viewDay();
    step('manual completion persists without completing the assignment or inventing Pomodoro credit');
    const today=await page.evaluate(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;});
    await business('POST','study-sessions',{courseId:course.id,assignmentId:null,title:'Hôm nay từ backend',startsAt:today+'T05:00:00Z',timeZone:'Asia/Ho_Chi_Minh',durationMinutes:25,status:'PLANNED',notes:''},201);await reload();await tab('Trang chủ').click();await button('Tập trung: Hôm nay từ backend').waitFor();
    await tab('Trợ lý AI').click();await button('Tìm lịch trống').click();await button('Tạo đề xuất mẫu').click();await button('Chấp nhận kế hoạch mẫu').waitFor();assert.equal(await button('Chấp nhận kế hoạch mẫu').isDisabled(),true);const beforeAi=writes.length;await button('Tạo buổi tại Tự học').click();await button('Lên kế hoạch mới').waitFor();assert.equal(writes.length,beforeAi);await viewDay();
    step('Dashboard reads persisted plans; authenticated AI preview cannot perform fake RAM saves');
    await edit('Rà soát báo cáo');await field('Nội dung tự học').fill('Nháp đang sửa');let s=(await list()).find(s=>s.title==='Rà soát báo cáo');await business('PUT','study-sessions/'+s.id,{...body(s),title:'Bản sửa nơi khác'});await button('Lưu buổi tự học').click();await button('Nạp bản buổi học mới nhất').waitFor();assert.equal(await field('Nội dung tự học').inputValue(),'Nháp đang sửa');assert.equal(await button('Lưu buổi tự học').isDisabled(),true);await button('Nạp bản buổi học mới nhất').click();await page.waitForFunction(()=>document.querySelector('[aria-label="Nội dung tự học"]')?.value==='Bản sửa nơi khác');await field('Nội dung tự học').fill('Bài đã sửa');await button('Lưu buổi tự học').click();await field('Nội dung tự học').waitFor({state:'detached'});await close();
    step('version conflict retains draft; explicit rebase loads current version before save');
    await button('Lên kế hoạch mới').click();await fill('Trùng lịch','17:30',false);const beforeOverlap=writes.length;await button('Lưu buổi tự học').click();await text('Khung giờ này đang trùng một buổi tự học đã lưu.').waitFor();assert.equal(writes.length,beforeOverlap);await chooseTime(page,'Bắt đầu','19:00');await page.getByRole('radio',{name:'Liên kết: Báo cáo Java',exact:true}).click();await button('Lưu buổi tự học').click();await page.getByText(/Buổi học kết thúc sau hạn nộp bài/).waitFor();assert.equal(writes.length,beforeOverlap);await close();
    step('local overlap includes completed sessions; linked plans cannot extend past due time');
    // A remote plan absent from the cache still triggers backend conflict and a manual read.
    await button('Lên kế hoạch mới').click();await fill('Trùng nơi khác','20:00',false);const remote=await business('POST','study-sessions',{courseId:course.id,assignmentId:null,title:'Lịch nơi khác',startsAt:'2026-11-06T13:00:00Z',timeZone:'Asia/Ho_Chi_Minh',durationMinutes:45,status:'PLANNED',notes:''},201);await button('Lưu buổi tự học').click();await button('Kiểm tra lại danh sách tự học').waitFor();assert.equal(await field('Nội dung tự học').inputValue(),'Trùng nơi khác');await button('Kiểm tra lại danh sách tự học').click();await button('Lưu buổi tự học').isEnabled();await close();
    step('backend catches remote overlap while UI preserves draft and requests refreshed list');
    await page.route('**/api/v1/study-sessions',async route=>{if(route.request().method()==='POST'){await route.fetch();await route.abort('failed');}else await route.continue();});
    await button('Lên kế hoạch mới').click();await fill('Mất phản hồi','21:00',false);const beforeLost=writes.length;await button('Lưu buổi tự học').click();await button('Kiểm tra lại danh sách tự học').waitFor();assert.equal(await field('Nội dung tự học').inputValue(),'Mất phản hồi');assert.equal(writes.length,beforeLost+1);await page.unrouteAll({behavior:'wait'});await button('Kiểm tra lại danh sách tự học').click();await close();await button('Xem buổi Mất phản hồi').waitFor();assert.equal((await list()).filter(s=>s.title==='Mất phản hồi').length,1);
    step('lost POST response is not replayed; checking the list discovers the committed row');
    let failRead=false;await page.route('**/api/v1/study-sessions',async route=>{if(route.request().method()==='POST'){const response=await route.fetch();failRead=true;await route.fulfill({response});}else if(failRead)await route.fulfill({status:503,contentType:'application/problem+json',body:JSON.stringify({code:'DATABASE_UNAVAILABLE'})});else await route.continue();});
    await create('Đã lưu GET lỗi','22:00',false);await button('Xem buổi Đã lưu GET lỗi').waitFor();await page.getByText(/Đang giữ danh sách buổi học đã tải gần nhất/).filter({visible:true}).waitFor();await page.unrouteAll({behavior:'wait'});await reload();
    await context.setOffline(true);await button('Tải lại danh sách tự học').click();await page.getByText(/Đang giữ danh sách.*Không thể kết nối/).filter({visible:true}).waitFor();await button('Xem buổi Đã lưu GET lỗi').waitFor();await context.setOffline(false);await reload();
    step('confirmed save survives follow-up GET failure; offline reload keeps cache and recovers');
    // Deleting a parent through UI must read detached children and new versions, not edit RAM.
    const previous=(await list()).find(s=>s.title==='Bài đã sửa');await tab('Bài tập').click();await button('Mở bài tập Báo cáo Java').click();await button('Chỉnh sửa bài tập').click();await button('Xóa bài tập').click();await button('Xác nhận xóa bài tập').click();await field('Tên bài tập').waitFor({state:'detached'});await tab('Tự học').click();await viewDay();await edit('Bài đã sửa');await page.getByRole('radio',{name:'Liên kết: Tự học độc lập',exact:true}).waitFor();s=(await list()).find(s=>s.id===previous.id);assert.equal(s.assignmentId,null);assert.equal(s.version,previous.version+1);assert.equal(s.title,previous.title);await field('Ghi chú buổi học').fill('Sau khi gỡ bài');await button('Lưu buổi tự học').click();await field('Nội dung tự học').waitFor({state:'detached'});await close();
    step('assignment deletion preserves plans, detaches links and refreshes versions for immediate editing');
    // Timer interaction remains local and cannot silently mutate a persisted plan.
    const beforeTimer=writes.length;await button('Tập trung: Bài đã sửa').click();await button('Bắt đầu').click();await text('ĐANG HỌC SÂU').waitFor();assert.equal(writes.length,beforeTimer);assert.equal((await list()).find(s=>s.title==='Bài đã sửa').status,'PLANNED');await button('Tạm dừng').click();await studies();await viewDay();
    step('starting Pomodoro leaves persisted status/version untouched');
    await edit('Lịch nơi khác');await business('DELETE',`study-sessions/${remote.id}?version=${remote.version}`,undefined,204);await field('Nội dung tự học').fill('Không phục hồi');await button('Lưu buổi tự học').click();await button('Nạp bản buổi học mới nhất').waitFor();await button('Nạp bản buổi học mới nhất').click();await text('Buổi học đã bị xóa. Đóng biểu mẫu để xem danh sách mới.').waitFor();await close();await button('Đóng chi tiết buổi học').click();
    step('remote delete cannot be resurrected by a stale form');
    await edit('Đã lưu GET lỗi');const beforeDelete=writes.length;await button('Xóa buổi tự học').click();assert.equal(writes.length,beforeDelete);await button('Giữ buổi tự học').click();await button('Xóa buổi tự học').click();await button('Xác nhận xóa buổi tự học').click();await field('Nội dung tự học').waitFor({state:'detached'});assert.equal((await list()).some(s=>s.title==='Đã lưu GET lỗi'),false);
    step('confirmed versioned delete removes only the selected plan');
    let releaseOld,sentOld,first=true;const heldOld=new Promise(r=>releaseOld=r),sent=new Promise(r=>sentOld=r);await page.route('**/api/v1/study-sessions',async route=>{if(first){first=false;const response=await route.fetch();sentOld();await heldOld;try{await route.fulfill({response});}catch{}}else await route.continue();});
    await button('Tải lại danh sách tự học').click();await sent;await login('B',true);await text('Góc học tập đang chờ bạn').waitFor();releaseOld();await page.unrouteAll({behavior:'wait'});await studies();await text('Một khoảng trống cho bạn').waitFor();assert.equal(await button('Xem buổi Mất phản hồi').count(),0);await login('A',true);await studies();await viewDay();await button('Xem buổi Mất phản hồi').waitFor();
    step('late A response cannot leak to B; returning to A restores its saved plans');
    const second=await context.newPage();await second.goto(base,{waitUntil:'networkidle'});await button('Đóng tài khoản',second).click();await tab('Lịch học',second).click();await tab('Tự học',second).click();await viewDay(second);await button('Xem buổi Mất phản hồi',second).waitFor();await second.close();
    step('second tab restores session and saved plans without another login');
    await button('Lên kế hoạch mới').click();await field('Nội dung tự học').fill('Kiểm tra bố cục');
    for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(out,`study-${width}.png`),animations:'disabled'});}
    step('study form fits 320/390/430/1280 without uncaught browser errors');assert.deepEqual(errors,[]);
    const result={passed:true,checks:cases.length,cases,errors};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  }catch(e){await page.screenshot({path:path.join(out,'failure.png')});fs.writeFileSync(path.join(out,'failure.txt'),await page.locator('body').innerText());throw e;}
  finally{await context.setOffline(false);await native.dispose();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
