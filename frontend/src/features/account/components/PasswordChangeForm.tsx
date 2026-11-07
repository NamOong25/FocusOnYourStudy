import React, { useState } from 'react';
import { Badge, Button, Card, Sheet, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { AccountField, FormMessage } from '../components';
import { useAuth } from '../auth/AuthProvider';
import { usePasswordChange } from '../password/usePasswordChange';

const fields = [
  { key: 'currentPassword', label: 'Mật khẩu hiện tại', placeholder: 'Nhập mật khẩu đang dùng' },
  { key: 'newPassword', label: 'Mật khẩu mới', placeholder: 'Từ 8 đến 128 ký tự' },
  { key: 'confirmPassword', label: 'Nhập lại mật khẩu mới', placeholder: 'Nhập lại để xác nhận' },
] as const;
export default function PasswordChangeForm({ onClose }: { onClose: () => void }) {
  const auth = useAuth(), { manager, state } = usePasswordChange();
  const [shown, setShown] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  return <Sheet title="Đổi mật khẩu" onClose={onClose} onBack={onClose} dirty={!!manager?.dirty}>
    <Badge label="BẢO VỆ TÀI KHOẢN" icon="shield-checkmark-outline" />
    <T style={S.small}>Đặt mật khẩu mới cho góc học tập của bạn. Bạn sẽ đăng nhập lại sau khi đổi thành công.</T>
    <Card style={{ gap: 6, backgroundColor: C.canvas }}><T style={S.small}>Tài khoản đang đổi mật khẩu</T><T selectable style={{ fontFamily: F.semi }}>{auth.email}</T></Card>
    {fields.map(field => <AccountField key={field.key} label={field.label} placeholder={field.placeholder} password
      value={state.draft[field.key]} shown={shown[field.key]} onToggle={() => setShown(v => ({ ...v, [field.key]: !v[field.key] }))}
      onChange={value => manager?.edit(field.key, value)} disabled={state.busy || !manager} error={state.error?.fields[field.key]} />)}
    <T style={S.small}>Dùng mật khẩu khác mật khẩu hiện tại. Khoảng trắng và chữ hoa/thường được giữ nguyên.</T>
    <Card style={{ backgroundColor: C.soft, gap: 6 }}><T style={{ fontFamily: F.bold }}>Bạn sẽ đăng nhập lại</T><T style={S.small}>Đổi thành công sẽ thu hồi các phiên cũ trên mọi thiết bị. Hồ sơ và dữ liệu học tập vẫn được giữ.</T></Card>
    <FormMessage message={state.error?.message ?? ''} />
    {state.busy && <T accessibilityLiveRegion="polite" style={S.small}>Đang đổi mật khẩu… Đóng form không hủy được một yêu cầu đã gửi. App sẽ thông báo kết quả khi nhận được phản hồi.</T>}
    <Button label="Đổi mật khẩu" icon="lock-closed-outline" disabled={state.busy || !manager} loading={state.busy} onPress={() => { void manager?.submit().catch(() => {}); }} />
  </Sheet>;
}
