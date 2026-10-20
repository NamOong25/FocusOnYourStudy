import { DateField } from './DateTimePicker';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, Segments, Sheet, T } from './components';
import { C, F, S } from './theme';
import { Task, TaskStatus, dateKey, isValidDate, today, uid, useApp, addDays } from './model';
import { CourseChoices } from './courseChoices';
export { CourseChoices } from './courseChoices';
export { ClassForm } from './calendarForms';
export { ExamForm } from './examForms';

export function TaskForm({ item, initialCourseId, onClose, onDeleted }: { item?: Task; initialCourseId?: string; onClose: () => void; onDeleted?: () => void }) {
  const { saveTask, deleteTask, setToast, courseCatalog, studySessions } = useApp();
  const [title, setTitle] = useState(item?.title ?? ''); const [courseId, setCourseId] = useState(item?.courseId ?? initialCourseId ?? courseCatalog[0]?.id ?? '');
  const course = courseCatalog.find(c => c.id === courseId)?.name ?? '';
  const [deadline, setDeadline] = useState(item?.deadline ?? dateKey(addDays(today, 1))); const [notes, setNotes] = useState(item?.notes ?? '');
  const [priority, setPriority] = useState<'Cao' | 'Trung bình'>(item?.priority ?? 'Trung bình'); const [status, setStatus] = useState<TaskStatus>(item?.status ?? 'Chưa làm');
  const [error, setError] = useState(''); const [confirmDelete, setConfirmDelete] = useState(false);
  return <Sheet title={item ? 'Chỉnh sửa bài tập' : 'Bài tập mới'} onClose={onClose}>
    <Field label="Tên bài tập" value={title} onChange={setTitle} placeholder="Bạn cần hoàn thành điều gì?" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Môn học</T><CourseChoices value={courseId} onChange={setCourseId} />
    <DateField label="Hạn nộp" value={deadline} onChange={setDeadline} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Độ ưu tiên</T><Segments values={['Trung bình', 'Cao']} value={priority} onChange={v => setPriority(v as typeof priority)} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái</T><Segments values={['Chưa làm', 'Đang làm', 'Hoàn thành']} value={status} onChange={v => setStatus(v as TaskStatus)} />
    <Field label="Ghi chú" value={notes} onChange={setNotes} multiline placeholder="Yêu cầu bài tập, tài liệu cần đọc…" />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    <Button label={item ? 'Lưu thay đổi' : 'Tạo bài tập'} icon="checkmark" onPress={() => { if (!title.trim()) { setError('Nhập tên bài tập trước nhé.'); return; } if (!course) { setError('Hãy chọn môn học.'); return; } if (!isValidDate(deadline)) { setError('Ngày chưa hợp lệ. Mở lịch để chọn lại hạn nộp.'); return; } if (item && courseId !== item.courseId && studySessions.some(s => s.taskId === item.id)) { setError('Bài tập đang có buổi tự học liên quan. Gỡ liên kết các buổi trước khi đổi môn.'); return; } if (item && studySessions.some(s => s.taskId === item.id && s.date > deadline)) { setError('Hạn nộp mới đang trước một buổi tự học liên quan. Điều chỉnh buổi học trước nhé.'); return; } saveTask({ id: item?.id ?? uid(), title: title.trim(), courseId, course, deadline, notes, priority, status }); onClose(); setToast(item ? 'Đã cập nhật bài tập' : 'Đã thêm bài tập mới'); }} />
    {item && <><T style={S.small}>Xóa bài tập sẽ gỡ liên kết các buổi tự học; kế hoạch tự học vẫn được giữ lại.</T><Button label={confirmDelete ? 'Xác nhận xóa bài tập' : 'Xóa bài tập'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteTask(item.id); (onDeleted ?? onClose)(); setToast('Đã xóa bài tập và giữ các buổi tự học độc lập'); }} /></>}
  </Sheet>;
}
