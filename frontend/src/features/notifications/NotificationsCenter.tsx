import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Button, Card, Row, Segments, Sheet, T } from '../../shared/components';
import { FlowScope, NavigationScope } from '../../navigation/Navigation';
import { C, F, S } from '../../shared/theme';
import TaskDialog from '../assignments/TaskDialog';
import ClassDialog from '../schedule/ClassDialog';
import { ExamDialog } from '../exams/Exams';
import ServerExamDialog from '../exams/components/ServerExamDialog';
import { notificationTargetExists, type InAppReminder, type NotificationTarget, type ReminderSources, type ReminderWithRead } from './notifications';
import ReminderCard from './components/ReminderCard';
import type { NotificationScheduleState } from './serverClassReminders';
import type { ApiError } from '../../shared/api/http';

export default function NotificationsCenter({ items, unread, sources, onRead, onReadAll, onClose, schedule, readState, onSavedClass, quiet = false }: {
  items: ReminderWithRead[]; unread: number; sources: ReminderSources; now: Date;
  onRead: (item: InAppReminder) => void; onReadAll: (seen: InAppReminder[]) => void; onClose: () => void;
  readState: {ready:boolean;loading:boolean;busy:boolean;error:ApiError|null;needsReload:boolean;message:string} | null;
  schedule: NotificationScheduleState | null; onSavedClass: (target: Extract<NotificationTarget, { kind: 'saved-class' }>) => void;
  quiet?: boolean;
}) {
  const [filter, setFilter] = useState('Tất cả'), [opened, setOpened] = useState<NotificationTarget | null>(null);
  // A saved exam is resolved by its own authenticated GET (including 404), never by preview RAM.
  // Keep the detail open if the reminder disappears while editing or reaches its end.
  const target = opened && (opened.kind === 'saved-exam' || notificationTargetExists(opened, sources)) ? opened : null;
  const visible = filter === 'Chưa đọc' ? items.filter(item => item.readKnown !== false && !item.read) : items;
  const pending = !!schedule && !schedule.ready || !!readState && !readState.ready;
  const failure = schedule?.error ?? readState?.error;
  const needsRetry = !!schedule && (!!failure || !!readState?.needsReload);
  const marking = !!readState?.busy;
  const canMarkAll = !!unread && !pending && !marking;
  const headingDetail = pending ? needsRetry ? 'Cần kiểm tra lại' : 'Đang kiểm tra thông báo…' : `${unread} chưa đọc`;
  return <FlowScope onClose={onClose}>
    <NavigationScope active={!target}>
      <Sheet title="Thông báo" onClose={onClose} heading={{ icon: 'notifications-outline', detail: headingDetail }} surfaceColor="#FFFCF7">
        <Row style={{ gap: 12 }}>
          <View style={S.grow}><Segments values={['Tất cả', 'Chưa đọc']} value={filter} onChange={setFilter} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Đánh dấu tất cả đã đọc"
            accessibilityState={{ disabled: !canMarkAll, busy: marking }} disabled={!canMarkAll}
            onPress={() => onReadAll(visible)}
            style={({ pressed }) => [styles.markAll, (pressed || (!canMarkAll && !marking)) && styles.dimmed]}>
            <T style={{ color: canMarkAll ? C.primary : C.muted, fontFamily: F.bold, fontSize: 12, lineHeight: 19 }}>
              {marking ? 'Đang lưu…' : 'Đọc tất cả'}
            </T>
          </Pressable>
        </Row>
        {quiet && <T accessibilityLiveRegion="polite" style={S.small}>Đang trong giờ yên lặng · Số trên chuông tạm ẩn.</T>}
        {needsRetry && schedule && <View style={{ gap: 8, borderRadius: 13, padding: 11, backgroundColor: C.redSoft }}>
          <T accessibilityRole="alert" style={[S.small, { color: C.red }]}>{failure?.message ?? 'Tải lại để xác nhận trạng thái đã đọc.'}</T>
          {!!readState?.message && <T style={S.small}>{readState.message}</T>}
          <Button label="Tải lại nhắc việc" secondary disabled={marking} loading={schedule.loading || readState?.loading}
            onPress={() => { void schedule.reload().catch(() => {}); }} />
        </View>}
        {pending && !needsRetry && !visible.length && <Row style={{ paddingVertical: 8 }}>
          <ActivityIndicator color={C.primary} /><T style={S.small}>Đang tải dữ liệu thông báo…</T>
        </Row>}
        {!!visible.length && <View style={{ gap: 9 }}>{visible.map(item => <ReminderCard key={item.id} item={item} disabledRead={pending || marking}
          onRead={() => onRead(item)} onOpen={() => {
            if (item.readKnown !== false) onRead(item);
            if (item.target.kind === 'saved-class') onSavedClass(item.target);
            else setOpened(item.target);
          }} />)}</View>}
        {!visible.length && !pending && <NotificationEmptyState
          onShowAll={items.length ? () => setFilter('Tất cả') : undefined} />}
        {!!readState?.message && !needsRetry && <T accessibilityLiveRegion="polite" style={S.small}>{readState.message}</T>}
      </Sheet>
    </NavigationScope>
    {target?.kind === 'task' && <TaskDialog key={target.id} taskId={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'class' && <ClassDialog key={`${target.id}:${target.date}`} id={target.id} date={target.date} onClose={() => setOpened(null)} />}
    {target?.kind === 'exam' && <ExamDialog key={target.id} id={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'saved-exam' && <ServerExamDialog key={target.id} id={target.id} onClose={() => { setOpened(null); if (schedule) void schedule.reload().catch(() => {}); }} onRefreshList={() => { if (schedule) void schedule.reload().catch(() => {}); }} />}
  </FlowScope>;
}

function NotificationEmptyState({ onShowAll }: { onShowAll?: () => void }) {
  return <Card style={styles.empty}>
    <View style={styles.icon} accessible={false} aria-hidden>
      <Svg width={36} height={36} viewBox="0 0 36 36" fill="none" stroke={C.primary}
        strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <Path d="M19 25H5a1 1 0 0 1-.7-1.7C7 20.6 7 18 7 15.5A8.5 8.5 0 0 1 13 7.4a2.5 2.5 0 0 1 4.9 0 8.5 8.5 0 0 1 6.1 8.1c0 1 0 2 .2 3M12 25a4 4 0 0 0 7 2.6" />
        <Circle cx={26} cy={25.5} r={7} fill={C.soft} />
        <Path d="m23 25.6 2 2 3.8-4" />
      </Svg>
    </View>
    <T accessibilityRole="header" accessibilityLiveRegion="polite" style={styles.title}>
      {onShowAll ? 'Bạn đã đọc hết nhắc việc' : 'Chưa có thông báo'}
    </T>
    <T style={[S.small, styles.message]}>
      {onShowAll ? 'Các mục đã đọc vẫn ở phần Tất cả.' : 'Lời nhắc lịch học, lịch thi và bài tập sẽ xuất hiện ở đây.'}
    </T>
    {onShowAll && <Button label="Xem tất cả nhắc việc" secondary onPress={onShowAll} style={styles.action} />}
  </Card>;
}

const styles = StyleSheet.create({
  markAll: { minHeight: 44, paddingHorizontal: 4, justifyContent: 'center' },
  dimmed: { opacity: 0.7 },
  empty: { alignItems: 'center', borderRadius: 20, borderColor: C.line, paddingHorizontal: 15, paddingVertical: 22, gap: 7, boxShadow: 'none' },
  icon: { width: 58, height: 58, borderRadius: 17, backgroundColor: C.soft, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  title: { fontFamily: F.bold, fontSize: 17, textAlign: 'center' },
  message: { maxWidth: 260, textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: 4 },
});
