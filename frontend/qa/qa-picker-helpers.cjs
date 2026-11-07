const assert = require('node:assert/strict');
const button = (page, name) => page.getByRole('button', { name, exact: true });
const clean = label => label.replace(/ \((?:YYYY-MM-DD|HH:mm)\)$/, '');
async function selectMonth(page, year, month) {
  await button(page, 'Đổi tháng hoặc năm').click(); await button(page, 'Chọn năm').click();
  for (let n = 0; n < 20; n++) {
    const target = button(page, `Năm ${year}`); if (await target.count()) { await target.click(); break; }
    const years = (await page.getByRole('button', { name: /^Năm \d{4}$/ }).allTextContents()).map(Number);
    assert.ok(years.length, 'Year selector is visible'); await button(page, year < Math.min(...years) ? 'Lịch trước' : 'Lịch sau').click();
  }
  await button(page, `Tháng ${month}`).click();
}
async function chooseDate(page, label, value) {
  const [year, month, day] = value.split('-').map(Number); await button(page, `Chọn ${clean(label).toLocaleLowerCase()}`).click(); await selectMonth(page, year, month);
  await page.getByRole('radio', { name: `Ngày ${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`, exact: true }).click(); await button(page, 'Xác nhận ngày').click();
}
async function chooseTime(page, label, value) {
  const [hour, minute] = value.split(':'); await button(page, `Chọn ${clean(label).toLocaleLowerCase()}`).click();
  await page.getByRole('radio', { name: `Chọn giờ ${hour}`, exact: true }).click(); await page.getByRole('radio', { name: `Chọn phút ${minute}`, exact: true }).click(); await button(page, 'Xác nhận giờ').click();
}
module.exports = { chooseDate, chooseTime, selectMonth };
