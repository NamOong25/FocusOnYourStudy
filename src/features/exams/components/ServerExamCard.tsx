import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, IconTile, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import type { Course } from '../../academics/academic';
import { examFormats, examKinds, type ServerExam } from '../api/examsApi';
import { examDate, examProgress, examReminderText, examTiming } from '../examView';

export default function ServerExamCard({ exam, course, now, onOpen }: { exam: ServerExam; course: Course; now: number; onOpen: () => void }) {
  const past = Date.parse(exam.endsAt) <= now;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem lịch thi ${course.name} ngày ${examDate(exam)}`} onPress={onOpen}>
    <Card style={{ gap: 15 }}>
      <Row style={{ gap: 11 }}><IconTile name={exam.format === 'PRACTICAL' ? 'code-slash-outline' : 'reader-outline'} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 16, lineHeight: 24 }}>{course.name}</T><T style={{ fontSize: 11, color: C.muted }}>{course.code} · {examKinds[exam.kind]} · {examFormats[exam.format]}</T></View><Icon name="chevron-forward" size={17} /></Row>
      <Row between><Badge label={examProgress(exam, now)} bg={past ? C.track : C.soft} color={past ? C.muted : C.primary} /><T style={{ fontSize: 11, color: C.muted }}>{examDate(exam)}</T></Row>
      <Row style={{ backgroundColor: C.canvas, borderRadius: 17, padding: 13 }}><Icon name="time-outline" size={17} /><View style={S.grow}><T style={{ fontFamily: F.semi, fontSize: 12 }}>{examTiming(exam)}</T><T style={S.small}>{exam.room ? `Phòng ${exam.room}` : 'Chưa có phòng thi'}</T></View></Row>
      <T style={S.small}>{exam.timeZone}</T><Row style={{ alignItems: 'flex-start', gap: 7 }}><Icon name="notifications-outline" size={16} /><T style={[S.small, S.grow]}>{examReminderText(exam)}</T></Row>
    </Card>
  </Pressable>;
}
