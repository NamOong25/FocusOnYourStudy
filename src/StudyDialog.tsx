import React, { useState } from 'react';
import { Badge, Button, Card, Icon, IconButton, Progress, Row, Sheet, T } from './components';
import { StudySessionForm } from './studyForms';
import { dateLabel, useApp } from './model';
import { endTime } from './learning';
import { C, F, S } from './theme';
export default function StudySessionDialog({ id, onClose, onTask }: { id: string; onClose: () => void; onTask: (id: string) => void }) {
  const { studySessions, courseCatalog, tasks, prepareFocus, completeStudySession, setToast } = useApp();
  const [editing, setEditing] = useState(false); const session = studySessions.find(s => s.id === id);
  if (!session) return null;
  const course = courseCatalog.find(c => c.id === session.courseId); const task = tasks.find(t => t.id === session.taskId);
  if (editing) return <StudySessionForm item={session} onClose={() => setEditing(false)} onDeleted={onClose} />;
  return <Sheet title="Buổi tự học của bạn" onClose={onClose}>
    <Card style={{ backgroundColor: C.soft, gap: 13 }}><Row between><Badge label={session.status} bg="#FFFFFFAA" /><IconButton name="create-outline" label="Chỉnh sửa buổi tự học" bg="#FFFFFFBB" onPress={() => setEditing(true)} /></Row><T style={{ fontFamily: F.extra, fontSize: 23, lineHeight: 33, letterSpacing: -0.5 }}>{session.title}</T><T style={{ fontSize: 12, color: C.primary }}>{course?.name}</T></Card>
    <Row style={{ alignItems: 'stretch' }}><Card style={[S.grow, { backgroundColor: C.canvas, gap: 5, padding: 14 }]}><Icon name="calendar-outline" /><T style={{ fontFamily: F.bold }}>{dateLabel(session.date)}/{session.date.slice(0,4)}</T><T style={S.small}>{session.start} – {endTime(session.start, session.duration)}</T></Card><Card style={[S.grow, { backgroundColor: C.canvas, gap: 5, padding: 14 }]}><Icon name="time-outline" /><T style={{ fontFamily: F.bold }}>{session.duration} phút</T><T style={S.small}>thời lượng dự kiến</T></Card></Row>
    <T style={{ fontFamily: F.bold }}>Mục tiêu & ghi chú</T><T style={{ color: C.muted, fontSize: 13, lineHeight: 23 }}>{session.notes || 'Tập trung vào nội dung đã chọn, rồi nhìn lại điều mình vừa học được.'}</T>
    {task ? <Card style={{ backgroundColor: C.canvas, gap: 10 }}><Badge label="Liên kết bài tập" icon="link-outline" /><T style={{ fontFamily: F.bold }}>{task.title}</T><T style={S.small}>Hạn nộp {dateLabel(task.deadline)} · {task.status}</T><Button label="Xem bài tập liên quan" secondary onPress={() => onTask(task.id)} /></Card> : <Badge label="Buổi tự học độc lập" icon="leaf-outline" />}
    <Button label="Mở Pomodoro cho buổi này" icon="timer-outline" onPress={() => { prepareFocus({ courseId: session.courseId, taskId: session.taskId, sessionId: session.id }); }} />
    <Button label={session.status === 'Hoàn thành' ? 'Mở lại buổi học' : 'Đánh dấu buổi học đã xong'} icon="checkmark-circle-outline" secondary onPress={() => { completeStudySession(session.id); setToast('Đã đổi trạng thái buổi học; bài tập giữ trạng thái riêng'); }} />
    <T style={S.small}>{Math.floor(session.focusedSeconds / 60)} phút từ Pomodoro đã hoàn tất. Đánh dấu xong thủ công không tự cộng thời gian tập trung và không hoàn thành bài tập.</T>
  </Sheet>;
}
