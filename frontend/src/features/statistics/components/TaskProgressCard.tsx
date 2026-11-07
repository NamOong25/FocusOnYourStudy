import React from 'react';
import { View } from 'react-native';
import { Button, Card, Progress, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import type { StatisticsData } from '../statistics';

export function TaskProgressCard({ tasks, onTasks }: { tasks: StatisticsData['tasks']; onTasks: () => void }) {
  return <Card style={{ gap: 16 }}>
    <T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 17 }}>Tiến độ bài tập</T>
    {tasks.total ? <>
      <Row style={{ flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}><T style={{ fontFamily: F.extra, fontSize: 37, color: C.primary }}>{tasks.percent}%</T><T style={S.small}>{tasks.done}/{tasks.total} bài đã hoàn thành</T></Row>
      <Progress value={tasks.percent} />
      <View style={{ gap: 9 }}>{[{ label: 'Hoàn thành', count: tasks.done, color: C.green }, { label: 'Chưa xong, còn hạn', count: tasks.notDue, color: C.purple }, { label: 'Chưa xong, quá hạn', count: tasks.overdue, color: C.red }].map(item => <Row key={item.label} between><Row style={S.grow}><View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: item.color }} /><T style={[S.small, S.grow]}>{item.label}</T></Row><T style={{ fontFamily: F.bold, fontSize: 13, color: item.color }}>{item.count}</T></Row>)}</View>
    </> : <T style={S.small}>Chưa có bài tập trong học kỳ này.</T>}
    <T style={S.small}>Toàn bộ bài tập của học kỳ đang chọn, không lọc theo khoảng ngày. Quá hạn xét cả ngày và giờ nộp ở hiện tại.</T>
    <Button label="Đến danh sách bài tập" secondary icon="clipboard-outline" onPress={onTasks} />
  </Card>;
}
