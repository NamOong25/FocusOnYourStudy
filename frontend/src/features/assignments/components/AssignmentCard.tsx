import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { type Task, taskDeadlineLabel, taskDueLabel, taskIsOverdue } from '../assignments';
import { statisticsTaskTiming, statisticsTimeLabel, type AssignmentStatisticsLink } from '../assignmentStatisticsLink';

export default function AssignmentCard({ task, now, onPress, reference }: {
  task: Task; now: Date; onPress: () => void; reference?: AssignmentStatisticsLink;
}) {
  const timing = reference ? statisticsTaskTiming(task, reference) : null;
  const done = task.status === 'Hoàn thành';
  const late = timing?.overdue ?? taskIsOverdue(task, now);
  const color = done ? C.green : late ? C.red : C.primary;
  const statusColor = done ? C.green : task.status === 'Đang làm' ? C.blue : C.muted;
  const statusBackground = done ? C.greenSoft : task.status === 'Đang làm' ? C.blueSoft : C.track;
  const dueLabel = timing
    ? done ? 'Đã hoàn thành' : timing.overdue ? 'Quá hạn tại mốc thống kê' : timing.today ? 'Hạn hôm nay' : timing.soon ? 'Trong 7 ngày sắp tới' : 'Còn hạn'
    : taskDueLabel(task, now);
  const deadlineLabel = reference ? statisticsTimeLabel(task.dueAt!, reference.timeZone) : taskDeadlineLabel(task);

  return <Pressable accessibilityRole="button" accessibilityLabel={`Mở bài tập ${task.title}`}
    accessibilityHint={`${task.course}. Hạn nộp ${deadlineLabel}. ${task.status}.`} onPress={onPress}
    style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
    <Card style={{ gap: 9, padding: 13, borderRadius: 18, borderLeftWidth: 3, borderLeftColor: late ? C.red : done ? C.green : C.lavender }}>
      <Row between>
        <View style={[S.grow, { gap: 1 }]}>
          <T style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 22 }}>{task.title}</T>
          <T style={[S.small, { color: C.primary }]}>{task.course}</T>
        </View>
        <Icon name="chevron-forward" size={17} color={C.muted} />
      </Row>
      <Row style={{ flexWrap: 'wrap', columnGap: 10, rowGap: 4 }}>
        <Row style={{ gap: 5 }}>
          <Icon name="calendar-outline" size={14} color={C.muted} />
          <T style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 18 }}>Hạn nộp {deadlineLabel}</T>
        </Row>
        {!done && <T style={{ color, fontFamily: F.semi, fontSize: 11, lineHeight: 17 }}>{dueLabel}</T>}
      </Row>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        <Badge label={task.status} bg={statusBackground} color={statusColor} />
        {task.priority === 'Cao' && <Badge label="Ưu tiên cao" bg={C.amberSoft} color={C.amber} icon="flag-outline" />}
      </Row>
    </Card>
  </Pressable>;
}
