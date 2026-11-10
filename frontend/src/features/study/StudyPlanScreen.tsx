import { StudySyncStatus } from './components/StudySyncStatus';
import { DateField } from '../../shared/components/DateTimePicker';
import { studyViewData } from './studyView';
import StudySessionDialog from './StudyDialog';
import { FlowScope, NavigationScope } from '../../navigation/Navigation';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, IconButton, Row, Segments, Sheet, StateView, T } from '../../shared/components';
import useCurrentTime from '../../shared/hooks/useCurrentTime';
import { addDays, dateKey, dateLabel, parseDay } from '../../shared/utils/dates';
import { useApp } from '../../store/model';
import { StudySessionForm } from './StudyForm';
import { StudySessionCard } from './components';
import StudyWeekOverview from './components/StudyWeekOverview';
import TaskDialog from '../assignments/TaskDialog';
import { C, F, S } from '../../shared/theme';

export default function StudyPlan() {
  const { studySessions, studyConnection, prepareFocus, studyView, dispatchStudyView } = useApp();
  const today = dateKey(useCurrentTime());
  const { period, date: selected, filter } = studyView;
  const setSelected = (date: string) => dispatchStudyView({ type: 'date', date });
  const setPeriod = (value: string) => dispatchStudyView({ type: 'period', value });
  const setFilter = (value: string) => dispatchStudyView({ type: 'filter', value });
  const [create, setCreate] = useState(false); const [choosingDate, setChoosingDate] = useState(false);
  const [opened, setOpened] = useState<string | null>(null); const [taskId, setTaskId] = useState<string | null>(null);
  const { week, inRange, list, pending } = studyViewData(studySessions, studyView);
  const byWeek = period === 'Theo tuần';
  const loaded = !studyConnection || studyConnection.loaded;
  const firstDay = week[0]!, lastDay = week[6]!;
  const dateHeading = byWeek ? `${dateLabel(firstDay)} – ${dateLabel(lastDay)}`
    : parseDay(selected).toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  const year = byWeek && firstDay.slice(0, 4) !== lastDay.slice(0, 4)
    ? `${firstDay.slice(0, 4)} – ${lastDay.slice(0, 4)}` : selected.slice(0, 4);
  const openDay = (date: string) => { setSelected(date); setPeriod('Theo ngày'); };
  const focus = (id: string) => { const session = studySessions.find(s => s.id === id); if (session) prepareFocus({ courseId: session.courseId, taskId: session.taskId, sessionId: id }); };
  const go = (n: number) => setSelected(dateKey(addDays(parseDay(selected), n * (byWeek ? 7 : 1))));
  return <>
    <View style={{ gap: 10 }}>
      <Row between>
        <T accessibilityRole="header" style={[S.grow, { fontFamily: F.extra, fontSize: 22, lineHeight: 29, letterSpacing: -0.5 }]}>Tự học</T>
        <Button label="+ Buổi học" onPress={() => setCreate(true)} style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 8 }} />
      </Row>
      <Segments values={['Theo ngày', 'Theo tuần']} value={period} onChange={setPeriod} />
      <Row style={{ gap: 4 }}>
        <IconButton name="chevron-back" label="Khoảng tự học trước" bg={C.card} onPress={() => go(-1)} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Đổi ngày xem tự học, ${dateHeading}, ${year}`}
          onPress={() => setChoosingDate(true)} style={({ pressed }) => [S.grow, { minHeight: 44, alignItems: 'center',
            justifyContent: 'center', borderRadius: 12, backgroundColor: pressed ? C.soft : C.card, borderColor: C.line, borderWidth: 1 }]}>
          <T style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 17, textAlign: 'center' }}>{dateHeading}</T>
          <T style={{ color: C.muted, fontSize: 10, lineHeight: 15 }}>{!byWeek && selected === today ? 'Hôm nay · ' : ''}{year}</T>
        </Pressable>
        <IconButton name="chevron-forward" label="Khoảng tự học sau" bg={C.card} onPress={() => go(1)} />
        {(byWeek || selected !== today) && <Button label="Hôm nay" secondary onPress={() => openDay(today)}
          style={{ minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 }} />}
      </Row>
      {loaded && <T style={[S.small, { textAlign: 'center' }]}>
        {pending.length} buổi cần học · {pending.reduce((sum, session) => sum + session.duration, 0)} phút dự kiến · {inRange.length - pending.length} đã xong
      </T>}
      {loaded && <Segments values={['Tất cả', 'Chưa xong', 'Hoàn thành']} value={filter} onChange={setFilter} />}
    </View>
    <StudySyncStatus statusOnly />
    {loaded && (byWeek ? <StudyWeekOverview days={week} sessions={list} today={today} selected={selected} onOpenDay={openDay} />
      : list.map(session => <StudySessionCard key={session.id} session={session}
        onOpen={() => setOpened(session.id)} onFocus={() => focus(session.id)} />))}
    {loaded && !list.length && (!byWeek || !!inRange.length) && <StateView
      title={inRange.length ? 'Không có buổi phù hợp' : 'Ngày này chưa có buổi tự học'}
      message={inRange.length ? 'Chọn Tất cả để xem các buổi trong khoảng này.' : 'Bạn có thể lên kế hoạch cho một buổi học mới.'}
      actionLabel={inRange.length ? 'Xem tất cả buổi' : 'Thêm buổi tự học'} onAction={() => inRange.length ? setFilter('Tất cả') : setCreate(true)} />}
    <FlowScope onClose={() => { setCreate(false); setOpened(null); setTaskId(null); setChoosingDate(false); }}>
    {choosingDate && <Sheet title="Chọn ngày xem tự học" onClose={() => setChoosingDate(false)}><DateField label="Ngày xem tự học" value={selected} onChange={setSelected}/><Button label="Xem ngày đã chọn" onPress={() => setChoosingDate(false)}/></Sheet>}
    {create && <StudySessionForm initialDate={selected} onClose={() => setCreate(false)} onSaved={(_id,date) => { setCreate(false); if(date)setSelected(date); }} />}
    {opened && <NavigationScope active={!taskId}><StudySessionDialog id={opened} onClose={() => setOpened(null)} onTask={id => { setTaskId(id); }} /></NavigationScope>}
    {taskId && <TaskDialog key={taskId} taskId={taskId} onClose={() => setTaskId(null)} />}
    </FlowScope>
  </>;
}
