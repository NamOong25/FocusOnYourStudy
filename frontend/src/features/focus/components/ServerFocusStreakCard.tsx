import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Icon, Row, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { usePomodoroProgress } from '../api/PomodoroProgressProvider';
import ServerFocusCalendarSheet from './ServerFocusCalendarSheet';

export default function ServerFocusStreakCard({ compact = false }: { compact?: boolean }) {
  const { state, data, reload } = usePomodoroProgress(), [calendar, setCalendar] = useState(false);
  const streak = data?.streak;
  const content = <>
    {(!compact || !!streak) && <>
    <Row style={{ gap: 10 }}><Icon name="flame-outline" color={C.amber} size={24} /><T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 16 }}>Chuỗi ngày học</T></Row>
    {state.error ? <StateView kind="error" title="Chưa tải được chuỗi ngày" message={state.error.message} actionLabel="Thử lại chuỗi ngày" onAction={() => { void reload().catch(() => {}); }} />
      : !streak ? <StateView kind="loading" title="Đang đọc chuỗi ngày học" message="Đọc thành tích từ các phiên đã hoàn tất." />
        : <>
          <Row style={{ gap: 15 }}><View style={[S.grow, { gap: 4 }]}><T style={S.small}>Hiện tại</T><T testID="server-current-streak" style={{ fontFamily: F.extra, fontSize: compact ? 23 : 29, color: C.primary }}>{streak.currentStreakDays} ngày</T></View><View style={[S.grow, { gap: 4 }]}><T style={S.small}>Dài nhất</T><T testID="server-longest-streak" style={{ fontFamily: F.bold, fontSize: compact ? 21 : 25 }}>{streak.longestStreakDays} ngày</T></View></Row>
          <T style={{ color: streak.studiedToday ? C.green : C.muted, lineHeight: 21, fontSize: 12 }}>{streak.studiedToday ? 'Hôm nay bạn đã giữ nhịp học.' : streak.currentStreakDays ? 'Chuỗi đang được giữ đến hôm qua. Hoàn tất một phiên hôm nay để nối tiếp nhé.' : streak.totalStudiedDays ? 'Bắt đầu lại bằng một phiên hôm nay. Thành tích dài nhất vẫn được giữ.' : 'Hoàn tất phiên đầu tiên để bắt đầu chuỗi ngày học.'}</T>
          <T style={[S.small, { fontSize: 10 }]}>Toàn bộ tài khoản · Mỗi ngày có ít nhất một phiên hoàn tất.</T>
          <Button label="Xem lịch ngày học" secondary icon="calendar-outline" onPress={() => setCalendar(true)} />
        </>}
    </>}
    {calendar && <ServerFocusCalendarSheet onClose={() => setCalendar(false)} />}
  </>;
  return compact ? <View style={{ gap: 12 }}>{content}</View> : <Card style={{ gap: 15 }}>{content}</Card>;
}
