import { StateView } from '../../shared/components';
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, IconTile, Progress, Row, Sheet, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { C, F, S } from '../../shared/theme';
import { useApp } from '../../store/model';
import useCurrentTime from '../../shared/hooks/useCurrentTime';
import { focusSummary } from './focus';
import { FocusGoalCard, FocusGoalSheet } from './components/FocusGoalCard';
import { FocusStreakCard } from './components/FocusStreakCard';
import { FocusHistorySheet } from './components/FocusHistorySheet';
import {useAuth} from '../account/auth/AuthProvider';
import ServerFocusScreen from './components/ServerFocusScreen';
import FocusSetup, { focusHeading } from './components/FocusSetup';
import LocalFocusTimer from './components/LocalFocusTimer';

export default function Focus({ onStudyPlan }: { onStudyPlan: () => void }) {
  const auth=useAuth();return auth.hasSession?<ServerFocusScreen onStudyPlan={onStudyPlan}/>:<PreviewFocus onStudyPlan={onStudyPlan}/>;
}
function PreviewFocus({ onStudyPlan }: { onStudyPlan: () => void }) {
  const { mode, setMode, focusCourse, focusCourseId, prepareFocus, focusTaskId, focusSessionId, tasks, studySessions, focusRecords, dailyFocusGoal, setDailyFocusGoal, setTab, courseCatalog, setScheduleMode, setToast } = useApp();
  const clock = useCurrentTime();
  // Refresh immediately on completion and at midnight, without deriving dates from a fixed sample day.
  const now = useMemo(() => new Date(), [clock, focusRecords]);
  const summary = focusSummary(focusRecords, dailyFocusGoal, now);
  const focusedSession = studySessions.find(s => s.id === focusSessionId); const focusedTask = tasks.find(t => t.id === focusTaskId);
  const [choose, setChoose] = useState(false); const [showHistory, setShowHistory] = useState(false); const [showGoal, setShowGoal] = useState(false);
  return <>
    <T accessibilityRole="header" style={focusHeading}>Tập trung</T>
    {!courseCatalog.length ? <StateView title="Chọn một môn để bắt đầu tập trung" message="Thêm môn học trước. Sau đó bạn có thể gắn phiên Pomodoro với bài tập hoặc buổi tự học." actionLabel="Thêm môn học đầu tiên" onAction={() => setScheduleMode('Môn & học kỳ')} /> : <>
    <FocusSetup title={focusCourse} detail={focusedSession?.title ?? focusedTask?.title} chooseLabel="Đổi môn học"
      onChoose={() => setChoose(true)} mode={mode} onMode={setMode} />
    <LocalFocusTimer />
    </>}
    <FocusGoalCard goal={dailyFocusGoal} summary={summary} onEdit={() => setShowGoal(true)} />
    <FocusStreakCard summary={summary} />
    <Button label="Xem lịch sử theo ngày" secondary icon="list-outline" onPress={() => setShowHistory(true)} />
    {focusRecords.some(record => record.source === 'sample') && <T style={S.small}>Có 3 phiên mẫu được cộng vào số liệu 7 ngày.</T>}
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
