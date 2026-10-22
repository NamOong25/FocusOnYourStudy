import React from 'react';
import { Button, Card, T } from '../../../shared/components';
import { S } from '../../../shared/theme';
import { useAuth } from '../auth/AuthProvider';
import { useApiAction } from '../auth/useApiAction';
import { FormMessage } from '../components';
import { AuthHero } from './AuthHero';

export default function LogoutForm({ onCancel }: { onCancel: () => void }) {
  const auth = useAuth(), action = useApiAction();
  return <><AuthHero icon="log-out-outline" title="Đăng xuất tài khoản?" detail="Bạn sẽ cần đăng nhập lại để xem hồ sơ của mình." />
    <Card><T style={S.small}>Phiên đăng nhập này sẽ được thu hồi. Tài khoản và dữ liệu đã lưu trên máy chủ vẫn còn; nội dung học tập thử trong lần mở này sẽ được đặt lại.</T></Card>
    <FormMessage message={action.error?.message ?? ''} />
    <Button label="Xác nhận đăng xuất" danger loading={action.busy} onPress={() => { void action.run(() => auth.logout()); }} />
    <Button label="Ở lại" secondary disabled={action.busy} onPress={onCancel} />
  </>;
}
