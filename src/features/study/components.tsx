import { studyTimeLabel } from './studyTime';
import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, IconButton, Progress, Row, T } from '../../shared/components';
import { StudySession, endTime } from './learning';
import { useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';

export function StudySessionCard({ session, onOpen, onFocus }: { session: StudySession; onOpen: () => void; onFocus: () => void }) {
  const { courseCatalog, tasks } = useApp();
  const course = courseCatalog.find(c => c.id === session.courseId); const task = tasks.find(t => t.id === session.taskId);
  return <Card style={{ gap: 12 }}>
    <Row between><Badge label={studyTimeLabel(session)} icon="time-outline" bg={C.canvas} /><Badge label={session.status} bg={session.status === 'Hoàn thành' ? C.greenSoft : C.soft} color={session.status === 'Hoàn thành' ? C.green : C.primary} /></Row>
    <Row><Pressable accessibilityRole="button" accessibilityLabel={`Xem buổi ${session.title}`} onPress={onOpen} style={[S.grow, { minHeight: 48, gap: 4 }]}><T style={{ fontFamily: F.bold, fontSize: 16, lineHeight: 24 }}>{session.title}</T><T style={{ fontSize: 11, color: C.muted }}>{course?.name ?? 'Môn học'}</T></Pressable><IconButton name="play" label={`Tập trung: ${session.title}`} onPress={onFocus} bg={C.primary} color="#fff" /></Row>
    <Row style={{ gap: 5 }}><Icon name={task ? 'link-outline' : 'leaf-outline'} size={14} color={C.muted} /><T style={{ fontSize: 10, color: C.muted, flex: 1 }}>{task ? task.title : session.taskId ? 'Bài đang liên kết chưa được tải' : 'Tự học độc lập'} · {session.duration} phút dự kiến</T></Row>
    {session.focusedSeconds > 0 && <View style={{ gap: 7 }}><Progress value={session.focusedSeconds / (session.duration * 60) * 100} /><T style={{ fontSize: 10, color: C.muted }}>{Math.floor(session.focusedSeconds / 60)} phút Pomodoro hoàn tất trong phiên này</T></View>}
  </Card>;
}
