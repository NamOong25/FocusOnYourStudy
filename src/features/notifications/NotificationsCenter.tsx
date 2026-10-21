import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, IconTile, Row, Segments, Sheet, T } from '../../shared/components';
import { FlowScope, NavigationScope } from '../../navigation/Navigation';
import { C, F, S } from '../../shared/theme';
import TaskDialog from '../assignments/TaskDialog';
import ClassDialog from '../schedule/ClassDialog';
import { ExamDialog } from '../exams/Exams';
import { notificationTargetExists, type InAppReminder, type NotificationTarget, type ReminderSources, type ReminderWithRead } from './notifications';
import ReminderCard from './components/ReminderCard';

export default function NotificationsCenter({ items, unread, sources, now, onRead, onReadAll, onClose }: {
  items: ReminderWithRead[]; unread: number; sources: ReminderSources; now: Date;
  onRead: (item: InAppReminder) => void; onReadAll: () => void; onClose: () => void;
}) {
  const [filter, setFilter] = useState('Tất cả'), [opened, setOpened] = useState<NotificationTarget | null>(null);
  const target = opened && notificationTargetExists(opened, sources) ? opened : null;
  const visible = filter === 'Chưa đọc' ? items.filter(item => !item.read) : items;
  return <FlowScope onClose={onClose}>
    <NavigationScope active={!target}>
      <Sheet title="Góc nhắc nhở" onClose={onClose}>
        <Card style={{ gap: 11, backgroundColor: C.soft }}>
          <Row style={{ gap: 12 }}><IconTile name="notifications-outline" bg="#FFFFFFAA" /><View style={S.grow}><T style={{ fontFamily: F.bold, color: C.primary, fontSize: 17 }}>Giữ những việc cần nhớ</T><T style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' })}</T></View></Row>
          <Badge label={`${items.length} mục · ${unread} chưa đọc`} bg="#FFFFFFCC" />
          <T style={S.small}>Mở một mục để xem chi tiết và đánh dấu đã đọc. Mở chuông không tự đánh dấu tất cả.</T>
        </Card>
        <Segments values={['Tất cả', 'Chưa đọc']} value={filter} onChange={setFilter} />
        <Button label="Đánh dấu tất cả đã đọc" secondary icon="checkmark-done-outline" disabled={!unread} onPress={onReadAll} />
        {visible.map(item => <ReminderCard key={item.id} item={item} onRead={() => onRead(item)} onOpen={() => { onRead(item); setOpened(item.target); }} />)}
        {!visible.length && <Card style={{ alignItems: 'center', padding: 22, gap: 13 }}><IconTile name={items.length ? 'checkmark-done-outline' : 'leaf-outline'} size={55} bg={C.soft} /><T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 18, textAlign: 'center' }}>{items.length ? 'Bạn đã đọc hết nhắc việc' : 'Chưa có nhắc việc'}</T><T style={[S.small, { textAlign: 'center' }]}>{items.length ? 'Các mục đã đọc vẫn ở phần Tất cả.' : 'Nhắc việc sẽ xuất hiện khi có bài chưa xong quá hạn/sắp hạn, lịch học hoặc lịch thi gần đến.'}</T>{!!items.length && <Button label="Xem tất cả nhắc việc" secondary onPress={() => setFilter('Tất cả')} />}</Card>}
        <View style={{ gap: 8 }}><T style={S.small}>Bài chưa xong đã quá hạn hoặc đến hạn trong 7 ngày; buổi học/lịch thi đang diễn ra hoặc bắt đầu trong 7 ngày tới. Buổi đã hủy và lịch đã kết thúc được bỏ khỏi danh sách.</T><T style={S.small}>Đây là nhắc việc trong app, chưa gửi thông báo thiết bị. Trạng thái đọc giữ trong phiên dùng thử; lịch/deadline thay đổi sẽ hiện lại là chưa đọc.</T></View>
      </Sheet>
    </NavigationScope>
    {target?.kind === 'task' && <TaskDialog key={target.id} taskId={target.id} onClose={() => setOpened(null)} />}
    {target?.kind === 'class' && <ClassDialog key={`${target.id}:${target.date}`} id={target.id} date={target.date} onClose={() => setOpened(null)} />}
    {target?.kind === 'exam' && <ExamDialog key={target.id} id={target.id} onClose={() => setOpened(null)} />}
  </FlowScope>;
}
