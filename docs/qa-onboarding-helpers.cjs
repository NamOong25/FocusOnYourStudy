exports.enterDemo = async page => {
  const welcome = page.getByRole('button', { name: 'Khám phá dữ liệu mẫu', exact: true });
  await welcome.or(page.getByRole('tab', { name: 'Trang chủ', exact: true })).first().waitFor({ timeout: 60000 });
  if (await welcome.isVisible()) await welcome.click();
  await page.getByTestId('page-home').waitFor({ state: 'visible' });
};
exports.settleAction = async page => {
  await page.getByRole('button', { name: 'Hủy chờ xử lý', exact: true }).filter({ visible: true }).waitFor({ state: 'hidden' });
};
