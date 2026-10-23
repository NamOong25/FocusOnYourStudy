import { StudyStatusControl } from './components/StudyStatusControl';
import { studyTimeLabel } from './studyTime';
import React, { useState } from 'react';
import {taskDeadlineLabel} from '../assignments/assignments';
import { Badge, Button, Card, Icon, IconButton, Progress, Row, Sheet, T } from '../../shared/components';
import { StudySessionForm } from './StudyForm';
import { dateLabel, useApp } from '../../store/model';
import type { StudySession } from './learning';
import { C, F, S } from '../../shared/theme';
export default function StudySessionDialog({ id, onClose, onTask }: { id: string; onClose: () => void; onTask: (id: string) => void }) {
  const { studySessions, courseCatalog, tasks, prepareFocus, completeStudySession, setToast } = useApp();
  const [editing, setEditing] = useState(false); const [basis, setBasis] = useState<StudySession>(); const session = studySessions.find(s => s.id === id);
  if (editing) return <StudySessionForm item={basis} onClose={() => setEditing(false)} onDeleted={onClose} />;
  if (!session) return <Sheet title="Buổi học không còn trong danh sách" onClose={onClose}><T style={S.small}>Buổi học đã bị xóa hoặc không còn truy cập được.</T><Button label="Đóng chi tiết buổi học" onPress={onClose}/></Sheet>;
  const course = courseCatalog.find(c => c.id === session.courseId); const task = tasks.find(t => t.id === session.taskId);

  return <Sheet title="Buổi tự học của bạn" onClose={onClose}>
    <Card style={{ backgroundColor: C.soft, gap: 13 }}><Row between><Badge label={session.status} bg="#FFFFFFAA" /><IconButton name="create-outline" label="Chỉnh sửa buổi tự học" bg="#FFFFFFBB" onPress={() => { setBasis(session); setEditing(true); }} /></Row><T style={{ fontFamily: F.extra, fontSize: 23, lineHeight: 33, letterSpacing: -0.5 }}>{session.title}</T><T style={{ fontSize: 12, color: C.primary }}>{course?.name}</T></Card>
    <Row style={{ alignItems: 'stretch' }}><Card style={[S.grow, { backgroundColor: C.canvas, gap: 5, padding: 14 }]}><Icon name="calendar-outline" /><T style={{ fontFamily: F.bold }}>{dateLabel(session.date)}/{session.date.slice(0,4)}</T><T style={S.small}>{studyTimeLabel(session)}</T></Card><Card style={[S.grow, { backgroundColor: C.canvas, gap: 5, padding: 14 }]}><Icon name="time-outline" /><T style={{ fontFamily: F.bold }}>{session.duration} phút</T><T style={S.small}>thời lượng dự kiến</T></Card></Row>
    <T style={{ fontFamily: F.bold }}>Mục tiêu & ghi chú</T><T style={{ color: C.muted, fontSize: 13, lineHeight: 23 }}>{session.notes || 'Tập trung vào nội dung đã chọn, rồi nhìn lại điều mình vừa học được.'}</T>
    {task ? <Card style={{ backgroundColor: C.canvas, gap: 10 }}><Badge label="Liên kết bài tập" icon="link-outline" /><T style={{ fontFamily: F.bold }}>{task.title}</T><T style={S.small}>Hạn nộp {taskDeadlineLabel(task)} · {task.status}</T><Button label="Xem bài tập liên quan" secondary onPress={() => onTask(task.id)} /></Card> : <Badge label={session.taskId ? "Chưa tải được bài đang liên kết" : "Buổi tự học độc lập"} icon="leaf-outline" />}
    <Button label="Mở Pomodoro cho buổi này" icon="timer-outline" onPress={() => { prepareFocus({ courseId: session.courseId, taskId: session.taskId, sessionId: session.id }); }} />
    <StudyStatusControl session={session}/>
    <T style={S.small}>{Math.floor(session.focusedSeconds / 60)} phút từ Pomodoro đã hoàn tất trong phiên này; chưa lưu lịch sử vào tài khoản. Đánh dấu xong thủ công không tự cộng thời gian tập trung và không hoàn thành bài tập.</T>
  </Sheet>;
}
