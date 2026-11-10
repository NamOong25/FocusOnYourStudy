import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import type { Course } from '../../academics/academic';
import { examFormats, examKinds, type ServerExam } from '../api/examsApi';
import { examCountdownLabel } from '../examOverview';
import { examDate, examProgress, examTiming } from '../examView';

export default function ExamListCard({ exam, course, now, featured, onOpen }: {
  exam: ServerExam; course: Course; now: number; featured: boolean; onOpen: () => void;
}) {
  const date = examDate(exam);
  const [day, month, year] = date.split('/');
  const time = examTiming(exam);
  const room = exam.room ? `Phòng ${exam.room}` : 'Chưa có phòng thi';
  const progress = featured ? examCountdownLabel(exam, now) : examProgress(exam, now);
  const past = Date.parse(exam.endsAt) <= now;

  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem lịch thi ${course.name} ngày ${date}`}
    accessibilityHint={`${time}. ${room}. ${progress}.`} onPress={onOpen}
    style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}>
    <Card style={{ gap: 8, padding: 12, borderRadius: 18, backgroundColor: featured ? C.soft : C.card, borderColor: featured ? C.lavender : C.line }}>
      {featured && <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 6, rowGap: 4 }}>
        <T style={{ color: C.primary, fontFamily: F.extra, fontSize: 10, lineHeight: 16, letterSpacing: 0.6 }}>KỲ THI GẦN NHẤT</T>
        <Badge label={progress} icon="hourglass-outline" bg={C.card} />
      </Row>}
      <Row style={{ alignItems: 'flex-start', gap: 10 }}>
        <View style={{ minWidth: 55, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 7,
          borderRadius: 12, backgroundColor: featured ? C.card : C.canvas }}>
          <T style={{ color: past ? C.muted : C.primary, fontFamily: F.extra, fontSize: 15, lineHeight: 21 }}>{day}/{month}</T>
          <T style={S.small}>{year}</T>
        </View>
        <View style={[S.grow, { gap: 2 }]}>
          <T style={{ fontFamily: featured ? F.extra : F.bold, fontSize: featured ? 17 : 15, lineHeight: 23 }}>{course.name}</T>
          <T style={S.small}>{examKinds[exam.kind]} · {examFormats[exam.format]}</T>
          <T style={{ fontFamily: F.semi, fontSize: 12, lineHeight: 19 }}>{time} · {room}</T>
          <T style={S.small}>{exam.timeZone}</T>
          {!featured && <T style={{ fontFamily: F.semi, color: past ? C.muted : C.primary, fontSize: 11, lineHeight: 17 }}>{progress}</T>}
        </View>
        <Icon name="chevron-forward" size={17} color={featured ? C.primary : C.muted} />
      </Row>
    </Card>
  </Pressable>;
}
