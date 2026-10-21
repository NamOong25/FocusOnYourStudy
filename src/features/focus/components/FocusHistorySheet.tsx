import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Card, Icon, Row, Segments, Sheet, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { addDays, dateKey, dateLabel } from '../../../shared/utils/dates';
import { focusClock, groupFocusRecords, type FocusRecord } from '../focus';

const periods = ['Hôm nay', '7 ngày', 'Tất cả'];
function dayTitle(day: string, now: Date) {
  const label = `${dateLabel(day)}/${day.slice(0, 4)}`;
  return `${day === dateKey(now) ? 'Hôm nay · ' : day === dateKey(addDays(now, -1)) ? 'Hôm qua · ' : ''}${label}`;
}
export function FocusHistorySheet({ records, now, onClose }: { records: FocusRecord[]; now: Date; onClose: () => void }) {
  const [period, setPeriod] = useState('Tất cả');
  const groups = groupFocusRecords(records, now).filter(group => period === 'Tất cả' || (period === 'Hôm nay' ? group.day === dateKey(now) : group.day >= dateKey(addDays(now, -6))));
  return <Sheet title="Lịch sử phiên học" onClose={onClose}>
    <T style={S.small}>Chỉ ghi phiên tập trung đã hoàn tất. Ngày học tính theo ngày kết thúc trên thiết bị; thời gian tạm dừng và nghỉ không cộng vào phút học.</T>
    <Segments values={periods} value={period} onChange={setPeriod} />
    {records.some(record => record.source === 'sample') && <Badge label="Có phiên dữ liệu mẫu" icon="flask-outline" />}
    {!groups.length && <Card style={{ gap: 10, alignItems: 'center' }}><Icon name="leaf-outline" size={28} /><T style={{ fontFamily: F.bold }}>Chưa có phiên hoàn tất</T><T style={[S.small, { textAlign: 'center' }]}>Hoàn thành một phiên 25 phút để xem thời gian học tại đây.</T></Card>}
    {groups.map(group => <View key={group.day} style={{ gap: 10 }}>
      <View style={{ gap: 4 }}><T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 16 }}>{dayTitle(group.day, now)}</T><T style={S.small}>{group.entries.length} phiên · {Math.floor(group.seconds / 60)} phút học</T></View>
      {group.entries.map(record => {
        const crossesDay = dateKey(new Date(record.startedAt)) !== dateKey(new Date(record.endedAt));
        return <Card key={record.id} style={{ gap: 9 }}>
          <Row between><Badge label={`${Math.floor(record.studySeconds / 60)} phút học`} icon="checkmark-circle-outline" bg={C.greenSoft} color={C.green} />{record.source === 'sample' && <Badge label="Mẫu" />}</Row>
          <T style={{ fontFamily: F.bold, fontSize: 15 }}>{record.studyTitle ?? record.taskTitle ?? 'Tập trung theo môn'}</T>
          <T style={{ color: C.primary, fontSize: 12, lineHeight: 20 }}>{record.courseName}</T>
          <T style={S.small}>{record.taskTitle ? `Bài tập: ${record.taskTitle}` : 'Không liên kết bài tập'}</T>
          <Row style={{ gap: 7 }}><Icon name="time-outline" size={15} /><T style={[S.small, S.grow]}>{crossesDay ? `${dateLabel(dateKey(new Date(record.startedAt)))} ` : ''}{focusClock(record.startedAt)} – {crossesDay ? `${dateLabel(dateKey(new Date(record.endedAt)))} ` : ''}{focusClock(record.endedAt)}</T></Row>
          {record.pausedSeconds > 0 && <T style={S.small}>Đã loại trừ {record.pausedSeconds < 60 ? `${record.pausedSeconds} giây` : `${Math.floor(record.pausedSeconds / 60)} phút ${record.pausedSeconds % 60} giây`} tạm dừng.</T>}
        </Card>;
      })}
    </View>)}
  </Sheet>;
}
