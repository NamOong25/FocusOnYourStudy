import { ApiError, type FieldErrors } from '../../../shared/api/http';

export type PasswordUpdate = { currentPassword: string; newPassword: string };
export type PasswordDraft = PasswordUpdate & { confirmPassword: string };
export type PasswordChangeOutcome = 'changed' | 'unconfirmed' | 'signin-required';
export type PasswordChangeNotice = { outcome: PasswordChangeOutcome; email: string; storageFailed: boolean };
export const emptyPasswordDraft = (): PasswordDraft => ({ currentPassword: '', newPassword: '', confirmPassword: '' });
export function passwordUpdate(input: PasswordUpdate): PasswordUpdate {
  const fields: FieldErrors = {};
  if (typeof input.currentPassword !== 'string' || !input.currentPassword.trim() || input.currentPassword.length > 128)
    fields.currentPassword = 'Nhập mật khẩu hiện tại, không quá 128 ký tự.';
  if (typeof input.newPassword !== 'string' || !input.newPassword.trim() || input.newPassword.length < 8 || input.newPassword.length > 128)
    fields.newPassword = 'Mật khẩu mới cần từ 8 đến 128 ký tự.';
  if (!fields.currentPassword && !fields.newPassword && input.currentPassword === input.newPassword)
    fields.newPassword = 'Mật khẩu mới cần khác mật khẩu hiện tại.';
  if (Object.keys(fields).length) throw new ApiError('Kiểm tra các ô được báo lỗi.', 'INVALID_PASSWORD_INPUT', 400, fields);
  // Keep spaces, case and Unicode exactly; never persist this object.
  return { currentPassword: input.currentPassword, newPassword: input.newPassword };
}
export function passwordDraftUpdate(input: PasswordDraft): PasswordUpdate {
  let fields: FieldErrors = {};
  try { passwordUpdate(input); } catch (e) { if (e instanceof ApiError) fields = { ...e.fields }; else throw e; }
  if (!input.confirmPassword || input.confirmPassword !== input.newPassword) fields.confirmPassword = 'Mật khẩu nhập lại chưa khớp.';
  if (Object.keys(fields).length) throw new ApiError('Kiểm tra các ô được báo lỗi.', 'INVALID_PASSWORD_INPUT', 400, fields);
  return passwordUpdate(input);
}
export function passwordChangeMessage(outcome: PasswordChangeOutcome) {
  if (outcome === 'changed') return 'Đã đổi mật khẩu. Các phiên cũ đã được thu hồi. Đăng nhập bằng mật khẩu mới để tiếp tục.';
  if (outcome === 'unconfirmed') return 'Chưa xác nhận được kết quả đổi mật khẩu. Không gửi lại yêu cầu. Khi có mạng, thử đăng nhập bằng mật khẩu mới để kiểm tra.';
  return 'Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại để tiếp tục. Thao tác đổi mật khẩu không được tự gửi lại.';
}
