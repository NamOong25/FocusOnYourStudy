import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import type { Course } from '../../academics/academic';
import { examFormats, examKinds, type ServerExam } from '../../exams/api/examsApi';
import { examCountdownLabel } from '../../exams/examOverview';
import { examDate, examTiming } from '../../exams/examView';

export default function ServerNearestExamCard({ exam, course, now, stale, onOpen }: { exam: ServerExam; course: Course; now: number; stale: boolean; onOpen: () => void }) {
  return <Pressable testID="dashboard-next-exam" accessibilityRole="button" accessibilityLabel={`Dashboard: lịch thi ${course.name} ngày ${examDate(exam)}`} onPress={onOpen}>
    <Card style={{ backgroundColor: C.amberSoft, gap: 14 }}>
      {stale && <T style={S.small}>Bản đã tải trước đó · Cần cập nhật lịch thi</T>}
      <Row between style={{ flexWrap: 'wrap' }}><Badge label={examCountdownLabel(exam, now)} bg="#FFFFFFBB" color={C.amber} icon="hourglass-outline" /><Icon name="chevron-forward" color={C.amber} size={18} /></Row>
      <T style={{ fontFamily: F.extra, fontSize: 21, lineHeight: 30 }}>{course.name}</T>
      <T style={{ fontSize: 12, color: C.amber }}>{examKinds[exam.kind]} · {examFormats[exam.format]}</T>
      <Row><Icon name="calendar-outline" color={C.amber} size={17} /><View style={S.grow}><T style={{ fontFamily: F.semi, fontSize: 13 }}>{examDate(exam)} · {examTiming(exam)}</T><T style={{ fontSize: 12, color: C.muted, marginTop: 5 }}>{exam.room ? `Phòng ${exam.room}` : 'Chưa có phòng thi'}</T></View></Row>
      <T style={S.small}>Múi giờ: {exam.timeZone} · Chạm để xem chi tiết</T>
    </Card>
  </Pressable>;
}
