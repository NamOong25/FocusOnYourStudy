import React from 'react';
import { ScrollView, View } from 'react-native';
import { Badge, Button, Card, IconTile, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { useAuth } from '../account/auth/AuthProvider';
import { useApiAction } from '../account/auth/useApiAction';
import { FormMessage } from '../account/components';

export default function WelcomeScreen({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  const auth = useAuth(), action = useApiAction();
  return <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#EDEDF8' }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 22, width: '100%', maxWidth: 520, alignSelf: 'center' }} style={{ width: '100%', maxWidth: 520 }}>
    <IconTile name="school-outline" size={76} />
    <Badge label="FOCUSYOURSTUDY · BẢN XEM TRƯỚC" />
    {!!auth.notice && <Card><T accessibilityLiveRegion="polite" style={S.small}>{auth.notice}</T></Card>}
    {auth.logoutPending && <Button label="Hoàn tất đăng xuất" secondary loading={action.busy} onPress={() => { void action.run(() => auth.logout()); }} />}
    {auth.canRestore && <Button label="Khôi phục đăng nhập" secondary onPress={() => { void auth.restore(); }} />}
    <FormMessage message={action.error?.message ?? ''} />
    <T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 30, lineHeight: 43, letterSpacing: -0.7 }}>{'Việc học gọn hơn.\nMỗi ngày nhẹ hơn.'}</T>
    <T style={S.small}>Bắt đầu từ học kỳ, thêm môn học rồi chia công việc thành những bước vừa sức.</T>
    <Card style={{ gap: 13 }}>{['Tạo học kỳ và các môn đang học', 'Ghi lịch học, bài tập và hạn nộp', 'Dành một phiên tập trung cho hôm nay'].map((text, index) => <View key={text} style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}><T style={{ fontFamily: F.extra, color: C.primary }}>{index + 1}.</T><T style={{ flex: 1, fontSize: 13 }}>{text}</T></View>)}</Card>
    <Button label="Bắt đầu với dữ liệu trống" icon="add" onPress={onStart} />
    <Button label="Khám phá dữ liệu mẫu" secondary icon="sparkles-outline" onPress={onDemo} />
    <T style={[S.small, { textAlign: 'center', fontSize: 11 }]}>Các màn học tập đang dùng dữ liệu thử và được đặt lại khi tải lại. Mở Hồ sơ để đăng ký hoặc đăng nhập tài khoản đã lưu.</T>
  </ScrollView></View>;
}
