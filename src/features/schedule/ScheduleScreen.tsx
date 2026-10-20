import { FlowScope } from '../../navigation/Navigation';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Icon, IconButton, IconTile, Row, Section, Segments, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { ExamDialog } from '../exams/Exams';
import { ClassItem, addDays, dateKey, dateLabel, today, useApp } from '../../store/model';

export default function Schedule({ onClass, onNewClass }: { onClass: (c: ClassItem, date?: string) => void; onNewClass: () => void }) {
  const { getClassesOn, exams } = useApp(); const [examId, setExamId] = useState<string | null>(null); const [view, setView] = useState('Theo ngày'); const [selected, setSelected] = useState(new Date(today));
  const monday = addDays(selected, -((selected.getDay() + 6) % 7)); const week = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const first = new Date(selected.getFullYear(), selected.getMonth(), 1); const monthStart = addDays(first, -((first.getDay() + 6) % 7)); const month = Array.from({ length: 42 }, (_, i) => addDays(monthStart, i));
  const classList = (date: Date) => getClassesOn(dateKey(date));
  const go = (direction: number) => { if (view === 'Theo tháng') setSelected(new Date(selected.getFullYear(), selected.getMonth() + direction, 1)); else setSelected(addDays(selected, direction * 7)); };

  return <FlowScope onClose={() => setExamId(null)}>
    <Row><View style={S.grow}><Segments values={['Theo ngày', 'Theo tuần', 'Theo tháng']} value={view} onChange={setView} /></View><IconButton name="add" label="Thêm lịch học" onPress={onNewClass} /></Row>
    <Card style={{ gap: 13, padding: 16 }}>
      <Row between><T style={{ fontFamily: F.bold, fontSize: 16 }}>Tháng {String(selected.getMonth() + 1).padStart(2, '0')}, {selected.getFullYear()}</T><Row><IconButton name="chevron-back" bg="#fff" label="Khoảng trước" onPress={() => go(-1)} /><IconButton name="chevron-forward" bg="#fff" label="Khoảng sau" onPress={() => go(1)} /></Row></Row>
      <View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <T key={d} style={{ width: `${100/7}%`, textAlign: 'center', fontSize: 11, color: C.muted }}>{d}</T>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>{(view === 'Theo tháng' ? month : week).map(date => { const active = dateKey(date) === dateKey(selected); const hasClass = classList(date).length > 0 || exams.some(e => e.date === dateKey(date)); return <Pressable key={dateKey(date)} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString('vi-VN')} accessibilityState={{ selected: active }} onPress={() => setSelected(date)} style={{ width: `${100/7}%`, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><View style={{ alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: active ? C.primary : 'transparent', width: 37, minHeight: 47, borderRadius: 13 }}><T style={{ fontFamily: active ? F.bold : F.medium, fontSize: 14, color: active ? '#fff' : date.getMonth() !== selected.getMonth() ? '#B7B7C4' : C.ink }}>{date.getDate()}</T><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: hasClass ? active ? '#fff' : C.lavender : 'transparent' }} /></View></Pressable>; })}</View>
      {dateKey(selected) !== dateKey(today) && <Button label="Về hôm nay" secondary onPress={() => setSelected(new Date(today))} />}
    </Card>
    <Section title={view === 'Theo tuần' ? 'Lịch học trong tuần' : dateKey(selected) === dateKey(today) ? 'Lịch học hôm nay' : `Lịch học ${dateLabel(dateKey(selected))}`} icon="calendar-outline" action="+ Thêm ca" onAction={onNewClass} />
    {(view === 'Theo tuần' ? week : [selected]).map(date => <View key={dateKey(date)} style={{ gap: 12 }}>
      {view === 'Theo tuần' && <T style={{ fontFamily: F.bold, color: C.primary, marginTop: 5 }}>{date.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</T>}
      {classList(date).length === 0 ? <Card><T style={S.small}>Chưa có ca học. Một khoảng trống để tự học hoặc nghỉ ngơi.</T></Card> : classList(date).map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Xem buổi học ${item.title}`} onPress={() => onClass(item, dateKey(date))}><Card style={{ gap: 13, backgroundColor: item.cancelled ? '#FFF6F4' : C.card }}><Row style={{ gap: 12 }}><IconTile name={item.courseId === 'course-dsa' ? 'git-network-outline' : 'code-slash-outline'} /><View style={S.grow}><Badge label={item.cancelled ? 'Đã nghỉ' : item.changed ? 'Đã điều chỉnh' : item.start < '12:00' ? 'Ca sáng' : 'Ca chiều'} bg={item.cancelled ? C.redSoft : item.changed ? C.amberSoft : C.track} color={item.cancelled ? C.red : item.changed ? C.amber : C.muted} /><T style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 23, marginTop: 4, color: item.cancelled ? C.muted : C.ink, textDecorationLine: item.cancelled ? 'line-through' : 'none' }}>{item.title}</T><T style={{ fontSize: 11, color: C.muted }}>GV: {item.teacher}</T></View><Icon name="ellipsis-vertical" color={C.muted} size={18} /></Row><Row between style={{ backgroundColor: C.canvas, padding: 10, borderRadius: 13 }}><Row style={{ gap: 5 }}><Icon name="time-outline" size={15} /><T style={{ fontSize: 12 }}>{item.start} – {item.end}</T></Row><Row style={{ gap: 5 }}><Icon name="business-outline" size={15} /><T style={{ fontSize: 12 }}>{item.room}</T></Row></Row></Card></Pressable>)}
      {exams.filter(e => e.date === dateKey(date)).map(exam => <Pressable key={exam.id} accessibilityRole="button" accessibilityLabel={`Xem kỳ thi ${exam.course}`} onPress={() => setExamId(exam.id)}><Card style={{ backgroundColor: C.amberSoft, gap: 6 }}><Row><Icon name="reader-outline" color={C.amber} /><T style={{ fontFamily: F.bold, color: C.amber }}>Thi: {exam.course}</T></Row><T style={{ fontSize: 12 }}>{exam.time} – {exam.end} · {exam.room}</T><T style={S.small}>{exam.type}</T></Card></Pressable>)}
    </View>)}
    {examId && <ExamDialog id={examId} onClose={() => setExamId(null)} />}
  </FlowScope>;
}
