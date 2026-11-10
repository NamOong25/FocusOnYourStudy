import React, { useState } from 'react';
import { Button, T } from '../../../shared/components';
import { S } from '../../../shared/theme';
import { isEmail } from '../account';
import { accountApi } from '../auth/AuthProvider';
import { useApiAction } from '../auth/useApiAction';
import { AccountField, FormMessage } from '../components';
import { AuthHero } from './AuthHero';
import { AuthEntryHeading, AuthEntryLink, AuthEntrySubmit } from './AuthEntryControls';

export default function PasswordResetRequestForm({ initialEmail, onLogin, entry = false }: {
  initialEmail: string; onLogin: (email: string) => void; entry?: boolean;
}) {
  const action = useApiAction();
  const [email, setEmail] = useState(initialEmail);
  const [fieldError, setFieldError] = useState('');
  const [accepted, setAccepted] = useState(false);
  const submit = () => {
    action.clearError();
    if (!isEmail(email)) {
      setFieldError('Nhập địa chỉ email hợp lệ.');
      return;
    }
    void action.run(signal => accountApi.requestPasswordReset(email, signal), () => setAccepted(true));
  };

  return <>
    {entry ? <AuthEntryHeading title="Quên mật khẩu?" detail="Nhận liên kết đặt lại mật khẩu qua email." />
      : <AuthHero icon="key-outline" title="Quên mật khẩu?" detail="Nhập email tài khoản để yêu cầu liên kết đặt lại mật khẩu." />}
    {accepted ? <>
      <FormMessage success message="Nếu email có tài khoản, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu." />
      <T style={S.small}>Kiểm tra hộp thư đến và thư rác. Mở liên kết trong email để chọn mật khẩu mới. Liên kết có hiệu lực 30 phút.</T>
    </> : <>
      <AccountField entry={entry} label="Email tài khoản" value={email} email disabled={action.busy} placeholder="ban@example.com"
        onChange={value => { setEmail(value); setFieldError(''); action.clearError(); }} error={fieldError || action.error?.fields.email} />
      <FormMessage message={action.error?.message ?? ''} />
      {entry ? <AuthEntrySubmit label="Gửi liên kết đặt lại mật khẩu" pending="Đang gửi liên kết…" busy={action.busy} onPress={submit} />
        : <Button label="Gửi liên kết đặt lại mật khẩu" icon="mail-outline" loading={action.busy} onPress={submit} />}
    </>}
    {entry ? <AuthEntryLink label="Quay lại đăng nhập" disabled={action.busy} onPress={() => onLogin(email)} />
      : <Button label="Quay lại đăng nhập" secondary disabled={action.busy} onPress={() => onLogin(email)} />}
  </>;
}
