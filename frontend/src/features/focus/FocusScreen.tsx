import React, { useMemo, useState } from 'react';
import { Link, Sheet, StateView, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { S } from '../../shared/theme';
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

export default function Focus() {
  const auth=useAuth();return auth.hasSession?<ServerFocusScreen/>:<PreviewFocus/>;
}
function PreviewFocus() {
  const { mode, setMode, focusCourse, focusCourseId, prepareFocus, focusTaskId, tasks, focusRecords, dailyFocusGoal, setDailyFocusGoal, setTab, courseCatalog, setScheduleMode, setToast } = useApp();
  const clock = useCurrentTime();
  // Refresh immediately on completion and at midnight, without deriving dates from a fixed sample day.
  const now = useMemo(() => new Date(), [clock, focusRecords]);
  const summary = focusSummary(focusRecords, dailyFocusGoal, now);
  const focusedTask = tasks.find(t => t.id === focusTaskId);
  const [panel, setPanel] = useState<'course' | 'history' | 'goal' | 'streak' | null>(null);
  const close = () => setPanel(null);
  return <>
    <T accessibilityRole="header" style={focusHeading}>Tập trung</T>
    <FocusSetup mode={mode} onMode={setMode} />
    {mode === 0 && !courseCatalog.length
      ? <StateView title="Chọn một môn để bắt đầu tập trung" message="Thêm môn học để bắt đầu phiên Pomodoro." actionLabel="Thêm môn học đầu tiên" onAction={() => setScheduleMode('Môn & học kỳ')} />
      : <LocalFocusTimer>{mode === 0 && <FocusCourseSelector title={focusCourse} detail={focusedTask?.title}
        onChoose={() => setPanel('course')} />}</LocalFocusTimer>}
    <FocusGoalCard goal={dailyFocusGoal} summary={summary} onEdit={() => setPanel('goal')} />
    <FocusActivityLinks onHistory={() => setPanel('history')} onStreak={() => setPanel('streak')} />
    <Link label="Lên kế hoạch với Trợ lý AI" onPress={() => setTab('ai')} />
    {panel === 'course' && <Sheet title="Chọn môn để tập trung" onClose={close}><CourseChoices value={focusCourseId} onChange={v => { prepareFocus({ courseId: v }); close(); }} /><T style={S.small}>Đổi môn sẽ bỏ liên kết với bài tập đang chọn.</T></Sheet>}
    {panel === 'history' && <FocusHistorySheet records={focusRecords} now={now} onClose={close} />}
    {panel === 'streak' && <Sheet title="Chuỗi ngày học" onClose={close}><FocusStreakCard summary={summary} /></Sheet>}
    {panel === 'goal' && <FocusGoalSheet goal={dailyFocusGoal} onClose={close} onSave={goal => { setDailyFocusGoal(goal); setToast(`Đã lưu mục tiêu ${goal} phiên mỗi ngày.`); }} />}
  </>;
}
