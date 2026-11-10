import React, { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { Button, Row, Segments, Sheet, StateView, T } from '../../shared/components';
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

export default function NotificationsCenter({ items, unread, sources, now, onRead, onReadAll, onClose, schedule, readState, onSavedClass, quiet = false }: {
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
            style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 4, justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
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
        {!visible.length && !pending && <StateView
          title={items.length ? 'Bạn đã đọc hết nhắc việc' : 'Chưa có thông báo'}
          message={items.length ? 'Các mục đã đọc vẫn ở phần Tất cả.' : `Đến ${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}, chưa có bài tập hoặc lịch nào cần nhắc.`}
          actionLabel={items.length ? 'Xem tất cả nhắc việc' : undefined} onAction={() => setFilter('Tất cả')} />}
        {!!readState?.message && !needsRetry && <T accessibilityLiveRegion="polite" style={S.small}>{readState.message}</T>}
      </Sheet>
    </NavigationScope>
    {target?.kind === 'task' && <TaskDialog key={target.id} taskId={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'class' && <ClassDialog key={`${target.id}:${target.date}`} id={target.id} date={target.date} onClose={() => setOpened(null)} />}
    {target?.kind === 'exam' && <ExamDialog key={target.id} id={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'saved-exam' && <ServerExamDialog key={target.id} id={target.id} onClose={() => { setOpened(null); if (schedule) void schedule.reload().catch(() => {}); }} onRefreshList={() => { if (schedule) void schedule.reload().catch(() => {}); }} />}
  </FlowScope>;
}
