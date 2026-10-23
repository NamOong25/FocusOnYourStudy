import { StateView } from '../../shared/components';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Badge, Button, Card, IconButton, IconTile, Progress, Row, Segments, Sheet, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { C, F, S } from '../../shared/theme';
import { useApp } from '../../store/model';
import useCurrentTime from '../../shared/hooks/useCurrentTime';
import { focusDurations, focusSummary } from './focus';
import { FocusGoalCard, FocusGoalSheet } from './components/FocusGoalCard';
import { FocusStreakCard } from './components/FocusStreakCard';
import { FocusHistorySheet } from './components/FocusHistorySheet';

const modes = ["Tập trung 25′", "Nghỉ ngắn 5′", "Nghỉ dài 15′"];
export default function Focus({ onStudyPlan }: { onStudyPlan: () => void }) {
  const { mode, setMode, seconds, running, toggleTimer, resetTimer, focusCourse, focusCourseId, prepareFocus, focusTaskId, focusSessionId, tasks, studySessions, focusRecords, dailyFocusGoal, setDailyFocusGoal, timerProgress, setTab, courseCatalog, setScheduleMode, setToast } = useApp();
  const clock = useCurrentTime();
  // Refresh immediately on completion and at midnight, without deriving dates from a fixed sample day.
  const now = useMemo(() => new Date(), [clock, focusRecords]);
  const summary = focusSummary(focusRecords, dailyFocusGoal, now);
  const focusedSession = studySessions.find(s => s.id === focusSessionId); const focusedTask = tasks.find(t => t.id === focusTaskId);
  const [choose, setChoose] = useState(false); const [showHistory, setShowHistory] = useState(false); const [showGoal, setShowGoal] = useState(false);
  const hasProgress = seconds > 0 && seconds < focusDurations[mode]!;
  const radius = 121, circumference = 2 * Math.PI * radius;
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0'); const secs = (seconds % 60).toString().padStart(2, '0');
  return <>
    <Card style={{ gap: 12 }}><Row style={{ gap: 12 }}><IconTile name="flame-outline" size={48} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 17 }}>Giữ nhịp học mỗi ngày</T><T style={S.small}>Một phiên học, một bước tiến</T></View></Row>{focusRecords.some(record => record.source === 'sample') && <T style={S.small}>Có 3 phiên mẫu ở các ngày trước để xem lịch sử và chuỗi ngày học. Phiên mẫu được cộng vào số liệu 7 ngày.</T>}</Card>
    {!courseCatalog.length ? <StateView title="Chọn một môn để bắt đầu tập trung" message="Thêm môn học trước. Sau đó bạn có thể gắn phiên Pomodoro với bài tập hoặc buổi tự học." actionLabel="Thêm môn học đầu tiên" onAction={() => setScheduleMode('Môn & học kỳ')} /> : <>
    <Card style={{ gap: 12 }}><Row between><T style={{ fontSize: 10, color: C.muted, fontFamily: F.semi, letterSpacing: 1 }}>MÔN HỌC ĐANG TẬP TRUNG</T><IconButton name="swap-horizontal" label="Đổi môn học" onPress={() => setChoose(true)} bg={C.canvas} /></Row><Row style={{ gap: 12 }}><IconTile name="git-network-outline" size={49} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 25 }}>{focusCourse}</T><T style={{ fontSize: 12, lineHeight: 20, color: C.muted, marginTop: 3 }}>{focusedSession?.title ?? focusedTask?.title ?? 'Chọn một việc nhỏ, tập trung làm hết mình.'}</T></View></Row></Card>
    <Segments values={modes} value={modes[mode]!} onChange={v => { if (modes.indexOf(v) !== mode) setMode(modes.indexOf(v)); }} />
    <View style={{ alignItems: 'center', paddingVertical: 24 }}>
      <View style={{ width: '100%', maxWidth: 286, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width="100%" height="100%" style={{ position: 'absolute' }} viewBox="0 0 286 286"><Circle cx="143" cy="143" r={radius} stroke={C.track} strokeWidth="12" fill="none" /><Circle cx="143" cy="143" r={radius} stroke={C.purple} strokeWidth="12" fill="none" strokeDasharray={`${circumference}`} strokeDashoffset={circumference * (1 - Math.max(0.008, timerProgress))} strokeLinecap="round" transform="rotate(-90 143 143)" /></Svg>
        <View style={{ gap: 12, alignItems: 'center' }}><Badge label={seconds === 0 ? 'ĐÃ HOÀN TẤT' : mode > 0 ? 'THẢ LỎNG MỘT CHÚT' : running ? 'ĐANG HỌC SÂU' : hasProgress ? 'ĐANG TẠM DỪNG' : 'SẴN SÀNG TẬP TRUNG'} icon="ellipse" /><T accessibilityLiveRegion="none" style={{ fontFamily: F.extra, fontSize: 53, lineHeight: 70, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>{minutes}:{secs}</T><T style={{ fontSize: 12, color: C.muted }}>{mode > 0 ? 'Nghỉ ngơi không cộng vào phút học' : `${summary.completed} phiên hoàn tất hôm nay`}</T></View>
      </View>
    </View>
    <Row style={{ justifyContent: 'center', gap: 12, marginBottom: 4 }}><IconButton name="refresh-outline" label="Đặt lại đồng hồ" onPress={resetTimer} bg="#fff" /><Button label={running ? 'Tạm dừng' : seconds === 0 ? (mode === 0 ? 'Học lại' : 'Nghỉ lại') : hasProgress ? 'Tiếp tục' : 'Bắt đầu'} icon={running ? 'pause' : 'play'} onPress={toggleTimer} style={{ minWidth: 135, minHeight: 60, boxShadow: '0px 8px 22px rgba(108,92,231,0.22)' }} /><IconButton name="list-outline" label="Lịch sử phiên học" onPress={() => setShowHistory(true)} bg="#fff" /></Row>
    <T style={[S.small, { textAlign: 'center' }]}>Đổi chế độ, đổi môn hoặc đặt lại sẽ bỏ phần phiên chưa hoàn tất. Tạm dừng để học tiếp phiên đang dở.</T>
    </>}
    <FocusGoalCard goal={dailyFocusGoal} summary={summary} onEdit={() => setShowGoal(true)} />
    <FocusStreakCard summary={summary} />
    <Button label="Xem lịch sử theo ngày" secondary icon="list-outline" onPress={() => setShowHistory(true)} />
    <Card style={{ backgroundColor: '#EAE4FF' }}><Row style={{ gap: 12 }}><IconTile name="sparkles" bg={C.primary} color="#fff" /><View style={S.grow}><T style={{ fontFamily: F.bold, color: C.primary, fontSize: 13 }}>Nghỉ ngơi cũng là một phần của học tập</T><T style={{ fontSize: 12, lineHeight: 21, marginTop: 5 }}>Sau mỗi phiên, hãy nhìn xa và vận động nhẹ để bắt đầu phiên tiếp theo thoải mái hơn.</T></View></Row></Card>
    <Button label="Lên kế hoạch với Trợ lý AI" secondary icon="sparkles-outline" onPress={() => setTab('ai')} />
    <Button label="Xem kế hoạch tự học" secondary icon="calendar-outline" onPress={onStudyPlan} />
    {(focusedTask || focusedSession) && <T style={S.small}>Phiên Pomodoro chỉ ghi thời gian cho nội dung đã chọn. Hoàn thành một buổi học không tự hoàn thành bài tập.</T>}
    {focusedSession && <Card style={{ backgroundColor: C.soft, gap: 9 }}><Row between><T style={{ fontFamily: F.bold, fontSize: 13 }}>Tiến độ buổi tự học</T><Badge label={focusedSession.status} bg="#FFFFFFAA" /></Row><Progress value={focusedSession.focusedSeconds / (focusedSession.duration * 60) * 100} /><T style={{ fontSize: 12 }}>{Math.floor(focusedSession.focusedSeconds / 60)} / {focusedSession.duration} phút Pomodoro hoàn tất trong phiên này</T></Card>}
    {choose && <Sheet title="Chọn môn để tập trung" onClose={() => setChoose(false)}><CourseChoices value={focusCourseId} onChange={v => { prepareFocus({ courseId: v }); setChoose(false); }} /><T style={S.small}>Đổi môn sẽ bắt đầu một phiên mới và bỏ liên kết buổi/bài đang chọn.</T></Sheet>}
    {showHistory && <FocusHistorySheet records={focusRecords} now={now} onClose={() => setShowHistory(false)} />}
    {showGoal && <FocusGoalSheet goal={dailyFocusGoal} onClose={() => setShowGoal(false)} onSave={goal => { setDailyFocusGoal(goal); setToast(`Đã lưu mục tiêu ${goal} phiên mỗi ngày.`); }} />}
  </>;
}
