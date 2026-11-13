import React, { useMemo, useState } from 'react';
import { Badge, Card, Link, Progress, Row, Sheet, StateView, T } from '../../shared/components';
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
import FocusSetup, { FocusCourseSelector, focusHeading } from './components/FocusSetup';
import LocalFocusTimer from './components/LocalFocusTimer';
import FocusActivityLinks from './components/FocusActivityLinks';

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
  const [panel, setPanel] = useState<'course' | 'history' | 'goal' | 'streak' | null>(null);
  const close = () => setPanel(null);
  return <>
    <T accessibilityRole="header" style={focusHeading}>Tập trung</T>
    <FocusSetup mode={mode} onMode={setMode} />
    {mode === 0 && !courseCatalog.length
      ? <StateView title="Chọn một môn để bắt đầu tập trung" message="Thêm môn học trước. Sau đó bạn có thể gắn phiên Pomodoro với bài tập hoặc buổi tự học." actionLabel="Thêm môn học đầu tiên" onAction={() => setScheduleMode('Môn & học kỳ')} />
      : <LocalFocusTimer>{mode === 0 && <FocusCourseSelector title={focusCourse} detail={focusedSession?.title ?? focusedTask?.title}
        onChoose={() => setPanel('course')} />}</LocalFocusTimer>}
    {mode === 0 && focusedSession && <Card style={{ backgroundColor: C.soft, gap: 9 }}><Row between><T style={{ fontFamily: F.bold, fontSize: 13 }}>Tiến độ buổi tự học</T><Badge label={focusedSession.status} bg="#FFFFFFAA" /></Row><Progress value={focusedSession.focusedSeconds / (focusedSession.duration * 60) * 100} /><T style={{ fontSize: 12 }}>{Math.floor(focusedSession.focusedSeconds / 60)} / {focusedSession.duration} phút Pomodoro hoàn tất trong phiên này</T></Card>}
    <FocusGoalCard goal={dailyFocusGoal} summary={summary} onEdit={() => setPanel('goal')} />
    <FocusActivityLinks onHistory={() => setPanel('history')} onStreak={() => setPanel('streak')} />
    <Link label="Xem kế hoạch tự học" onPress={onStudyPlan} />
    <Link label="Lên kế hoạch với Trợ lý AI" onPress={() => setTab('ai')} />
    {panel === 'course' && <Sheet title="Chọn môn để tập trung" onClose={close}><CourseChoices value={focusCourseId} onChange={v => { prepareFocus({ courseId: v }); close(); }} /><T style={S.small}>Đổi môn sẽ bắt đầu một phiên mới và bỏ liên kết buổi/bài đang chọn.</T></Sheet>}
    {panel === 'history' && <FocusHistorySheet records={focusRecords} now={now} onClose={close} />}
    {panel === 'streak' && <Sheet title="Chuỗi ngày học" onClose={close}><FocusStreakCard summary={summary} /></Sheet>}
    {panel === 'goal' && <FocusGoalSheet goal={dailyFocusGoal} onClose={close} onSave={goal => { setDailyFocusGoal(goal); setToast(`Đã lưu mục tiêu ${goal} phiên mỗi ngày.`); }} />}
  </>;
}
