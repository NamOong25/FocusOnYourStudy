import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Icon, IconButton, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { reminderOpenLabel, type ReminderWithRead } from '../notifications';

const kinds = { task: { name: 'Bài tập', icon: 'clipboard-outline' as const }, class: { name: 'Lịch học', icon: 'calendar-outline' as const }, 'saved-class': { name: 'Lịch học', icon: 'calendar-outline' as const }, exam: { name: 'Lịch thi', icon: 'reader-outline' as const }, 'saved-exam': { name: 'Lịch thi', icon: 'reader-outline' as const } };
export default function ReminderCard({ item, onOpen, onRead }: { item: ReminderWithRead; onOpen: () => void; onRead: () => void }) {
  const kind = kinds[item.kind], urgent = item.urgency === 'overdue';
  return <View style={[S.card, { gap: 10, borderColor: item.read ? C.line : '#D5CCFF', backgroundColor: item.read ? C.card : '#FCFAFF' }]}>
    <Row between><Badge label={kind.name} icon={kind.icon} /><T style={{ fontSize: 10, fontFamily: F.semi, color: urgent ? C.red : C.muted }}>{item.when}</T></Row>
    <Pressable accessibilityRole="button" accessibilityLabel={reminderOpenLabel(item)} accessibilityHint={`${item.subtitle}. ${item.detail}. ${item.read ? 'Đã đọc' : 'Chưa đọc'}`} onPress={onOpen} style={{ gap: 8, paddingVertical: 4, minHeight: 90 }}>
      <T style={{ fontFamily: item.read ? F.semi : F.bold, fontSize: 16, lineHeight: 25 }}>{item.title}</T>
      <T style={{ fontSize: 11, lineHeight: 19, color: C.muted }}>{item.subtitle}</T>
      <Row style={{ alignItems: 'flex-start', gap: 6 }}><Icon name="time-outline" size={15} color={urgent ? C.red : C.primary} /><T style={[S.grow, { fontSize: 11, lineHeight: 19, color: urgent ? C.red : C.primary }]}>{item.detail}</T></Row>
      {!!item.changed && <T style={{ fontSize: 11, color: C.amber }}>Buổi học đã đổi thông tin</T>}
      {!!item.origin && <T style={S.small}>{item.origin}</T>}
      {!!item.reason && <T style={S.small}>{item.reason}</T>}
      <T style={{ fontFamily: F.semi, fontSize: 11, color: C.primary }}>Xem chi tiết →</T>
    </Pressable>
    <Row between><Row style={S.grow}>{!item.read && <View style={{ width: 6, height: 6, borderRadius: 4, backgroundColor: C.primary }} />}<T style={{ fontSize: 11, color: item.read ? C.muted : C.primary }}>{item.read ? 'Đã đọc' : 'Chưa đọc'}</T></Row>{!item.read && <IconButton name="checkmark-done-outline" label={`Đánh dấu đã đọc: ${item.title} · ${item.detail}`} onPress={onRead} bg={C.soft} />}</Row>
  </View>;
}
