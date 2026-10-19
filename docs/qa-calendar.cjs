const fs = require('node:fs'); const path = require('node:path'); const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const out = path.resolve(__dirname, '../.expo/qa-calendar'); fs.mkdirSync(out,{recursive:true});
  const browser = await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined});
  const page = await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh'}); const errors=[];
  page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  const button = name=>page.getByRole('button',{name,exact:true}); const tab=name=>page.getByRole('tab',{name,exact:true}).last(); const close=()=>button('Đóng').click();
  const shot=name=>page.screenshot({path:path.join(out,`${name}.png`)});
  try {
    await page.goto(process.argv[2]||'http://localhost:8092',{waitUntil:'networkidle'});
    const dates = await page.evaluate(()=>{ const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; const now=new Date(); const plus=n=>{const d=new Date(now);d.setDate(d.getDate()+n);return key(d);}; return {today:key(now),next:plus(14),exam:plus(6),weekday:now.getDay(),extra:(now.getDay()+2)%7}; });
    await tab('Lịch học').click(); await button('Thêm lịch học').click();
    const names=['CN','T2','T3','T4','T5','T6','T7']; await page.getByRole('checkbox',{name:`Học vào ${names[dates.extra]}`,exact:true}).click();
    await page.getByLabel('Áp dụng từ (YYYY-MM-DD)',{exact:true}).fill(dates.today); await page.getByLabel('Áp dụng đến (YYYY-MM-DD)',{exact:true}).fill(dates.next);
    await page.getByLabel('Bắt đầu (HH:mm)',{exact:true}).fill('08:30'); await page.getByLabel('Kết thúc (HH:mm)',{exact:true}).fill('09:00'); await button('Lưu lịch học').click();
    await page.getByRole('alert').filter({hasText:'Khung giờ bị trùng lịch'}).waitFor(); await page.getByText('Ca học · Lập trình Hướng đối tượng',{exact:true}).waitFor(); await shot('series-conflict');
    await page.getByLabel('Bắt đầu (HH:mm)',{exact:true}).fill('17:00'); await page.getByLabel('Kết thúc (HH:mm)',{exact:true}).fill('17:45'); await button('Lưu lịch học').click();
    await button('Xem buổi học Cấu trúc dữ liệu & Giải thuật').last().click(); await button('Sửa cả chuỗi').hover(); await shot('class-detail');
    await button('Đổi giờ hoặc phòng buổi này').click(); await page.getByLabel('Bắt đầu mới (HH:mm)',{exact:true}).fill('19:00'); await page.getByLabel('Kết thúc mới (HH:mm)',{exact:true}).fill('19:45'); await page.getByLabel('Phòng học buổi này',{exact:true}).fill('Lab Đổi 2'); await button('Lưu thay đổi buổi này').click();
    await page.getByText('Đã điều chỉnh buổi này',{exact:true}).waitFor(); await close(); await button('Khoảng sau').click();
    await button('Xem buổi học Cấu trúc dữ liệu & Giải thuật').last().click(); await page.getByText('17:00 – 17:45',{exact:true}).first().waitFor(); assert.equal(await page.getByText('Lab Đổi 2',{exact:true}).count(),0); await close();
    await button('Về hôm nay').click(); await button('Xem buổi học Cấu trúc dữ liệu & Giải thuật').last().click(); await button('Nghỉ buổi này').click(); await page.getByLabel('Lý do / ghi chú',{exact:true}).fill('Thông báo nghỉ minh họa'); await button('Xác nhận nghỉ buổi này').click(); await page.getByText('Đã nghỉ buổi này',{exact:true}).waitFor(); await shot('cancelled-class'); await close();
    await tab('Kỳ thi').click(); await button('+ Thêm lịch').click();
    await page.getByLabel('Ngày thi (YYYY-MM-DD)',{exact:true}).fill(dates.exam); await page.getByLabel('Giờ thi (HH:mm)',{exact:true}).fill('08:45'); await page.getByLabel('Kết thúc thi (HH:mm)',{exact:true}).fill('09:15'); await button('Thêm lịch thi').click(); await page.getByText('Lịch thi · Toán rời rạc',{exact:true}).waitFor();
    await page.getByLabel('Ngày thi (YYYY-MM-DD)',{exact:true}).fill(dates.today); await page.getByLabel('Giờ thi (HH:mm)',{exact:true}).fill('18:10'); await page.getByLabel('Kết thúc thi (HH:mm)',{exact:true}).fill('18:30'); await button('Thêm lịch thi').click(); await page.getByText('Tự học · Hoàn thiện bố cục trang chủ',{exact:true}).waitFor();
    await page.getByLabel('Giờ thi (HH:mm)',{exact:true}).fill('17:00'); await page.getByLabel('Kết thúc thi (HH:mm)',{exact:true}).fill('17:30'); await page.getByLabel('Phòng thi',{exact:true}).fill('B909'); await tab('Cuối kỳ').click(); await page.getByRole('radio',{name:'Hình thức Trắc nghiệm',exact:true}).click(); await page.getByRole('checkbox',{name:'Nhắc trước 3 giờ',exact:true}).click(); await page.getByRole('checkbox',{name:'Nhắc trước 1 giờ',exact:true}).click(); await page.getByLabel('Ghi chú kỳ thi',{exact:true}).fill('Mang thẻ sinh viên'); await button('Thêm lịch thi').click();
    await button('Chỉnh sửa lịch thi').hover(); await page.getByText('Mang thẻ sinh viên',{exact:true}).waitFor(); await shot('exam-detail'); await close();
    await tab('Thời khóa biểu').click(); await button('Xem buổi học Cấu trúc dữ liệu & Giải thuật').last().click(); await button('Khôi phục buổi học').click(); await page.getByText('Lịch thi · Cấu trúc dữ liệu & Giải thuật',{exact:true}).waitFor(); await page.getByText('Đã nghỉ buổi này',{exact:true}).waitFor(); await shot('restore-conflict'); await close();
    await tab('Kỳ thi').click(); await tab('Tất cả').click(); await button('Xem lịch thi Cấu trúc dữ liệu & Giải thuật').click(); await button('Chỉnh sửa lịch thi').click();
    assert.equal(await page.getByRole('checkbox',{name:'Nhắc trước 1 giờ',exact:true}).getAttribute('aria-checked'),'true');
    await page.getByLabel('Giờ thi (HH:mm)',{exact:true}).fill('17:45'); await page.getByLabel('Kết thúc thi (HH:mm)',{exact:true}).fill('18:00'); await button('Lưu lịch thi').click(); await close();
    await tab('Thời khóa biểu').click(); await button('Xem buổi học Cấu trúc dữ liệu & Giải thuật').last().click(); await button('Khôi phục buổi học').click(); await page.getByText('Theo lịch gốc',{exact:true}).waitFor();
    await button('Chỉnh sửa cả chuỗi').click(); await page.getByLabel('Bắt đầu (HH:mm)',{exact:true}).fill('16:15'); await page.getByLabel('Kết thúc (HH:mm)',{exact:true}).fill('17:00'); await button('Lưu lịch học').click(); await close();
    await button('Khoảng sau').click(); await page.getByText('16:15 – 17:00',{exact:true}).waitFor(); await button('Khoảng sau').click(); await page.getByText('16:15 – 17:00',{exact:true}).waitFor(); await button('Khoảng sau').click(); assert.equal(await page.getByText('16:15 – 17:00',{exact:true}).count(),0);
    await button('Về hôm nay').click(); await button('Xem buổi học Cấu trúc dữ liệu & Giải thuật').last().click(); await button('Chỉnh sửa cả chuỗi').click(); await button('Xóa cả chuỗi lịch học').click(); await button('Xác nhận xóa cả chuỗi').click(); assert.equal(await button('Xem buổi học Cấu trúc dữ liệu & Giải thuật').count(),1);
    await tab('Kỳ thi').click(); await tab('Tất cả').click();
    for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});await shot(`exam-list-${width}`);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
    await page.setViewportSize({width:390,height:844}); await button('Xem lịch thi Cấu trúc dữ liệu & Giải thuật').click(); await button('Chỉnh sửa lịch thi').click(); await button('Xóa lịch thi').click(); await button('Xác nhận xóa lịch thi').click(); assert.equal(await button('Xem lịch thi Cấu trúc dữ liệu & Giải thuật').count(),0);
    assert.deepEqual(errors,[]); const result={passed:true,widths:[320,390,430,1280],checks:['recurrence date range/multiple weekdays','one-occurrence change leaves next week unchanged','cancel and restore occurrence','conflict identifies class/exam/study','restore refuses a newly conflicting exam','whole series edit/delete','no occurrences after end date','exam create/edit/delete and reminder settings','browser console'],errors}; fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
  } finally { await shot('last-state');fs.writeFileSync(path.join(out,'console-errors.json'),JSON.stringify(errors));await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
