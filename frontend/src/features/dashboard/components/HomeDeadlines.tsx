import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Icon, Section, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import { taskDeadlineLabel, taskDeadlineTime, taskIsOverdue, type Task } from '../../assignments/assignments';
import { AssignmentSyncStatus } from '../../assignments/components/AssignmentSyncStatus';
import type { Course } from '../../academics/academic';
import type { Exam } from '../../schedule/calendar';
import { useServerExamList } from '../../exams/api/useServerExams';
import { projectExamOverview } from '../../exams/examOverview';
import { zonedDay } from '../../study/studyTime';
import { examClock } from '../../exams/examView';

export default function HomeDeadlines({ semesterId, courses, task, previewExam, now, today, connected, active,
  onTask, onExam, onViewAll }: {
  semesterId: string; courses: Course[]; task?: Task; previewExam?: Exam; now: Date; today: string;
  connected: boolean; active: boolean;
  onTask: (task: Task) => void; onExam: (id: string) => void; onViewAll: () => void;
}) {
  const scope = useNavigationScope();
  const { courseConnection, semesterConnection } = useApp();
  const query = connected ? { semesterId } : null;
  const source = useServerExamList(query, scope.active && active);
  const data = query ? projectExamOverview(source, courses, query, now.getTime()) : null;
  const next = data?.next;
  const exam = connected ? next && {
    id: next.id,
    title: courses.find(course => course.id === next.courseId)!.name,
    date: zonedDay(Date.parse(next.startsAt), next.timeZone),
    time: examClock(next.startsAt, next.timeZone),
  } : previewExam && { id: previewExam.id, title: previewExam.course, date: previewExam.date, time: previewExam.time };
  const overdue = !!task && taskIsOverdue(task, now);
  const examError = source.error?.message ?? (data?.catalogueMismatch ? 'Thông tin môn của lịch thi cần được cập nhật.' : '');
  const reload = () => { void Promise.allSettled([source.reload(), courseConnection?.reload(), semesterConnection?.reload()]); };

  return <View style={styles.section}>
    <Section title="Hạn nộp & lịch thi" action="Xem tất cả" onAction={onViewAll} />
    <AssignmentSyncStatus statusOnly />
    <Card style={styles.card}>
      {task && <DeadlineRow title={task.title} caption={overdue ? 'Quá hạn' : 'Hạn nộp'}
        time={task.deadline === today ? taskDeadlineTime(task) : dateLabel(task.deadline)}
        accessibilityTime={taskDeadlineLabel(task)} background={overdue ? C.redSoft : C.soft}
        color={overdue ? C.red : C.primary} onPress={() => onTask(task)} />}
      {exam && <DeadlineRow title={exam.title} caption="Lịch thi" time={exam.date === today ? exam.time : dateLabel(exam.date)}
        accessibilityTime={`${dateLabel(exam.date)} lúc ${exam.time}`}
        background="#FFF0BF" color="#765000" separated={!!task} onPress={() => onExam(exam.id)} />}
      {examError ? <>
        <T style={S.small} accessibilityRole="alert">{examError}</T>
        <Button label="Thử tải lại lịch thi" secondary loading={source.loading} onPress={reload} />
      </> : connected && !source.loaded ? <T style={S.small} accessibilityLiveRegion="polite">Đang tải lịch thi…</T>
        : !task && !exam ? <T style={S.small}>Chưa có hạn nộp hoặc kỳ thi sắp tới.</T> : null}
    </Card>
  </View>;
}

function DeadlineRow({ title, caption, time, accessibilityTime, background, color, separated, onPress }: {
  title: string; caption: string; time: string; accessibilityTime: string; background: string; color: string;
  separated?: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${caption}, ${title}, ${accessibilityTime}`} onPress={onPress}
    style={({ pressed }) => [styles.row, separated && styles.divider, pressed && { opacity: 0.65 }]}>
    <T style={[styles.time, { color, backgroundColor: background }]}>{time}</T>
    <View style={S.grow}><T style={styles.title} numberOfLines={2}>{title}</T><T style={S.small}>{caption}</T></View>
    <Icon name="chevron-forward" size={15} color={C.muted} />
  </Pressable>;
}

const styles = StyleSheet.create({
  section: { gap: 5 },
  card: { paddingHorizontal: 12, paddingVertical: 8, gap: 5 },
  row: { ...S.row, minHeight: 48, gap: 9, paddingVertical: 6 },
  divider: { borderTopWidth: 1, borderColor: C.line },
  time: { minWidth: 52, textAlign: 'center', paddingVertical: 4, paddingHorizontal: 5, borderRadius: 8, fontFamily: F.bold, fontSize: 12, lineHeight: 18 },
  title: { fontFamily: F.bold, fontSize: 13, lineHeight: 19 },
});
