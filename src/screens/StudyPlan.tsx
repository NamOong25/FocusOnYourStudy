import StudySessionDialog from '../StudyDialog';
import { FlowScope, NavigationScope } from '../Navigation';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Icon, IconButton, IconTile, Row, Segments, Sheet, T } from '../components';
import { addDays, dateKey, dateLabel, parseDay, today, useApp } from '../model';
import { endTime } from '../learning';
import { StudySessionForm } from '../studyForms';
import { StudySessionCard } from '../studyComponents';
import TaskDialog from '../TaskDialog';
import { C, F, S } from '../theme';

export default function StudyPlan() {
  const { studySessions, prepareFocus } = useApp();
  const [period, setPeriod] = useState('Theo ngày'); const [selected, setSelected] = useState(dateKey(today));
  const [filter, setFilter] = useState('Tất cả'); const [create, setCreate] = useState(false);
  const [opened, setOpened] = useState<string | null>(null); const [taskId, setTaskId] = useState<string | null>(null);
  const monday = addDays(parseDay(selected), -((parseDay(selected).getDay() + 6) % 7));
  const week = Array.from({ length: 7 }, (_, i) => dateKey(addDays(monday, i)));
  const days = period === 'Theo ngày' ? [selected] : week;
  const inRange = studySessions.filter(s => days.includes(s.date));
  const list = inRange.filter(s => filter === 'Tất cả' || (filter === 'Hoàn thành' ? s.status === 'Hoàn thành' : s.status !== 'Hoàn thành')).sort((a,b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
  const pending = inRange.filter(s => s.status !== 'Hoàn thành');
  const focus = (id: string) => { const session = studySessions.find(s => s.id === id); if (session) prepareFocus({ courseId: session.courseId, taskId: session.taskId, sessionId: id }); };
  const go = (n: number) => setSelected(dateKey(addDays(parseDay(selected), n * (period === 'Theo ngày' ? 1 : 7))));
  return <>
    <View style={{ gap: 5, marginTop: 5 }}><T style={{ fontFamily: F.bold, fontSize: 10, color: C.primary, letterSpacing: 1.2 }}>KHÔNG GIAN TỰ HỌC</T><T style={{ fontFamily: F.extra, fontSize: 26, lineHeight: 37, letterSpacing: -0.6 }}>Học từng chút,{"\n"}tiến xa hơn.</T><T style={{ color: C.muted, fontSize: 12 }}>Dành thời gian cụ thể cho điều bạn muốn hoàn thành.</T></View>
    <Row style={{ alignItems: 'stretch', gap: 9 }}>{[{ value: `${pending.length}`, label: 'Buổi cần học', icon: 'book-outline' as const }, { value: `${pending.reduce((sum,s) => sum + s.duration, 0)}′`, label: 'Dự kiến còn lại', icon: 'time-outline' as const }, { value: `${inRange.length - pending.length}`, label: 'Buổi đã xong', icon: 'checkmark-circle-outline' as const }].map(m => <Card key={m.label} style={[S.grow, { padding: 13, gap: 7 }]}><IconTile name={m.icon} size={31} /><T style={{ fontFamily: F.extra, color: C.primary, fontSize: 26, lineHeight: 36 }}>{m.value}</T><T style={{ fontSize: 10, lineHeight: 17, color: C.muted }}>{m.label}</T></Card>)}</Row>
    <Button label="Lên kế hoạch mới" icon="add-circle-outline" onPress={() => setCreate(true)} />
    <Segments values={['Theo ngày', 'Theo tuần']} value={period} onChange={setPeriod} />
    <Card style={{ padding: 12 }}><Row between><IconButton name="chevron-back" label="Khoảng tự học trước" bg="#fff" onPress={() => go(-1)} /><View style={{ flex: 1, alignItems: 'center' }}><T style={{ fontFamily: F.bold, fontSize: 14 }}>{period === 'Theo ngày' ? parseDay(selected).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' }) : `${dateLabel(week[0]!)} – ${dateLabel(week[6]!)}`}</T><T style={{ color: C.muted, fontSize: 10 }}>{period === 'Theo ngày' && selected === dateKey(today) ? 'Hôm nay · ' : ''}{parseDay(selected).getFullYear()}</T></View><IconButton name="chevron-forward" label="Khoảng tự học sau" bg="#fff" onPress={() => go(1)} /></Row>{selected !== dateKey(today) && <Button label="Về lịch hôm nay" secondary onPress={() => setSelected(dateKey(today))} />}</Card>
    <Segments values={['Tất cả', 'Chưa xong', 'Hoàn thành']} value={filter} onChange={setFilter} />
    {days.filter(day => list.some(s => s.date === day)).map(day => <View key={day} style={{ gap: 13 }}>{period === 'Theo tuần' && <Row><Icon name="calendar-outline" size={17} /><T style={{ fontFamily: F.bold }}>{parseDay(day).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</T></Row>}{list.filter(s => s.date === day).map(s => <StudySessionCard key={s.id} session={s} onOpen={() => setOpened(s.id)} onFocus={() => focus(s.id)} />)}</View>)}
    {list.length === 0 && <Card style={{ alignItems: 'center', paddingVertical: 28, gap: 11 }}><IconTile name="leaf-outline" size={57} /><T style={{ fontFamily: F.bold, fontSize: 17 }}>Một khoảng trống cho bạn</T><T style={[S.small, { textAlign: 'center' }]}>{inRange.length ? 'Chưa có buổi học phù hợp với bộ lọc này.' : 'Lên một buổi học ngắn, hoặc dành thời gian nghỉ ngơi để sẵn sàng cho ngày tiếp theo.'}</T><Button label={inRange.length ? 'Xem tất cả buổi' : 'Thêm buổi tự học'} secondary onPress={() => inRange.length ? setFilter('Tất cả') : setCreate(true)} /></Card>}
    <T style={{ color: C.muted, fontSize: 11, lineHeight: 19, textAlign: 'center' }}>Buổi tự học và bài phải nộp có trạng thái riêng.{"\n"}Bạn có thể học một môn mà không gắn với bài tập.</T>
    <FlowScope onClose={() => { setCreate(false); setOpened(null); setTaskId(null); }}>
    {create && <StudySessionForm initialDate={selected} onClose={() => setCreate(false)} />}
    {opened && <NavigationScope active={!taskId}><StudySessionDialog id={opened} onClose={() => setOpened(null)} onTask={id => { setTaskId(id); }} /></NavigationScope>}
    {taskId && <TaskDialog key={taskId} taskId={taskId} onClose={() => setTaskId(null)} />}
    </FlowScope>
  </>;
}
