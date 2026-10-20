import { DateField, TimeField } from '../../shared/components/DateTimePicker';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, Segments, Sheet, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { StudySession, StudyStatus, endTime, timeMinutes } from './learning';
import { CalendarEvent, calendarEvents, findConflicts } from '../schedule/calendar';
import ConflictPanel from '../schedule/ConflictPanel';
import { dateKey, isValidDate, parseDay, today, uid, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';

export function StudySessionForm({ item, initialTaskId, initialCourseId, initialDate, onClose, onSaved, onDeleted }: { item?: StudySession; initialTaskId?: string; initialCourseId?: string; initialDate?: string; onClose: () => void; onSaved?: (id: string) => void; onDeleted?: () => void }) {
  const { tasks, courseCatalog, classes, classExceptions, exams, studySessions, saveStudySession, deleteStudySession, setToast } = useApp();
  const initialTask = tasks.find(t => t.id === initialTaskId);
  const [title, setTitle] = useState(item?.title ?? '');
  const [courseId, setCourseId] = useState(item?.courseId ?? initialTask?.courseId ?? initialCourseId ?? courseCatalog[0]?.id ?? '');
  const [taskId, setTaskId] = useState(item?.taskId ?? initialTask?.id ?? '');
  const [date, setDate] = useState(item?.date ?? initialDate ?? dateKey(today));
  const [start, setStart] = useState(item?.start ?? '19:00'); const [duration, setDuration] = useState(String(item?.duration ?? 45));
  const [notes, setNotes] = useState(item?.notes ?? ''); const [error, setError] = useState(''); const [confirmDelete, setConfirmDelete] = useState(false);
  const [status, setStatus] = useState<StudyStatus>(item?.status ?? 'Đã lên lịch');
  const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);
  const availableTasks = tasks.filter(t => t.courseId === courseId);
  const save = () => {
    setConflicts([]); setError('');
    if (!title.trim()) { setError('Đặt tên nội dung bạn muốn học trong buổi này.'); return; }
    const course = courseCatalog.find(c => c.id === courseId);
    if (!course) { setError('Hãy chọn môn học.'); return; }
    if (!isValidDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start)) { setError('Kiểm tra ngày YYYY-MM-DD và giờ HH:mm.'); return; }
    if (!/^\d+$/.test(duration) || Number(duration) < 1 || Number(duration) > 240 || timeMinutes(start) + Number(duration) >= 1440) { setError('Thời lượng cần từ 1 đến 240 phút và kết thúc trước 24:00.'); return; }
    const task = tasks.find(t => t.id === taskId);
    if (taskId && (!task || task.courseId !== courseId)) { setError('Bài tập cần thuộc đúng môn đang chọn.'); return; }
    if (task && date > task.deadline) { setError('Buổi học đang sau hạn nộp bài. Chọn ngày trước hạn hoặc bỏ liên kết bài tập để ôn tập độc lập.'); return; }
    const ending = endTime(start, Number(duration));
    const clashes = findConflicts(date, start, ending, calendarEvents(date, classes, classExceptions, exams, studySessions), item ? { kind: 'Tự học', id: item.id } : undefined);
    if (clashes.length) { setConflicts(clashes); if (clashes.some(e => e.kind === 'Tự học')) setError('Khung giờ này đang trùng một buổi tự học đã lên lịch.'); return; }
    const session: StudySession = { id: item?.id ?? uid(), title: title.trim(), courseId, taskId: taskId || undefined, date, start, duration: Number(duration), notes: notes.trim(), status, focusedSeconds: item?.focusedSeconds ?? 0 };
    saveStudySession(session);
    setToast(item ? 'Đã cập nhật buổi tự học' : 'Đã thêm buổi tự học'); if (onSaved) onSaved(session.id); else onClose();
  };
  return <Sheet title={item ? 'Chỉnh sửa buổi tự học' : 'Buổi tự học mới'} onClose={onClose}>
    <Badge label="Một việc nhỏ, một khoảng tập trung" icon="leaf-outline" />
    <Field label="Nội dung tự học" value={title} onChange={setTitle} placeholder="Ví dụ: Viết phần giới thiệu báo cáo" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Môn học</T><CourseChoices value={courseId} onChange={id => { setCourseId(id); setTaskId(''); }} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Liên kết bài tập (không bắt buộc)</T>
    <View style={{ gap: 7 }}>{[{ id: '', title: 'Tự học độc lập' }, ...availableTasks].map(task => <Pressable key={task.id || 'independent'} accessibilityRole="radio" accessibilityLabel={`Liên kết: ${task.title}`} aria-checked={taskId === task.id} accessibilityState={{ checked: taskId === task.id }} onPress={() => setTaskId(task.id)} style={{ backgroundColor: taskId === task.id ? C.soft : C.canvas, borderRadius: 14, minHeight: 48, padding: 12 }}><Row><Icon name={taskId === task.id ? 'radio-button-on' : 'radio-button-off'} size={18} /><T style={[S.grow, { fontSize: 12 }]}>{task.title}</T></Row></Pressable>)}</View>
    <DateField label="Ngày học" value={date} onChange={setDate} />
    <Row style={{ alignItems: 'flex-start' }}><View style={S.grow}><TimeField label="Bắt đầu" value={start} onChange={setStart} /></View><View style={S.grow}><Field label="Thời lượng (phút)" value={duration} onChange={setDuration} numeric /></View></Row>
    <Segments values={['25', '45', '60', '90']} value={duration} onChange={setDuration} />
    {item && <><T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái buổi học</T><Segments values={['Đã lên lịch', 'Đang học', 'Hoàn thành']} value={status} onChange={v => setStatus(v as StudyStatus)} /></>}
    <Field label="Ghi chú buổi học" value={notes} onChange={setNotes} placeholder="Tài liệu cần đọc, mục tiêu nhỏ cần đạt…" multiline />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    <ConflictPanel conflicts={conflicts} candidate={`${title || 'Buổi tự học'} · ${start} – ${endTime(start, Number(duration) || 0)}`} />
    <Button label="Lưu buổi tự học" icon="checkmark" onPress={save} actionLabel="Đang lưu" />
    <T style={S.small}>Buổi học có thời gian riêng. Trạng thái bài tập và hạn nộp được quản lý độc lập.</T>
    {item && <Button label={confirmDelete ? 'Xác nhận xóa buổi tự học' : 'Xóa buổi tự học'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteStudySession(item.id); setToast('Đã xóa buổi tự học'); (onDeleted ?? onClose)(); }} actionLabel={confirmDelete ? 'Đang xóa' : undefined} />}
  </Sheet>;
}
