// Retained inactive screens stay mounted; UI checks must select visible text only.
exports.visibleText = (page, ...args) => page.getByText(...args).filter({ visible: true });
exports.backDialog = page => page.getByRole('dialog').last().getByRole('button', { name: 'Quay lại', exact: true }).click();
