import React from 'react';
import { ScrollView, View } from 'react-native';
import { Badge, Button, Card, IconTile, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';

export default function WelcomeScreen({ onStart, onDemo }: { onStart: () => void; onDemo: () => void }) {
  return <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#EDEDF8' }}><ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, gap: 22, width: '100%', maxWidth: 520, alignSelf: 'center' }} style={{ width: '100%', maxWidth: 520 }}>
    <IconTile name="school-outline" size={76} />
    <Badge label="FOCUSYOURSTUDY · BẢN XEM TRƯỚC" />
    <T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 30, lineHeight: 43, letterSpacing: -0.7 }}>{'Việc học gọn hơn.\nMỗi ngày nhẹ hơn.'}</T>
    <T style={S.small}>Bắt đầu từ học kỳ, thêm môn học rồi chia công việc thành những bước vừa sức.</T>
    <Card style={{ gap: 13 }}>{['Tạo học kỳ và các môn đang học', 'Ghi lịch học, bài tập và hạn nộp', 'Dành một phiên tập trung cho hôm nay'].map((text, index) => <View key={text} style={{ flexDirection: 'row', gap: 11, alignItems: 'center' }}><T style={{ fontFamily: F.extra, color: C.primary }}>{index + 1}.</T><T style={{ flex: 1, fontSize: 13 }}>{text}</T></View>)}</Card>
    <Button label="Bắt đầu với dữ liệu trống" icon="add" onPress={onStart} />
    <Button label="Khám phá dữ liệu mẫu" secondary icon="sparkles-outline" onPress={onDemo} />
    <T style={[S.small, { textAlign: 'center', fontSize: 11 }]}>Đây là bản thử giao diện. Dữ liệu chỉ giữ trong phiên; tải lại app sẽ trở về màn này. Chưa có tài khoản hay đồng bộ thật.</T>
  </ScrollView></View>;
}
