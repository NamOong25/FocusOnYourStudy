import React, { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Badge, Button, Card, Icon, Row, T, type IconName } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel, parseDay } from '../../../shared/utils/dates';
import { reminderLabel } from '../calendar';
import { meetingPlatforms, type ClassFormat } from '../classFormat';

type Lesson = { start: string; end: string; room: string; teacher: string; changed: boolean; cancelled: boolean; reason: string; notes?: string };
type Recurrence = { weekdays: string; start: string; end: string; startsOn: string; endsOn: string; reminderMinutes: number };

export default function ClassOccurrenceDetails({ title, date, lesson, format, recurrence, blocked, onChange, onCancel,
  onRestore, onEdit, restoreActionLabel, children }: {
  title: string; date: string; lesson?: Lesson; format: ClassFormat; recurrence: Recurrence;
  blocked?: boolean; onChange: () => void; onCancel: () => void; onRestore: () => void; onEdit: () => void;
  restoreActionLabel?: string; children?: ReactNode;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const platform = format.meetingPlatform;
  const online = platform && platform !== 'NONE' ? meetingPlatforms[platform] : null;
  const weekday = parseDay(date).toLocaleDateString('vi-VN', { weekday: 'long' });
  const stackActions = width < 360 || fontScale > 1.25;

  return <>
    <View style={{ gap: 7 }}>
      <T accessibilityRole="header" style={styles.title}>{title}</T>
      {(online || format.lessonType === 'PRACTICE' || lesson?.changed || lesson?.cancelled) && <Row style={styles.badges}>
        {online && <Badge label={`Online · ${online}`} icon="videocam-outline" bg="#D2E9FF" color="#124B84" />}
        {format.lessonType === 'PRACTICE' && <Badge label="Thực hành" bg="#D4F5C9" color="#245B21" />}
        {lesson?.cancelled ? <Badge label="Đã nghỉ" bg={C.redSoft} color={C.red} />
          : lesson?.changed && <Badge label="Đã đổi" bg={C.amberSoft} color={C.amber} />}
      </Row>}
    </View>
    {lesson ? <Card style={styles.info}>
      <InfoLine icon="calendar-outline"><T style={styles.detail}>{weekday}, {dateLabel(date)} · {lesson.start}–{lesson.end}</T></InfoLine>
      {online ? !lesson.cancelled && <>
        <InfoLine icon="videocam-outline"><T selectable style={styles.detail}>ID cuộc họp {format.meetingId}</T></InfoLine>
        {platform === 'ZOOM' && !!format.meetingPasscode && <View style={styles.passcode}>
          {showPassword && <T selectable style={styles.detail}>Mật khẩu {format.meetingPasscode}</T>}
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPassword }}
            onPress={() => setShowPassword(visible => !visible)} style={styles.passwordToggle}>
            <T style={styles.link}>{showPassword ? 'Ẩn mật khẩu Zoom' : 'Hiện mật khẩu Zoom'}</T>
          </Pressable>
        </View>}
      </> : <InfoLine icon="location-outline"><T style={styles.detail}>{lesson.room ? `Phòng ${lesson.room}` : 'Chưa có phòng'}</T></InfoLine>}
      {!!lesson.teacher && <InfoLine icon="person-outline"><T style={styles.detail}>GV. {lesson.teacher}</T></InfoLine>}
      {!!lesson.reason && <InfoLine icon="alert-circle-outline"><T style={styles.detail}>{lesson.reason}</T></InfoLine>}
      {!!lesson.notes && <InfoLine icon="document-text-outline"><T style={styles.detail}>{lesson.notes}</T></InfoLine>}
    </Card> : <T style={S.small}>Ngày này nằm ngoài phạm vi hiện tại của chuỗi.</T>}

    {children}
    {lesson && <>
      {!lesson.cancelled && <View style={{ flexDirection: stackActions ? 'column' : 'row', gap: 8 }}>
        <Button label="Đổi buổi này" icon="swap-horizontal-outline" disabled={blocked} onPress={onChange}
          style={[!stackActions && S.grow, styles.action]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Nghỉ buổi này" accessibilityState={{ disabled: !!blocked }}
          disabled={blocked} onPress={onCancel}
          style={({ pressed }) => [S.row, !stackActions && S.grow, styles.action, styles.cancel, { opacity: blocked ? 0.4 : pressed ? 0.7 : 1 }]}>
          <Icon name="close-circle-outline" size={18} color={C.red} />
          <T style={[styles.link, { color: C.red, flexShrink: 1, textAlign: 'center' }]}>Nghỉ buổi này</T>
        </Pressable>
      </View>}
      {(lesson.cancelled || lesson.changed) && <Button label={lesson.cancelled ? 'Khôi phục buổi này' : 'Bỏ thay đổi buổi này'}
        secondary icon="refresh-outline" disabled={blocked} onPress={onRestore} actionLabel={restoreActionLabel} />}
    </>}

    <Card style={styles.recurrence}>
      <Pressable accessibilityRole="button" accessibilityLabel="Lịch lặp" accessibilityState={{ expanded }}
        onPress={() => setExpanded(open => !open)} style={styles.expand}>
        <Icon name="calendar-outline" size={18} />
        <T style={[styles.link, S.grow]}>Lịch lặp</T>
        <Icon name={expanded ? 'chevron-down' : 'chevron-forward'} size={16} />
      </Pressable>
      {expanded && <View style={styles.expanded}>
        <T style={styles.detail}>{recurrence.weekdays} · {recurrence.start}–{recurrence.end}</T>
        <T style={S.small}>{dateLabel(recurrence.startsOn)}/{recurrence.startsOn.slice(0, 4)} – {dateLabel(recurrence.endsOn)}/{recurrence.endsOn.slice(0, 4)}</T>
        <T style={S.small}>{recurrence.reminderMinutes ? `Nhắc trước ${reminderLabel(recurrence.reminderMinutes)}` : 'Nhắc đúng giờ bắt đầu'}</T>
        <Button label="Chỉnh sửa cả chuỗi" secondary icon="repeat-outline" disabled={blocked} onPress={onEdit} />
      </View>}
    </Card>
  </>;
}

function InfoLine({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <Row style={styles.infoLine}><Icon name={icon} size={18} /><View style={S.grow}>{children}</View></Row>;
}

const styles = StyleSheet.create({
  title: { fontFamily: F.extra, fontSize: 24, lineHeight: 33 },
  badges: { flexWrap: 'wrap', gap: 6 },
  info: { padding: 13, backgroundColor: C.canvas, gap: 8, borderRadius: 16 },
  infoLine: { gap: 9, alignItems: 'flex-start' },
  detail: { fontSize: 13, lineHeight: 20 },
  passcode: { paddingLeft: 27, gap: 4, alignItems: 'flex-start' },
  passwordToggle: { minHeight: 44, justifyContent: 'center' },
  link: { fontFamily: F.bold, color: C.primary, fontSize: 13, lineHeight: 19 },
  action: { minHeight: 48, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 14, gap: 5 },
  cancel: { backgroundColor: C.redSoft, justifyContent: 'center' },
  recurrence: { padding: 0, borderRadius: 14, backgroundColor: C.canvas },
  expand: { ...S.row, minHeight: 48, paddingHorizontal: 12 },
  expanded: { padding: 12, gap: 7, borderTopWidth: 1, borderColor: C.line },
});
