import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, IconTile, Row, Segments, Sheet, StateView, T } from '../../shared/components';
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

export default function NotificationsCenter({ items, unread, sources, now, onRead, onReadAll, onClose, schedule, readState, onSavedClass }: {
  items: ReminderWithRead[]; unread: number; sources: ReminderSources; now: Date;
  onRead: (item: InAppReminder) => void; onReadAll: (seen: InAppReminder[]) => void; onClose: () => void;
  readState: {ready:boolean;loading:boolean;busy:boolean;error:ApiError|null;needsReload:boolean;message:string} | null;
  schedule: NotificationScheduleState | null; onSavedClass: (target: Extract<NotificationTarget, { kind: 'saved-class' }>) => void;
}) {
  const [filter, setFilter] = useState('Tất cả'), [opened, setOpened] = useState<NotificationTarget | null>(null);
  // A saved exam is resolved by its own authenticated GET (including 404), never by preview RAM.
  // Keep the detail open if the reminder disappears while editing or reaches its end.
  const target = opened && (opened.kind === 'saved-exam' || notificationTargetExists(opened, sources)) ? opened : null;
  const visible = filter === 'Chưa đọc' ? items.filter(item => item.readKnown !== false && !item.read) : items;
  const pending=!!schedule && !schedule.ready || !!readState && !readState.ready;
  return <FlowScope onClose={onClose}>
    <NavigationScope active={!target}>
      <Sheet title="Góc nhắc nhở" onClose={onClose}>
        <Card style={{ gap: 11, backgroundColor: C.soft }}>
          <Row style={{ gap: 12 }}><IconTile name="notifications-outline" bg="#FFFFFFAA" /><View style={S.grow}><T style={{ fontFamily: F.bold, color: C.primary, fontSize: 17 }}>Giữ những việc cần nhớ</T><T style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' })}</T></View></Row>
          <Badge label={pending ? `${items.length} mục đã tải · đang xác nhận nhắc việc` : `${items.length} mục · ${unread} chưa đọc`} bg="#FFFFFFCC" />
          <T style={S.small}>Mở một mục để xem chi tiết và đánh dấu đã đọc. Mở chuông không tự đánh dấu tất cả.</T>
        </Card>
        {!!schedule && <>
          <T style={S.small}>Lịch học: {schedule.classesReady ? 'đã xác nhận' : 'chưa xác nhận'} · Lịch thi: {schedule.examsReady ? 'đã xác nhận' : 'chưa xác nhận'}</T>
          {!schedule.ready && <StateView kind={schedule.error ? 'error' : 'loading'} title={schedule.error ? 'Chưa xác nhận đủ nhắc việc' : 'Đang kiểm tra nhắc việc'} message={schedule.error?.message ?? 'Đang đọc lịch học và lịch thi của toàn tài khoản. Chưa kết luận là không có lịch cần nhắc.'} />}
          {!!readState && !readState.ready && schedule.ready && <StateView kind={readState.error || readState.needsReload ? 'error' : 'loading'} title={readState.error || readState.needsReload ? 'Chưa xác nhận trạng thái đọc' : 'Đang đọc trạng thái từ tài khoản'} message={readState.error?.message ?? 'Đang đối chiếu trạng thái đã đọc với nội dung đang hiển thị.'} />}
          {!!readState?.message && <T accessibilityLiveRegion="polite" style={S.small}>{readState.message}</T>}
          <Button label="Tải lại nhắc việc" secondary disabled={readState?.busy} loading={schedule.loading || readState?.loading} onPress={() => { void schedule.reload().catch(() => {}); }} />
        </>}
        <Segments values={['Tất cả', 'Chưa đọc']} value={filter} onChange={setFilter} />
        <Button label="Đánh dấu tất cả đã đọc" secondary icon="checkmark-done-outline" loading={readState?.busy} disabled={!unread || pending || !!readState?.busy} onPress={() => onReadAll(visible)} />
        {visible.map(item => <ReminderCard key={item.id} item={item} disabledRead={!!readState?.busy} onRead={() => onRead(item)} onOpen={() => { if(item.readKnown !== false)onRead(item); if (item.target.kind === 'saved-class') onSavedClass(item.target); else setOpened(item.target); }} />)}
        {!visible.length && !pending && <Card style={{ alignItems: 'center', padding: 22, gap: 13 }}><IconTile name={items.length ? 'checkmark-done-outline' : 'leaf-outline'} size={55} bg={C.soft} /><T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 18, textAlign: 'center' }}>{items.length ? 'Bạn đã đọc hết nhắc việc' : 'Chưa có nhắc việc'}</T><T style={[S.small, { textAlign: 'center' }]}>{items.length ? 'Các mục đã đọc vẫn ở phần Tất cả.' : schedule ? 'Chưa có bài cần nhắc, hoặc lịch học/lịch thi chưa đến mốc nhắc. Các lịch đã kết thúc và lịch thi đã tắt nhắc không xuất hiện ở đây.' : 'Nhắc việc sẽ xuất hiện khi có bài chưa xong quá hạn/sắp hạn, lịch học hoặc lịch thi gần đến.'}</T>{!!items.length && <Button label="Xem tất cả nhắc việc" secondary onPress={() => setFilter('Tất cả')} />}</Card>}
        <View style={{ gap: 8 }}><T style={S.small}>{schedule ? 'Lịch học và lịch thi lấy từ toàn tài khoản, không phụ thuộc học kỳ đang xem. Mục xuất hiện từ mốc nhắc đã lưu đến trước khi buổi kết thúc; 0 phút là nhắc đúng giờ bắt đầu. Buổi nghỉ/xóa và lịch thi tắt nhắc/xóa không được nhắc. Bài chưa xong quá hạn hoặc đến hạn trong 7 ngày vẫn được giữ.' : 'Bài chưa xong đã quá hạn hoặc đến hạn trong 7 ngày; buổi học/lịch thi đang diễn ra hoặc bắt đầu trong 7 ngày tới. Buổi đã hủy và lịch đã kết thúc được bỏ khỏi danh sách.'}</T><T style={S.small}>{schedule ? 'Lịch học, lịch thi và bài tập dùng dữ liệu tài khoản. Mỗi kỳ thi có một thẻ; đến mốc nhắc mới sẽ hiện chưa đọc lại. ' : ''}Đây là nhắc việc trong app, chưa gửi thông báo thiết bị. {schedule ? 'Trạng thái đã đọc được lưu vào tài khoản và đối chiếu sau khi tải lại. Nội dung hoặc mốc nhắc thay đổi sẽ cần đọc lại.' : 'Trạng thái đọc của bản xem thử chỉ giữ trong phiên.'}</T></View>
      </Sheet>
    </NavigationScope>
    {target?.kind === 'task' && <TaskDialog key={target.id} taskId={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'class' && <ClassDialog key={`${target.id}:${target.date}`} id={target.id} date={target.date} onClose={() => setOpened(null)} />}
    {target?.kind === 'exam' && <ExamDialog key={target.id} id={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'saved-exam' && <ServerExamDialog key={target.id} id={target.id} onClose={() => { setOpened(null); if (schedule) void schedule.reload().catch(() => {}); }} onRefreshList={() => { if (schedule) void schedule.reload().catch(() => {}); }} />}
  </FlowScope>;
}
