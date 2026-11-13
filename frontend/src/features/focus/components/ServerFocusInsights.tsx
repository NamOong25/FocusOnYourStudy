import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Link, Row, StateView, T } from '../../../shared/components';
import { C, S } from '../../../shared/theme';
import { usePomodoro } from '../api/PomodoroProvider';
import { pomodoroDay } from '../api/pomodoroInsightsApi';
import { usePomodoroGoal } from '../api/usePomodoroInsights';
import { usePomodoroProgress } from '../api/PomodoroProgressProvider';
import ServerFocusStreakCard from './ServerFocusStreakCard';
import ServerFocusGoalSheet from './ServerFocusGoalSheet';
import ServerFocusHistorySheet from './ServerFocusHistorySheet';
import FocusGoalProgress from './FocusGoalProgress';

export default function ServerFocusInsights() {
  const goal = usePomodoroGoal(), { state: timer } = usePomodoro();
  const progress = usePomodoroProgress(), { state, reload, timeZone: zone } = progress;
  const data = progress.data?.daily ?? null, date = data?.date ?? pomodoroDay(Date.now(), zone);
  const mutation = [timer.active?.row.id, timer.active?.row.version, timer.active?.row.status, timer.last?.id, timer.last?.version, timer.last?.status].join(':');
  const [editGoal, setEditGoal] = useState(false), [history, setHistory] = useState(false);
  const closeGoal = () => { goal.manager?.close(); setEditGoal(false); void reload().catch(() => {}); };
  return <>
    <View style={{ gap: 4 }}>
      {goal.state.pending && !goal.state.busy && <T accessibilityRole="alert" style={{ color: C.amber }}>Thay đổi mục tiêu đang chờ xác nhận. Mở “Sửa mục tiêu” để đối chiếu yêu cầu đã gửi.</T>}
      {state.error ? <StateView kind="error" title="Chưa đọc được tiến độ" message={state.error.message} actionLabel="Thử lại tiến độ" onAction={() => { void reload().catch(() => {}); }}/>
        : !data ? <StateView kind="loading" title="Đang tải tiến độ hôm nay" message="Đọc số phiên hoàn tất và mục tiêu trong tài khoản."/>
          : <FocusGoalProgress completed={data.completedSessions} goal={data.goal.dailySessions} testID="server-focus-daily-count" />}
      <Row between>
        <View style={S.grow}>{data && <T testID="server-focus-daily-minutes" style={S.small}>{data.studySeconds / 60} phút học · {data.goalReached ? 'Đã đạt mục tiêu' : `Còn ${data.remainingSessions} phiên`}</T>}</View>
        {!!goal.manager && !goal.state.busy && <Link label="Sửa mục tiêu" onPress={() => setEditGoal(true)} />}
      </Row>
    </View>
    <Button label="Xem lịch sử tập trung" secondary icon="time-outline" onPress={() => setHistory(true)}/>
    <ServerFocusStreakCard />
    {editGoal && goal.manager && <ServerFocusGoalSheet manager={goal.manager} state={goal.state} onClose={closeGoal}/>}
    {history && <ServerFocusHistorySheet timeZone={zone} today={date} revision={mutation} onClose={() => setHistory(false)}/>}
  </>;
}
