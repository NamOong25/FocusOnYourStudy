import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, IconTile, Row, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { usePomodoro } from '../api/PomodoroProvider';
import { pomodoroDay } from '../api/pomodoroInsightsApi';
import { usePomodoroGoal } from '../api/usePomodoroInsights';
import { usePomodoroProgress } from '../api/PomodoroProgressProvider';
import ServerFocusStreakCard from './ServerFocusStreakCard';
import ServerFocusGoalSheet from './ServerFocusGoalSheet';
import ServerFocusHistorySheet from './ServerFocusHistorySheet';

export default function ServerFocusInsights() {
  const goal = usePomodoroGoal(), { state: timer } = usePomodoro();
  const progress = usePomodoroProgress(), { state, reload, timeZone: zone } = progress;
  const data = progress.data?.daily ?? null, date = data?.date ?? pomodoroDay(Date.now(), zone);
  const mutation = [timer.active?.row.id, timer.active?.row.version, timer.active?.row.status, timer.last?.id, timer.last?.version, timer.last?.status].join(':');
  const [editGoal, setEditGoal] = useState(false), [history, setHistory] = useState(false);
  const closeGoal = () => { goal.manager?.close(); setEditGoal(false); void reload().catch(() => {}); };
  return <>
    <Card style={{ gap: 15 }}><Row between style={{ gap: 10, flexWrap: 'wrap' }}><Row style={{ gap: 10, flexGrow: 1, flexShrink: 1, minWidth: 150 }}><IconTile name="flag-outline" size={40}/><T style={{ fontFamily: F.bold, fontSize: 17, flexShrink: 1 }}>Mục tiêu hôm nay</T></Row><Button label="Sửa mục tiêu" secondary style={{ paddingHorizontal: 14 }} disabled={!goal.manager || !!goal.state.busy} onPress={() => setEditGoal(true)}/></Row>
      <T style={S.small}>{date.split('-').reverse().join('/')} · {zone}</T>
      {goal.state.pending && !goal.state.busy && <T accessibilityRole="alert" style={{ color: C.amber }}>Thay đổi mục tiêu đang chờ xác nhận. Mở “Sửa mục tiêu” để đối chiếu yêu cầu đã gửi.</T>}
      {state.error ? <StateView kind="error" title="Chưa đọc được tiến độ" message={state.error.message} actionLabel="Thử lại tiến độ" onAction={() => { void reload().catch(() => {}); }}/>
        : !data ? <StateView kind="loading" title="Đang tải tiến độ hôm nay" message="Đọc số phiên hoàn tất và mục tiêu trong tài khoản."/>
          : <><Row between><View style={{ gap: 5 }}><T testID="server-focus-daily-count" style={{ fontFamily: F.extra, fontSize: 31, color: C.primary }}>{data.completedSessions}/{data.goal.dailySessions}</T><T style={S.small}>phiên hoàn tất</T></View><View style={{ gap: 5, alignItems: 'flex-end' }}><T testID="server-focus-daily-minutes" style={{ fontFamily: F.bold, fontSize: 24 }}>{data.studySeconds / 60} phút</T><T style={S.small}>học được công nhận</T></View></Row>
            <View accessibilityRole="progressbar" accessibilityLabel="Tiến độ mục tiêu ngày" accessibilityValue={{ min: 0, max: 100, now: data.progressPercent }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.progressPercent} style={{ height: 9, borderRadius: 8, backgroundColor: C.line, overflow: 'hidden' }}><View style={{ height: 9, borderRadius: 8, width: `${data.progressPercent}%`, backgroundColor: data.goalReached ? C.green : C.primary }}/></View>
            <T style={{ color: data.goalReached ? C.green : C.muted, lineHeight: 21 }}>{data.goalReached ? 'Bạn đã đạt mục tiêu hôm nay. Nghỉ ngơi một chút nhé!' : data.completedSessions === 0 ? 'Chưa có phiên hoàn tất hôm nay. Bắt đầu một việc nhỏ nhé.' : `Còn ${data.remainingSessions} phiên để đạt mục tiêu hôm nay.`}</T>
            <T style={S.small}>Tính theo ngày kết thúc phiên. Phiên đang học, tạm dừng hoặc đã hủy chưa được cộng.</T></>}
    </Card>
    <Button label="Xem lịch sử tập trung" secondary icon="time-outline" onPress={() => setHistory(true)}/>
    <ServerFocusStreakCard />
    {editGoal && goal.manager && <ServerFocusGoalSheet manager={goal.manager} state={goal.state} onClose={closeGoal}/>}
    {history && <ServerFocusHistorySheet timeZone={zone} today={date} revision={mutation} onClose={() => setHistory(false)}/>}
  </>;
}
