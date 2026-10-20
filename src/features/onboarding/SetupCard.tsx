import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Icon, Row, T } from '../../shared/components';
import { useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';

export default function SetupCard() {
  const { semesters, courseCatalog, tasks, setScheduleMode } = useApp();
  const steps = [{ label: 'Tạo học kỳ đầu tiên', done: !!semesters.length }, { label: 'Thêm môn học của bạn', done: !!courseCatalog.length }, { label: 'Ghi bài tập và hạn nộp', done: !!tasks.length }];
  const next = steps.find(step => !step.done);
  if (!next) return null;
  return <Card style={{ gap: 17 }}>
    <Badge label="BẮT ĐẦU TỪ MỘT VIỆC NHỎ" icon="leaf-outline" />
    <T style={{ fontFamily: F.extra, fontSize: 24, lineHeight: 34 }}>Góc học tập đang chờ bạn</T>
    <T style={S.small}>Chỉ cần vài bước để lịch học và công việc có chỗ riêng.</T>
    <View style={{ gap: 13 }}>{steps.map(step => <Row key={step.label}><Icon name={step.done ? 'checkmark-circle' : 'ellipse-outline'} color={step.done ? C.green : C.muted} /><T style={{ flex: 1, fontSize: 13, color: step.done ? C.green : C.ink }}>{step.label}</T></Row>)}</View>
    <Button label={next.label} icon="arrow-forward" onPress={() => setScheduleMode(tasks.length || !courseCatalog.length ? 'Môn & học kỳ' : 'Lịch & bài tập')} />
    <T style={{ fontSize: 11, color: C.muted }}>Dữ liệu của bạn chỉ nằm trong phiên thử này.</T>
  </Card>;
}
