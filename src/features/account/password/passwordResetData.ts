import { validatePassword } from '../account';

export type ResetConfirmation = { token: string; newPassword: string; confirmPassword: string };
export type ResetLink = { kind: 'valid'; token: string } | { kind: 'invalid' };

export function readPasswordResetLink(hash: string): { link: ResetLink; remainingHash: string } | null {
  const parts = hash.replace(/^#/, '').split('&');
  const resetKey = 'reset-token';
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const tokens = params.getAll(resetKey);
  if (!tokens.length) return null;
  const token = tokens[0];
  const remaining = parts.filter(part => !new URLSearchParams(part).has(resetKey)).join('&');
  return {
    link: tokens.length === 1 && token && /^[A-Za-z0-9_-]{43}$/.test(token) ? { kind: 'valid', token } : { kind: 'invalid' },
    remainingHash: remaining ? '#' + remaining : '',
  };
}

export function resetPasswordErrors(newPassword: string, confirmPassword: string) {
  return {
    newPassword: validatePassword(newPassword) ?? undefined,
    confirmPassword: !confirmPassword ? 'Nhập lại mật khẩu mới.'
      : newPassword !== confirmPassword ? 'Mật khẩu xác nhận chưa trùng khớp.' : undefined,
  };
}
