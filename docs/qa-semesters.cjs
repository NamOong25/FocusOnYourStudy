const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {enterDemo,settleAction}=require('./qa-onboarding-helpers.cjs');

(async()=>{
 const out=path.resolve(__dirname,'../.expo/qa-semesters');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 const button=name=>page.getByRole('button',{name,exact:true}).filter({visible:true});
 const radio=name=>page.getByRole('radio',{name,exact:true}).filter({visible:true});
 const tab=name=>page.getByRole('tab',{name,exact:true}).filter({visible:true}).last();
 const choose=name=>button(name).click();
 const save=async()=>{await choose('Lưu học kỳ');await settleAction(page);};
 const year=new Date().getFullYear(),yearLabel=`${year} – ${year+1}`;
 const semester=(term,y=yearLabel)=>`Chọn ${term}, ${y}`;
 try{
  await page.goto(process.argv[2]||'http://localhost:8092',{waitUntil:'domcontentloaded',timeout:60000});
  await choose('Bắt đầu với dữ liệu trống');await page.getByText('Góc học tập đang chờ bạn',{exact:true}).waitFor();
  await choose('Tạo học kỳ đầu tiên');await choose('Tạo học kỳ đầu tiên');
  assert.equal(await page.getByLabel('Tên học kỳ',{exact:true}).count(),0);
  assert.equal(await page.getByLabel('Năm học',{exact:true}).count(),0);
  assert.equal(await radio('Học kỳ 1 — Kỳ chính').getAttribute('aria-checked'),'true');
  assert.equal(await radio('Học kỳ 3 (Hè) — Tùy chọn').getAttribute('aria-checked'),'false');
  await save();await button(semester('Học kỳ 1')).waitFor();
  await choose('+ Thêm');await save();await page.getByRole('alert').filter({hasText:'đã có trong năm học'}).waitFor();
  await radio('Học kỳ 2 — Kỳ chính').click();await save();await button(semester('Học kỳ 2')).waitFor();
  assert.equal(await button(semester('Học kỳ 3 (Hè)')).count(),0);
  await choose('Chỉnh sửa học kỳ');await radio('Học kỳ 1 — Kỳ chính').click();await save();
  await page.getByRole('alert').filter({hasText:'đã có trong năm học'}).waitFor();await choose('Đóng');
  await choose('+ Thêm');await radio('Học kỳ 3 (Hè) — Tùy chọn').click();
  for(const width of [320,390,430,1280]){
   await page.setViewportSize({width,height:900});await page.waitForTimeout(350);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(out,`term-picker-${width}.png`)});
  }
  await save();await button(semester('Học kỳ 3 (Hè)')).waitFor();
  await choose('+ Thêm');await choose('Năm học tiếp theo');await save();
  await button(semester('Học kỳ 1',`${year+1} – ${year+2}`)).waitFor();
  assert.equal(await button(semester('Học kỳ 1')).count(),1);
  assert.equal(await button(semester('Học kỳ 1',`${year+1} – ${year+2}`)).count(),1);
  await choose('Chỉnh sửa học kỳ');await save();await button(semester('Học kỳ 1',`${year+1} – ${year+2}`)).waitFor();
  await tab('Thống kê').click();await tab('Điểm & GPA').click();
  assert.equal(await button(`Xem điểm Học kỳ 1, ${yearLabel}`).count(),1);
  assert.equal(await button(`Xem điểm Học kỳ 1, ${year+1} – ${year+2}`).count(),1);
  await page.reload({waitUntil:'domcontentloaded'});await enterDemo(page);
  await tab('Lịch học').click();await tab('Môn & học kỳ').click();
  await button('Chọn Học kỳ 1, 2026 – 2027').waitFor();
  await button('Chọn Học kỳ 2, 2025 – 2026').waitFor();
  await button('Chọn Học kỳ 2, 2026 – 2027').waitFor();
  assert.equal(await page.getByText(/Học kỳ [456]/).filter({visible:true}).count(),0);
  await choose('Chọn Học kỳ 2, 2025 – 2026');await button('Mở môn Đại số tuyến tính').waitFor();
  await choose('Chọn Học kỳ 2, 2026 – 2027');await page.getByText('Học kỳ mới đang chờ bạn',{exact:true}).waitFor();
  assert.deepEqual(errors,[]);
  const result={passed:true,widths:[320,390,430,1280],checks:['term/year selectors replace text entry','two main terms without a required summer','summer created only on explicit choice','duplicate year+term rejected on create/edit','same term in different years stays distinct','edit own term is allowed','sample terms restart each year','existing courses remain attached','no runtime errors or horizontal overflow'],errors};
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await page.screenshot({path:path.join(out,'last-state.png')});await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
