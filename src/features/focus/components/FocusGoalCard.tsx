import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Icon, Link, Progress, Row, Sheet, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { maxFocusGoal, type focusSummary } from '../focus';

type Summary = ReturnType<typeof focusSummary>;
export function FocusGoalCard({ goal, summary, onEdit }: { goal: number; summary: Summary; onEdit: () => void }) {
  return <>
    <Card style={{ gap: 14 }}>
      <Row between><T style={{ fontFamily: F.bold, fontSize: 16 }}>Mục tiêu hôm nay</T><Link label="Sửa mục tiêu" onPress={onEdit} /></Row>
      <Row between><T style={{ fontFamily: F.extra, fontSize: 30, color: C.primary }}>{summary.completed} / {goal} <T style={S.small}>phiên</T></T><Badge label={`${goal * 25} phút`} icon="ribbon-outline" /></Row>
      <Progress value={summary.progress} />
      <T style={S.small}>{summary.remaining ? `Còn ${summary.remaining} phiên để đạt mục tiêu. Từng bước nhỏ thôi!` : 'Bạn đã đạt mục tiêu hôm nay. Làm tốt lắm!'}</T>
    </Card>
    <Row style={{ alignItems: 'stretch', gap: 12 }}>
      <Card style={[S.grow, { gap: 8 }]}><Icon name="time-outline" /><T style={S.small}>Học hôm nay</T><T style={{ fontFamily: F.extra, fontSize: 26 }}>{summary.todayMinutes}<T style={S.small}> phút</T></T><T style={S.small}>{summary.completed} phiên đã hoàn tất</T></Card>
      <Card style={[S.grow, { gap: 8 }]}><Icon name="calendar-outline" /><T style={S.small}>7 ngày gần nhất</T><T style={{ fontFamily: F.extra, fontSize: 26 }}>{summary.weekMinutes}<T style={S.small}> phút</T></T><T style={S.small}>Gồm cả hôm nay</T></Card>
    </Row>
  </>;
}

export function FocusGoalSheet({ goal, onSave, onClose }: { goal: number; onSave: (goal: number) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(goal);
  return <Sheet title="Mục tiêu tập trung" onClose={onClose}>
    <T style={S.body}>Bạn muốn hoàn thành bao nhiêu phiên mỗi ngày?</T>
    <T style={S.small}>Một phiên tập trung là 25 phút. Thời gian nghỉ không tính vào mục tiêu.</T>
    <View accessibilityRole="radiogroup" accessibilityLabel="Số phiên mục tiêu mỗi ngày" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {Array.from({ length: maxFocusGoal }, (_, i) => i + 1).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Mục tiêu ${value} phiên`} accessibilityState={{ checked: draft === value }} onPress={() => setDraft(value)} style={{ width: '30%', flexGrow: 1, minHeight: 50, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: draft === value ? C.primary : C.line, backgroundColor: draft === value ? C.soft : C.canvas }}><T style={{ fontFamily: F.bold, color: draft === value ? C.primary : C.ink }}>{value} phiên</T></Pressable>)}
    </View>
    <Card style={{ gap: 8, backgroundColor: C.soft }}><T style={{ fontFamily: F.bold, color: C.primary }}>{draft} phiên · {draft * 25} phút học mỗi ngày</T><T style={S.small}>Đổi mục tiêu cập nhật tiến độ ngay, giữ nguyên các phiên đã học.</T></Card>
    <Button label="Lưu mục tiêu" icon="checkmark" onPress={() => { onSave(draft); onClose(); }} />
    <Button label="Hủy thay đổi" secondary onPress={onClose} />
  </Sheet>;
}
