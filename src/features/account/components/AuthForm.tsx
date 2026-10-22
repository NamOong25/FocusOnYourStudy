import React, { useState } from 'react';
import { Badge, Button, T } from '../../../shared/components';
import { S } from '../../../shared/theme';
import type { FieldErrors } from '../../../shared/api/http';
import { isEmail, normalizeEmail, validatePassword } from '../account';
import { AccountField, FormMessage } from '../components';
import { accountApi, useAuth } from '../auth/AuthProvider';
import { useApiAction } from '../auth/useApiAction';
import { AuthHero } from './AuthHero';

type Props = { mode: 'login' | 'register'; initialEmail: string; message: string; onRegistered: (email: string) => void;
  onSignedIn: (profileLoaded: boolean) => void; onMode: (mode: 'login' | 'register') => void; onForgot: () => void };
export default function AuthForm({ mode, initialEmail, message, onRegistered, onSignedIn, onMode, onForgot }: Props) {
  const register = mode === 'register', auth = useAuth(), action = useApiAction();
  const [name, setName] = useState(''), [email, setEmail] = useState(initialEmail), [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState(''), [school, setSchool] = useState(''), [major, setMajor] = useState('');
  const [shown, setShown] = useState(false), [showConfirm, setShowConfirm] = useState(false), [validation, setValidation] = useState<FieldErrors>({});
  const errors = { ...action.error?.fields, ...validation };
  const edit = (field: string, setter: (s: string) => void) => (value: string) => { setter(value); setValidation(v => { const next = { ...v }; delete next[field]; return next; }); action.clearError(); };
  const submit = () => {
    const invalid: FieldErrors = {};
    if (!isEmail(email)) invalid.email = 'Nhập địa chỉ email hợp lệ.';
    const badPassword = validatePassword(password);
    if (badPassword) invalid.password = badPassword;
    if (register) {
      if (!name.trim() || name.trim().length > 60) invalid.fullName = 'Họ tên cần từ 1 đến 60 ký tự.';
      if (password !== confirm) invalid.confirmPassword = 'Mật khẩu xác nhận chưa trùng khớp.';
      if (school.trim().length > 100) invalid.school = 'Tên trường không quá 100 ký tự.';
      if (major.trim().length > 100) invalid.major = 'Ngành học không quá 100 ký tự.';
    }
    setValidation(invalid); action.clearError();
    if (Object.keys(invalid).length) return;
    if (register) void action.run(signal => accountApi.register({ email: normalizeEmail(email), fullName: name.trim(), password,
      confirmPassword: confirm, school: school.trim(), major: major.trim() }, signal), profile => {
        setPassword(''); setConfirm(''); onRegistered(profile.email);
      });
    else void action.run(signal => auth.signIn({ email: normalizeEmail(email), password }, signal), loaded => { setPassword(''); onSignedIn(loaded); });
  };
  return <>
    <AuthHero icon={register ? 'sparkles-outline' : 'school-outline'} title={register ? 'Một khởi đầu mới, cho việc học tốt hơn.' : 'Chào mừng bạn trở lại!'}
      detail={register ? 'Tạo tài khoản để bắt đầu góc học tập của bạn.' : 'Đăng nhập để xem hồ sơ tài khoản của bạn.'} />
    <Badge label="TÀI KHOẢN CỦA BẠN" icon="shield-checkmark-outline" />
    <FormMessage message={message} success />
    {register && <AccountField label="Họ tên đăng ký" value={name} onChange={edit('fullName', setName)} disabled={action.busy} error={errors.fullName} placeholder="Tên của bạn" />}
    <AccountField label="Email tài khoản" email value={email} onChange={edit('email', setEmail)} disabled={action.busy} error={errors.email} placeholder="ban@example.com" />
    <AccountField label="Mật khẩu" password value={password} shown={shown} onToggle={() => setShown(v => !v)} onChange={edit('password', setPassword)} disabled={action.busy} error={errors.password} placeholder="Từ 8 đến 128 ký tự" />
    {register && <>
      <AccountField label="Xác nhận mật khẩu" password value={confirm} shown={showConfirm} onToggle={() => setShowConfirm(v => !v)} onChange={edit('confirmPassword', setConfirm)} disabled={action.busy} error={errors.confirmPassword} />
      <AccountField label="Trường học (không bắt buộc)" value={school} onChange={edit('school', setSchool)} disabled={action.busy} error={errors.school} />
      <AccountField label="Ngành học (không bắt buộc)" value={major} onChange={edit('major', setMajor)} disabled={action.busy} error={errors.major} />
    </>}
    <FormMessage message={action.error?.message ?? ''} />
    {action.busy && <T accessibilityLiveRegion="polite" style={S.small}>{register ? 'Đang tạo tài khoản…' : 'Đang đăng nhập và tải hồ sơ…'}</T>}
    <Button label={register ? 'Tạo tài khoản' : 'Đăng nhập'} onPress={submit} loading={action.busy} icon={register ? 'person-add-outline' : 'log-in-outline'} />
    <Button label={register ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký'} secondary disabled={action.busy} onPress={() => onMode(register ? 'login' : 'register')} />
    {!register && <Button label="Quên mật khẩu?" secondary disabled={action.busy} onPress={onForgot} />}
    <T style={[S.small, { textAlign: 'center' }]}>Tài khoản được lưu trực tuyến. Ứng dụng giữ đăng nhập khi phiên còn hiệu lực.</T>
  </>;
}
