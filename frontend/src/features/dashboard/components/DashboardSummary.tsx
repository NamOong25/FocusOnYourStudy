import React from 'react';
import {Pressable,StyleSheet,Text} from 'react-native';
import {Card,Icon,Progress,Row,T} from '../../../shared/components';
import {formatGpa} from '../../grades/grades';
import type {dashboardData} from '../dashboard';
import {C,F,S} from '../../../shared/theme';

type GpaDisplay = { value: string; caption: string } | 'error';

export default function DashboardSummary({ data, onGrades, gpa }: {
  data: ReturnType<typeof dashboardData>;
  onGrades: () => void;
  gpa?: GpaDisplay;
}) {
  const display = gpa ?? {
    value: formatGpa(data.summary.gpa),
    caption: `${data.summary.scoredCredits} tín chỉ tính GPA · Điểm đã nhập`,
  };
  return (
    <Row style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel="Dashboard: xem điểm học kỳ" onPress={onGrades} style={[S.card, S.grow, styles.tile]}>
        <Icon name="school-outline" />
        <T style={S.small}>GPA học kỳ</T>
        {display === 'error' ? <T accessibilityRole="alert" style={{ color: C.red }}>Chưa tải được điểm</T> : <>
          <T testID="dashboard-gpa" style={[styles.value, { color: C.primary }]}>
            {display.value}<Text style={styles.scale}> /4</Text>
          </T>
          <T style={styles.caption}>{display.caption}</T>
        </>}
      </Pressable>
      <Card style={[S.grow, styles.tile]}>
        <Icon name="checkmark-circle-outline" color={C.green} />
        <T style={S.small}>Bài tập hoàn tất</T>
        <T testID="dashboard-task-percent" style={[styles.value, { color: C.green }]}>{data.tasks.length ? `${data.percent}%` : '—'}</T>
        <Progress value={data.percent} />
        <T testID="dashboard-task-count" style={styles.caption}>{data.done}/{data.tasks.length} bài tập</T>
      </Card>
    </Row>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'stretch', gap: 10 },
  tile: { padding: 15, gap: 9 },
  value: { fontFamily: F.extra, fontSize: 28, lineHeight: 38 },
  scale: { fontFamily: F.regular, fontSize: 11, color: C.muted },
  caption: { fontSize: 10, lineHeight: 17, color: C.muted },
});
