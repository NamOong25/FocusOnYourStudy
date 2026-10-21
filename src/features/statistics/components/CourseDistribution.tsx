import React from 'react';
import { View } from 'react-native';
import { Card, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { formatStudyTime, type StatisticsData } from '../statistics';

const colors = [C.primary, '#9785F3', C.green, C.blue, C.amber];
export function CourseDistribution({ courses }: { courses: StatisticsData['distribution'] }) {
  return <Card style={{ gap: 18 }}>
    <T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 17 }}>Phân bổ theo môn</T>
    {courses.map((course, index) => <View key={course.id} style={{ gap: 8 }}>
      <Row style={{ alignItems: 'flex-start', gap: 8 }}><View style={{ width: 9, height: 9, borderRadius: 5, marginTop: 5, backgroundColor: colors[index % colors.length] }} /><View style={[S.grow, { gap: 3 }]}><T style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 21 }}>{course.name}</T><T style={{ fontSize: 10, color: C.muted }}>{course.code ?? 'Môn đã xóa khỏi danh sách'} · {course.sessions} phiên{course.archived ? ' · Lịch sử được giữ lại' : ''}</T></View></Row>
      <Row between><T style={S.small}>{formatStudyTime(course.seconds)}</T><T style={{ fontFamily: F.bold, color: colors[index % colors.length], fontSize: 12 }}>{Math.round(course.percent * 10) / 10}%</T></Row>
      <View style={{ height: 7, borderRadius: 8, overflow: 'hidden', backgroundColor: C.track }}><View style={{ width: `${course.percent}%`, height: '100%', borderRadius: 8, backgroundColor: colors[index % colors.length] }} /></View>
    </View>)}
  </Card>;
}
