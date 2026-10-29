import React from 'react';
import { View } from 'react-native';
import { Button, Card, IconButton, IconTile, Row, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { usePomodoroProgress } from '../../focus/api/PomodoroProgressProvider';
import ServerFocusStreakCard from '../../focus/components/ServerFocusStreakCard';

export default function ServerDashboardPomodoro() {
  const { state, data, reload, timeZone } = usePomodoroProgress(), { setTab } = useApp(), daily = data?.daily;
  return <Card style={{ gap: 15 }}>
    <Row between style={{ gap: 8 }}><Row style={[S.grow, { gap: 10 }]}><IconTile name="timer-outline" size={38} /><T accessibilityRole="header" style={[S.grow, { fontFamily: F.bold, fontSize: 17 }]}>Nhịp học hôm nay</T></Row><IconButton label="Cập nhật nhịp học hôm nay" name="refresh-outline" disabled={state.loading} onPress={() => { void reload().catch(() => {}); }} /></Row>
    {state.error ? <StateView kind="error" title="Chưa tải được nhịp học" message={state.error.message} actionLabel="Thử lại nhịp học" onAction={() => { void reload().catch(() => {}); }} />
      : !daily ? <StateView kind="loading" title="Đang tải nhịp học hôm nay" message="Đọc thời gian học, số phiên và mục tiêu ngày." />
        : <>
          <T style={S.small}>{daily.date.split('-').reverse().join('/')} · {timeZone}</T>
          <Row style={{ alignItems: 'stretch', gap: 12 }}><View style={[S.grow, { gap: 5 }]}><T style={S.small}>Thời gian học</T><T testID="server-home-focus-minutes" style={{ fontFamily: F.extra, fontSize: 25, color: C.primary }}>{daily.studySeconds / 60} phút</T></View><View style={[S.grow, { gap: 5 }]}><T style={S.small}>Phiên hoàn tất</T><T testID="server-home-focus-count" style={{ fontFamily: F.extra, fontSize: 25, color: C.green }}>{daily.completedSessions}/{daily.goal.dailySessions}</T></View></Row>
          <View accessibilityRole="progressbar" accessibilityLabel="Mục tiêu học hôm nay trên Trang chủ" accessibilityValue={{ min: 0, max: 100, now: daily.progressPercent }} aria-valuemin={0} aria-valuemax={100} aria-valuenow={daily.progressPercent} style={{ height: 8, borderRadius: 8, overflow: 'hidden', backgroundColor: C.track }}><View style={{ height: '100%', width: `${daily.progressPercent}%`, backgroundColor: daily.goalReached ? C.green : C.primary }} /></View>
          <T style={S.small}>{daily.goalReached ? 'Bạn đã đạt mục tiêu hôm nay.' : daily.completedSessions ? `Còn ${daily.remainingSessions} phiên để đạt mục tiêu hôm nay.` : 'Chưa có phiên hoàn tất hôm nay. Bắt đầu từ một việc nhỏ nhé.'}</T>
          <Button label="Đến Tập trung" icon="play" onPress={() => setTab('focus')} />
          <T style={[S.small, { fontSize: 10 }]}>Nhịp học tính toàn bộ tài khoản, không thay đổi theo học kỳ đang xem trên Trang chủ.</T>
        </>}
    <View style={{ borderTopWidth: daily ? 1 : 0, borderColor: C.line, paddingTop: daily ? 15 : 0 }}><ServerFocusStreakCard compact /></View>
  </Card>;
}
