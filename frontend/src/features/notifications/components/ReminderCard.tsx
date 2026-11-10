import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { reminderOpenLabel, type ReminderWithRead } from '../notifications';

const kinds = {
  task: { name: 'Bài tập', icon: 'clipboard-outline' },
  class: { name: 'Lịch học', icon: 'calendar-outline' },
  'saved-class': { name: 'Lịch học', icon: 'calendar-outline' },
  exam: { name: 'Lịch thi', icon: 'reader-outline' },
  'saved-exam': { name: 'Lịch thi', icon: 'reader-outline' },
} as const;

export default function ReminderCard({ item, onOpen, onRead, disabledRead = false }: {
  item: ReminderWithRead; onOpen: () => void; onRead: () => void; disabledRead?: boolean;
}) {
  const kind = kinds[item.kind], urgent = item.urgency === 'overdue';
  const known = item.readKnown !== false;
  const unread = known && !item.read;
  const status = known ? item.read ? 'Đã đọc' : 'Chưa đọc' : 'Chưa xác nhận';
  const context = item.subtitle.replaceAll('\n', ' · ');
  const notes = [item.changed ? 'Buổi học đã đổi thông tin' : '', item.origin, item.reason].filter(Boolean);

  return <Row style={[styles.card, unread && styles.unread]}>
    <Pressable accessibilityRole="button" accessibilityLabel={reminderOpenLabel(item)}
      accessibilityHint={`${context}. ${item.detail}. ${status}.`} onPress={onOpen}
      style={({ pressed }) => [S.grow, styles.open, pressed && styles.pressed]}>
      <View style={[styles.icon, urgent && styles.urgentIcon]}>
        <Icon name={kind.icon} size={22} color={urgent ? C.red : C.primary} />
      </View>
      <View style={[S.grow, { gap: 2 }]}>
        <Row style={{ gap: 5 }}>
          {unread && <View style={styles.dot} />}
          <T style={[S.grow, styles.title, unread && { fontFamily: F.extra }]}>{item.title}</T>
        </Row>
        <T style={[styles.kind, urgent && { color: C.red }]}>
          {urgent ? 'Quá hạn' : kind.name}{item.when ? ` · ${item.when}` : ''}
        </T>
        <T style={styles.detail}>{item.detail}</T>
        {!!context && <T style={styles.detail}>{context}</T>}
        {!known && <T style={styles.detail}>{status}</T>}
        {notes.map((note, index) => <T key={index} style={styles.detail}>{note}</T>)}
      </View>
      {!unread && <Icon name="chevron-forward" size={17} color={C.primary} />}
    </Pressable>
    {unread && <IconButton name="checkmark-done-outline" label={`Đánh dấu đã đọc: ${item.title} · ${item.detail}`}
      onPress={onRead} disabled={disabledRead} bg="transparent" />}
  </Row>;
}

const styles = StyleSheet.create({
  card: { minHeight: 72, borderRadius: 15, borderWidth: 1, borderColor: '#E5DFF0', backgroundColor: C.card, paddingHorizontal: 9, gap: 2 },
  unread: { backgroundColor: '#FAF6FF', borderColor: '#DDD2F2' },
  open: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 10 },
  pressed: { opacity: 0.68 },
  icon: { width: 39, height: 39, borderRadius: 12, backgroundColor: C.soft, justifyContent: 'center', alignItems: 'center' },
  urgentIcon: { backgroundColor: C.redSoft },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.primary },
  title: { color: '#24193B', fontFamily: F.bold, fontSize: 14, lineHeight: 20 },
  kind: { color: C.primary, fontFamily: F.semi, fontSize: 11, lineHeight: 17 },
  detail: { color: C.muted, fontSize: 11, lineHeight: 16 },
});
