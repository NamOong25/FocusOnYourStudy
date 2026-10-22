import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useAuth } from '../auth/AuthProvider';
import { useApiAction } from '../auth/useApiAction';
import { accountDisplayProfile } from '../auth/displayProfile';
import { StudentAvatar } from '../components';

export default function AccountProfile({ onLogin }: { onLogin: () => void }) {
  const auth = useAuth(), action = useApiAction();
  const reload = () => { void action.run(signal => auth.reloadProfile(signal)); };
  return <>
    {action.busy ? <StateView kind="loading" title="Đang tải hồ sơ" message="Đợi một chút nhé." />
      : auth.profileError || !auth.profile ? <StateView kind="error" title="Chưa tải được hồ sơ"
        message={(action.error ?? auth.profileError)?.message ?? 'Hãy đăng nhập lại để tiếp tục.'}
        actionLabel="Thử tải lại hồ sơ" onAction={reload} secondaryLabel="Đăng nhập lại" onSecondary={onLogin} />
      : <Card style={{ gap: 19 }}>
        <View style={{ alignItems: 'center', gap: 12 }}><StudentAvatar profile={accountDisplayProfile(auth.profile)} size={76} />
          <Badge label="HỒ SƠ TÀI KHOẢN" bg={C.greenSoft} color={C.green} icon="checkmark-circle-outline" />
          <T testID="account-full-name" style={{ fontFamily: F.extra, fontSize: 22, lineHeight: 31, textAlign: 'center' }}>{auth.profile.fullName}</T>
        </View>
        {[
          ['Email', auth.profile.email], ['Trường học', auth.profile.school || 'Chưa thêm trường học'],
          ['Ngành học', auth.profile.major || 'Chưa thêm ngành học'], ['Múi giờ', auth.profile.timeZone],
        ].map(([label, value]) => <View key={label} style={{ gap: 5 }}><T style={S.small}>{label}</T><T style={{ fontFamily: F.semi, fontSize: 13 }}>{value}</T></View>)}
        <Button label="Tải lại hồ sơ" secondary icon="refresh-outline" onPress={reload} />
      </Card>}
    <T style={S.small}>Thông tin này được đọc từ tài khoản đã lưu. Chỉnh sửa hồ sơ sẽ được bổ sung sau.</T>
  </>;
}
