import React, { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Icon, IconButton, Row, Sheet, StateView, T } from '../../../shared/components';
import { DateField } from '../../../shared/components/DateTimePicker';
import { C, F, S } from '../../../shared/theme';
import { API_BASE_URL } from '../../../shared/api/config';
import { useAuth } from '../../account/auth/AuthProvider';
import { FlowScope } from '../../../navigation/Navigation';
import { usePomodoro } from '../api/PomodoroProvider';
import { usePomodoroRead } from '../api/usePomodoroInsights';
import { createStreakApi, shiftStreakMonth, streakKey } from '../api/pomodoroStreakApi';
import { usePomodoroProgress } from '../api/PomodoroProgressProvider';

const dateLabel = (date: string) => date.split('-').reverse().join('/');
export default function ServerFocusCalendarSheet({ onClose }: { onClose: () => void }) {
  const auth = useAuth(), progress = usePomodoroProgress(), { state: timer } = usePomodoro();
  const [choice, setChoice] = useState<string | null>(null), [picking, setPicking] = useState(false), [draft, setDraft] = useState('');
  const confirmedToday = useRef(progress.data?.streak.today ?? '');
  if (progress.data) confirmedToday.current = progress.data.streak.today;
  const month = choice ?? confirmedToday.current.slice(0, 7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const api = useMemo(() => createStreakApi(API_BASE_URL, auth.authorized), [auth.authorized]);
  const revision = [timer.last?.id, timer.last?.version, timer.last?.status, confirmedToday.current].join(':');
  const { state, reload } = usePomodoroRead(api.read, streakKey, { month, timeZone: progress.timeZone }, revision);
  const data = state.loaded && !state.loading && !state.error ? state.value : null;
  const calendar = data?.calendar;
  const selected = calendar?.days.find(day => day.date === selectedDate) ?? calendar?.days.find(day => day.date === data?.today) ?? calendar?.days[0];
  const offset = calendar ? (new Date(calendar.fromDate + 'T00:00:00Z').getUTCDay() + 6) % 7 : 0;
  const slots = calendar ? [...Array.from({ length: offset }, () => null), ...calendar.days] : [];
  while (slots.length % 7) slots.push(null);
  const weeks = Array.from({ length: slots.length / 7 }, (_, i) => slots.slice(i * 7, i * 7 + 7));
  const move = (direction: -1 | 1) => { try { return shiftStreakMonth(month, direction); } catch { return null; } };
  const previous = move(-1), next = move(1);
  return <FlowScope onClose={onClose}><Sheet title="Lịch ngày đã học" onClose={onClose}>
    <T style={S.small}>Toàn bộ tài khoản · {progress.timeZone}. Mỗi ngày có ít nhất một phiên hoàn tất được đánh dấu đã học.</T>
    <Row between style={{ gap: 8 }}><IconButton label="Lịch học tháng trước" name="chevron-back" disabled={!previous} onPress={() => { if (previous) setChoice(previous); }} />
      <View style={[S.grow, { gap: 5 }]}><T style={{ fontFamily: F.bold, fontSize: 16, textAlign: 'center' }}>Tháng {Number(month.slice(5))}/{month.slice(0, 4)}</T><Button label="Chọn tháng lịch học" secondary onPress={() => { setDraft(month + '-01'); setPicking(value => !value); }} /></View>
      <IconButton label="Lịch học tháng sau" name="chevron-forward" disabled={!next} onPress={() => { if (next) setChoice(next); }} /></Row>
    <Button label="Về tháng hiện tại" secondary onPress={() => setChoice(null)} />
    {picking && <><DateField label="Ngày trong tháng lịch học" value={draft} onChange={setDraft} /><Button label="Áp dụng tháng lịch học" onPress={() => { if (/^(19|20)\d\d-(0[1-9]|1[0-2])-\d\d$/.test(draft)) { setChoice(draft.slice(0, 7)); setPicking(false); } }} /></>}
    {state.error ? <StateView kind="error" title="Chưa tải được lịch ngày học" message={state.error.message} actionLabel="Thử lại lịch ngày học" onAction={() => { void reload().catch(() => {}); }} />
      : !calendar || !data ? <StateView kind="loading" title="Đang tải lịch ngày học" message="Đọc các ngày đã hoàn tất phiên trong tháng." />
        : <>
          <T testID="server-study-calendar-summary" style={{ fontFamily: F.semi, color: C.primary }}>{calendar.studiedDays} ngày học · {calendar.completedSessions} phiên hoàn tất</T>
          <Row style={{ gap: 4 }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <T key={label} style={{ flex: 1, textAlign: 'center', color: C.muted, fontSize: 11 }}>{label}</T>)}</Row>
          <View style={{ gap: 5 }}>{weeks.map((week, i) => <Row key={i} style={{ gap: 4 }}>{week.map((day, j) => day ? <Pressable key={day.date} accessibilityRole="button" accessibilityLabel={`Ngày học ${dateLabel(day.date)}: ${day.studied ? 'Đã học' : day.date > data.today ? 'Chưa đến ngày' : 'Chưa học'}, ${day.completedSessions} phiên, ${day.studySeconds / 60} phút${day.date === data.today ? ', hôm nay' : ''}`} accessibilityState={{ selected: selected?.date === day.date }} aria-pressed={selected?.date === day.date} onPress={() => setSelectedDate(day.date)} style={{ flex: 1, minWidth: 0, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: day.studied ? C.greenSoft : C.canvas, borderWidth: selected?.date === day.date ? 2 : day.date === data.today ? 1 : 0, borderColor: C.primary, opacity: day.date > data.today ? 0.5 : 1 }}>
            <T style={{ fontFamily: F.bold, fontSize: 12, color: day.studied ? C.green : C.ink }}>{Number(day.date.slice(8))}</T>{day.studied && <Icon name="checkmark" color={C.green} size={12} />}
          </Pressable> : <View key={'empty' + j} style={{ flex: 1, height: 46 }} />)}</Row>)}</View>
          <Row style={{ gap: 16 }}><Row><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.green }} /><T style={S.small}>Đã học</T></Row><T style={S.small}>Viền tím: ngày đang xem</T></Row>
          {selected && <Card style={{ backgroundColor: C.canvas, padding: 14, gap: 7 }}><T style={{ fontFamily: F.bold }}>{dateLabel(selected.date)}{selected.date === data.today ? ' · Hôm nay' : ''}</T><T testID="server-study-calendar-detail" style={{ color: selected.studied ? C.green : C.muted, lineHeight: 21 }}>{selected.from === selected.to ? 'Ngày này không tồn tại trong múi giờ đang xem.' : selected.date > data.today ? 'Ngày này chưa đến.' : selected.studied ? `${selected.completedSessions} phiên hoàn tất · ${selected.studySeconds / 60} phút học` : 'Chưa có phiên hoàn tất trong ngày này.'}</T></Card>}
          {!calendar.studiedDays && <T style={S.small}>Tháng này chưa có ngày học được ghi nhận. Chọn tháng khác hoặc hoàn tất một phiên để bắt đầu.</T>}
        </>}
    <T style={S.small}>Đổi tháng chỉ đổi lịch hiển thị. Chuỗi hiện tại và chuỗi dài nhất vẫn tính trên toàn tài khoản đến hôm nay.</T>
  </Sheet></FlowScope>;
}
