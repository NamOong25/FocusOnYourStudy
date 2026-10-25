import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, IconTile, Row, Segments, Sheet, StateView, T } from '../../shared/components';
import { FlowScope, NavigationScope } from '../../navigation/Navigation';
import { C, F, S } from '../../shared/theme';
import TaskDialog from '../assignments/TaskDialog';
import ClassDialog from '../schedule/ClassDialog';
import { ExamDialog } from '../exams/Exams';
import { notificationTargetExists, type InAppReminder, type NotificationTarget, type ReminderSources, type ReminderWithRead } from './notifications';
import ReminderCard from './components/ReminderCard';
import type { NotificationScheduleState } from './serverClassReminders';

export default function NotificationsCenter({ items, unread, sources, now, onRead, onReadAll, onClose, schedule, onSavedClass }: {
  items: ReminderWithRead[]; unread: number; sources: ReminderSources; now: Date;
  onRead: (item: InAppReminder) => void; onReadAll: () => void; onClose: () => void;
  schedule: NotificationScheduleState | null; onSavedClass: (target: Extract<NotificationTarget, { kind: 'saved-class' }>) => void;
}) {
  const [filter, setFilter] = useState('Tất cả'), [opened, setOpened] = useState<NotificationTarget | null>(null);
  const target = opened && notificationTargetExists(opened, sources) ? opened : null;
  const visible = filter === 'Chưa đọc' ? items.filter(item => !item.read) : items;
  return <FlowScope onClose={onClose}>
    <NavigationScope active={!target}>
      <Sheet title="Góc nhắc nhở" onClose={onClose}>
        <Card style={{ gap: 11, backgroundColor: C.soft }}>
          <Row style={{ gap: 12 }}><IconTile name="notifications-outline" bg="#FFFFFFAA" /><View style={S.grow}><T style={{ fontFamily: F.bold, color: C.primary, fontSize: 17 }}>Giữ những việc cần nhớ</T><T style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' })}</T></View></Row>
          <Badge label={schedule && !schedule.ready ? `${items.length} mục khác đã tải · lịch học chưa xác nhận` : `${items.length} mục · ${unread} chưa đọc`} bg="#FFFFFFCC" />
          <T style={S.small}>Mở một mục để xem chi tiết và đánh dấu đã đọc. Mở chuông không tự đánh dấu tất cả.</T>
        </Card>
        {!!schedule && <>
          {!schedule.ready && <StateView kind={schedule.error ? 'error' : 'loading'} title={schedule.error ? 'Chưa xác nhận được nhắc lịch học' : 'Đang kiểm tra nhắc lịch học'} message={schedule.error?.message ?? 'Đang đọc các chuỗi và thay đổi của toàn tài khoản. Chưa kết luận là không có lịch.'} />}
          <Button label="Tải lại nhắc việc" secondary loading={schedule.loading} onPress={() => { void schedule.reload().catch(() => {}); }} />
        </>}
        <Segments values={['Tất cả', 'Chưa đọc']} value={filter} onChange={setFilter} />
        <Button label="Đánh dấu tất cả đã đọc" secondary icon="checkmark-done-outline" disabled={!unread || !!schedule && !schedule.ready} onPress={onReadAll} />
        {visible.map(item => <ReminderCard key={item.id} item={item} onRead={() => onRead(item)} onOpen={() => { onRead(item); if (item.target.kind === 'saved-class') onSavedClass(item.target); else setOpened(item.target); }} />)}
        {!visible.length && (!schedule || schedule.ready) && <Card style={{ alignItems: 'center', padding: 22, gap: 13 }}><IconTile name={items.length ? 'checkmark-done-outline' : 'leaf-outline'} size={55} bg={C.soft} /><T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 18, textAlign: 'center' }}>{items.length ? 'Bạn đã đọc hết nhắc việc' : 'Chưa có nhắc việc'}</T><T style={[S.small, { textAlign: 'center' }]}>{items.length ? 'Các mục đã đọc vẫn ở phần Tất cả.' : schedule ? 'Chưa có bài cần nhắc hoặc lịch học đến mốc nhắc. Lịch thi đã lưu xem riêng trong mục Kỳ thi; nhắc việc cho lịch thi sẽ được bổ sung sau.' : 'Nhắc việc sẽ xuất hiện khi có bài chưa xong quá hạn/sắp hạn, lịch học hoặc lịch thi gần đến.'}</T>{!!items.length && <Button label="Xem tất cả nhắc việc" secondary onPress={() => setFilter('Tất cả')} />}</Card>}
        <View style={{ gap: 8 }}><T style={S.small}>{schedule ? 'Lịch học lấy từ toàn tài khoản, không phụ thuộc học kỳ đang xem. Mục xuất hiện từ mốc nhắc đã lưu đến trước khi buổi kết thúc; 0 phút là nhắc đúng giờ bắt đầu. Buổi nghỉ/xóa không được nhắc. Bài chưa xong quá hạn hoặc đến hạn trong 7 ngày vẫn được giữ.' : 'Bài chưa xong đã quá hạn hoặc đến hạn trong 7 ngày; buổi học/lịch thi đang diễn ra hoặc bắt đầu trong 7 ngày tới. Buổi đã hủy và lịch đã kết thúc được bỏ khỏi danh sách.'}</T><T style={S.small}>{schedule ? 'Lịch học và bài tập dùng dữ liệu tài khoản; nhắc việc lịch thi sẽ được bổ sung sau. ' : ''}Đây là nhắc việc trong app, chưa gửi thông báo thiết bị. Trạng thái đọc giữ trong phiên; thay đổi nội dung hiển thị hoặc mốc nhắc sẽ hiện lại là chưa đọc.</T></View>
      </Sheet>
    </NavigationScope>
    {target?.kind === 'task' && <TaskDialog key={target.id} taskId={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'class' && <ClassDialog key={`${target.id}:${target.date}`} id={target.id} date={target.date} onClose={() => setOpened(null)} />}
    {target?.kind === 'exam' && <ExamDialog key={target.id} id={target.id} onClose={() => setOpened(null)} />}
  </FlowScope>;
}
