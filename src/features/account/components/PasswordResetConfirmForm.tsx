import React, { useState } from 'react';
import { Button, Card, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { accountApi } from '../auth/AuthProvider';
import { useApiAction } from '../auth/useApiAction';
import { AccountField, FormMessage } from '../components';
import { resetPasswordErrors, type ResetLink } from '../password/passwordResetData';
import { AuthHero } from './AuthHero';

type Props = { link: ResetLink | null; clearLink: () => void; onLogin: () => void; onRequest: () => void; onClose: () => void };

export default function PasswordResetConfirmForm({ link, clearLink, onLogin, onRequest, onClose }: Props) {
  const action = useApiAction();
  const [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [shown, setShown] = useState(false), [confirmShown, setConfirmShown] = useState(false);
  const [validation, setValidation] = useState<ReturnType<typeof resetPasswordErrors>>();
  const [outcome, setOutcome] = useState<'changed' | 'invalid' | 'unconfirmed' | null>(null);
  const submit = () => {
    if (link?.kind !== 'valid') return;
    action.clearError();
    const errors = resetPasswordErrors(password, confirmation);
    setValidation(errors);
    if (errors.newPassword || errors.confirmPassword) return;
    void action.run(signal => accountApi.confirmPasswordReset({ token: link.token, newPassword: password, confirmPassword: confirmation }, signal), result => {
      setPassword('');
      setConfirmation('');
      setOutcome(result);
      clearLink();
    });
  };

  if (outcome || link?.kind !== 'valid') return <>
    <Card style={{ backgroundColor: outcome === 'changed' ? C.greenSoft : C.amberSoft, gap: 8 }}>
      <T style={{ fontFamily: F.bold }}>{outcome === 'changed' ? 'Đã đặt lại mật khẩu' : outcome === 'unconfirmed' ? 'Cần kiểm tra kết quả' : 'Liên kết không còn dùng được'}</T>
      <T accessibilityLiveRegion="polite" style={S.small}>
        {outcome === 'changed' ? 'Các phiên đăng nhập cũ đã được thu hồi. Đăng nhập lại bằng mật khẩu mới.'
          : outcome === 'unconfirmed' ? 'Chưa nhận được xác nhận. Hãy thử đăng nhập bằng mật khẩu mới. Nếu chưa vào được, yêu cầu một liên kết mới.'
          : 'Liên kết có thể đã hết hạn, đã dùng hoặc không hợp lệ. Bạn có thể yêu cầu một liên kết mới.'}
      </T>
    </Card>
    {(outcome === 'changed' || outcome === 'unconfirmed') && <Button label="Đến trang đăng nhập" icon="log-in-outline" onPress={onLogin} />}
    {outcome !== 'changed' && <Button label="Yêu cầu liên kết mới" secondary={outcome === 'unconfirmed'} onPress={onRequest} />}
    {(outcome === 'invalid' || !outcome) && <Button label="Quay lại đăng nhập" secondary onPress={onLogin} />}
    <Button label="Về ứng dụng" secondary onPress={onClose} />
  </>;

  return <>
    <AuthHero icon="key-outline" title="Đặt lại mật khẩu" detail="Chọn mật khẩu mới dài từ 8 đến 128 ký tự." />
    <AccountField label="Mật khẩu mới" value={password} password shown={shown} onToggle={() => setShown(value => !value)}
      disabled={action.busy} error={validation?.newPassword ?? action.error?.fields.newPassword}
      onChange={value => { setPassword(value); setValidation(undefined); action.clearError(); }} />
    <AccountField label="Xác nhận mật khẩu mới" value={confirmation} password shown={confirmShown} onToggle={() => setConfirmShown(value => !value)}
      disabled={action.busy} error={validation?.confirmPassword ?? action.error?.fields.confirmPassword}
      onChange={value => { setConfirmation(value); setValidation(undefined); action.clearError(); }} />
    <FormMessage message={action.error?.message ?? ''} />
    <Button label="Lưu mật khẩu mới" icon="checkmark-outline" loading={action.busy} onPress={submit} />
    <Button label="Về ứng dụng" secondary disabled={action.busy} onPress={onClose} />
  </>;
}
