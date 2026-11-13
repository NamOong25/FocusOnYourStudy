import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Icon, Section, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateKey, dateLabel, parseDay } from '../../../shared/utils/dates';
import { useApp } from '../../../store/model';
import type { Course } from '../../academics/academic';
import type { ClassOccurrence } from '../../schedule/calendar';
import { occurrenceClock, occurrenceStatus, projectOverview } from '../../schedule/overview/overview';
import { useScheduleOverview } from '../../schedule/overview/useScheduleOverview';
import OverviewSyncStatus from '../../schedule/overview/components/OverviewSyncStatus';
import { StudySyncStatus } from '../../study/components/StudySyncStatus';
import type { StudySession } from '../../study/learning';
import { meetingPlatforms, type ClassFormat } from '../../schedule/classFormat';

type AgendaRow = { id: string; time: string; title: string; detail: string; tone?: 'online' | 'practice' | 'study'; onPress: () => void };

function lessonDisplay({ meetingPlatform, lessonType, room }: Pick<ClassFormat, 'meetingPlatform' | 'lessonType'> & { room: string }) {
  const platform = meetingPlatform && meetingPlatform !== 'NONE' ? meetingPlatforms[meetingPlatform] : null;
  const practice = lessonType === 'PRACTICE';
  return {
    tone: platform ? 'online' as const : practice ? 'practice' as const : undefined,
    detail: [practice && 'Thực hành', platform ? `Online · ${platform}` : room && `Phòng ${room}`].filter(Boolean).join(' · '),
  };
}

export default function HomeAgenda({ semesterId, courses, now, day, weekStart, classes, sessions, onClass, onStudyPlan }: {
  semesterId: string; courses: Course[]; now: Date; day: string; weekStart: string; classes: ClassOccurrence[];
  sessions: StudySession[]; onClass: (item: ClassOccurrence, date: string) => void; onStudyPlan: (date?: string) => void;
}) {
  const { courseConnection, semesterConnection, studyConnection, openSavedSchedule, prepareFocus } = useApp();
  const connected = !!semesterConnection, today = day === dateKey(now);
  const source = useScheduleOverview(connected ? { semesterId, today: weekStart } : null);
  const title = (id: string) => courses.find(course => course.id === id)?.name ?? 'Môn chưa được tải';
  const showSchedule = (date: string) => openSavedSchedule(semesterId, date);
  const classRows: AgendaRow[] = connected ? projectOverview(source, parseDay(day)).today.map(row => {
    const clock = occurrenceClock(row);
    const lesson = lessonDisplay(row);
    return { id: `class-${row.scheduleId}:${row.date}`, time: clock.date < day ? '00:00' : clock.start,
      title: title(row.courseId), tone: lesson.tone,
      detail: [lesson.detail, row.changed && 'Đã điều chỉnh', today && occurrenceStatus(row, now)].filter(Boolean).join(' · '),
      onPress: () => showSchedule(row.date) };
  }) : classes.map(item => {
    const lesson = lessonDisplay(item);
    return { id: `class-${item.id}`, time: item.start, title: item.title, tone: lesson.tone,
      detail: [lesson.detail, item.changed && 'Đã điều chỉnh'].filter(Boolean).join(' · '), onPress: () => onClass(item, day) };
  });
  const rows: AgendaRow[] = [...classRows, ...sessions.filter(session => session.date === day).map(session => ({
    id: `study-${session.id}`, time: session.start, title: session.title, tone: 'study' as const,
    detail: `Tự học · ${session.duration} phút${session.status === 'Hoàn thành' ? ' · Hoàn thành' : ''}`,
    onPress: () => session.status === 'Hoàn thành' || !today ? onStudyPlan(day) : prepareFocus({ courseId: session.courseId, taskId: session.taskId, sessionId: session.id }),
  }))].sort((a, b) => a.time.localeCompare(b.time));
  const next = connected && today ? projectOverview(source, now).next : undefined;
  const nextClock = next && occurrenceClock(next);
  const reload = () => { void Promise.allSettled([source.reload(), courseConnection?.reload()]); };
  const scheduleReady = !connected || source.loaded && !source.loading && !source.error && !studyConnection?.error && !studyConnection?.needsReload;

  return <View style={styles.section}>
    <Section title={today ? 'Lịch hôm nay' : `Lịch ngày ${dateLabel(day)}`} action="Xem lịch" onAction={() => showSchedule(day)} />
    {connected && <OverviewSyncStatus source={source} label="Tải lại lịch học" reload={reload} statusOnly />}
    <StudySyncStatus statusOnly />
    {!!rows.length && <Card style={styles.card}>{rows.map((row, index) => <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`${row.time} ${row.title}${row.detail ? `, ${row.detail}` : ''}`} onPress={row.onPress}
      style={({ pressed }) => [styles.row, index > 0 && styles.divider, pressed && { opacity: 0.65 }]}>
      <T style={[styles.time, row.tone && styles[row.tone]]}>{row.time}</T>
      <View style={S.grow}><T style={styles.title}>{row.title}</T>{!!row.detail && <T style={S.small}>{row.detail}</T>}</View>
      <Icon name="chevron-forward" size={15} color={C.muted} />
    </Pressable>)}</Card>}
    {scheduleReady && !rows.length && <Card style={{ padding: 13 }}><T style={S.small}>{today ? 'Hôm nay chưa có lớp học hoặc buổi tự học.' : 'Ngày này chưa có lớp học hoặc buổi tự học.'}</T></Card>}
    {next && nextClock && nextClock.date > day && <Pressable accessibilityRole="button" onPress={() => showSchedule(next.date)} style={styles.next}>
      <Icon name="calendar-outline" size={17} /><T style={[S.small, S.grow]}>Buổi học tiếp theo · {dateLabel(nextClock.date)} {nextClock.start} · {title(next.courseId)}</T><Icon name="chevron-forward" size={15} />
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  section: { gap: 5 },
  card: { paddingHorizontal: 12, paddingVertical: 5 },
  row: { ...S.row, minHeight: 53, gap: 9, paddingVertical: 5 },
  divider: { borderTopWidth: 1, borderColor: C.line },
  online: { color: '#124B84', backgroundColor: '#D2E9FF' },
  practice: { color: '#245B21', backgroundColor: '#D4F5C9' },
  study: { color: C.green, backgroundColor: C.greenSoft },
  time: { fontFamily: F.bold, fontSize: 12, color: C.primary, backgroundColor: C.soft, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 9 },
  title: { fontFamily: F.bold, fontSize: 14, lineHeight: 20 },
  next: { ...S.row, minHeight: 44, padding: 8 },
});
