import { DateField, TimeField } from '../../shared/components/DateTimePicker';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, Segments, Sheet, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { Task, TaskStatus, dateKey, isValidDate, today, uid, useApp, addDays } from '../../store/model';
import { CourseChoices } from '../academics/CourseChoices';
import { useFormChanges } from '../../shared/forms/useFormChanges';
import {deadlineTimestamp,sessionExceedsDeadline,taskDeadlineLabel,taskDeadlineTime} from './assignments';

export function TaskForm({ item, initialCourseId, onClose, onDeleted }: { item?: Task; initialCourseId?: string; onClose: () => void; onDeleted?: () => void }) {
  const { saveTask, deleteTask, setToast, courseCatalog, studySessions } = useApp();
  const [title, setTitle] = useState(item?.title ?? ''); const [courseId, setCourseId] = useState(item?.courseId ?? initialCourseId ?? courseCatalog[0]?.id ?? '');
  const course = courseCatalog.find(c => c.id === courseId)?.name ?? '';
  const [deadline, setDeadline] = useState(item?.deadline ?? dateKey(addDays(new Date(), 1))); const [deadlineTime,setDeadlineTime]=useState(item?taskDeadlineTime(item):'23:59'); const [notes, setNotes] = useState(item?.notes ?? '');
  const [priority, setPriority] = useState<'Cao' | 'Trung bình'>(item?.priority ?? 'Trung bình'); const [status, setStatus] = useState<TaskStatus>(item?.status ?? 'Chưa làm');
  const [error, setError] = useState(''); const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = useFormChanges({ title, courseId, deadline, deadlineTime, notes, priority, status });
  return <Sheet title={item ? 'Chỉnh sửa bài tập' : 'Bài tập mới'} onClose={onClose} dirty={dirty}>
    <Field label="Tên bài tập" value={title} onChange={setTitle} placeholder="Bạn cần hoàn thành điều gì?" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Môn học</T><CourseChoices value={courseId} onChange={setCourseId} />
    <Row style={{alignItems:'flex-start'}}><View style={S.grow}><DateField label="Hạn nộp" value={deadline} onChange={v=>{setDeadline(v);setError('');}} /></View><View style={S.grow}><TimeField label="Giờ hạn nộp" value={deadlineTime} onChange={v=>{setDeadlineTime(v);setError('');}} /></View></Row>
    <T style={S.small}>Giờ theo thiết bị của bạn · Đồng hồ 24 giờ. Bài cũ chưa có giờ được dùng mốc 23:59.</T>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Độ ưu tiên</T><Segments values={['Trung bình', 'Cao']} value={priority} onChange={v => setPriority(v as typeof priority)} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái</T><Segments values={['Chưa làm', 'Đang làm', 'Hoàn thành']} value={status} onChange={v => setStatus(v as TaskStatus)} />
    <Field label="Ghi chú" value={notes} onChange={setNotes} multiline placeholder="Yêu cầu bài tập, tài liệu cần đọc…" />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    <Button label={item ? 'Lưu thay đổi' : 'Tạo bài tập'} icon="checkmark" onPress={() => { if (!title.trim()) { setError('Nhập tên bài tập trước nhé.'); return; } if (!course) { setError('Hãy chọn môn học.'); return; } if (!Number.isFinite(deadlineTimestamp({deadline,deadlineTime}))) { setError('Ngày hoặc giờ hạn nộp chưa hợp lệ. Mở lịch/đồng hồ để chọn lại.'); return; } if (item && courseId !== item.courseId && studySessions.some(s => s.taskId === item.id)) { setError('Bài tập đang có buổi tự học liên quan. Gỡ liên kết các buổi trước khi đổi môn.'); return; } const conflicting=item&&studySessions.find(s=>s.taskId===item.id&&sessionExceedsDeadline({deadline,deadlineTime},s)); if (conflicting) { setError(`Hạn nộp mới ${taskDeadlineLabel({deadline,deadlineTime})} đang trước lúc kết thúc buổi “${conflicting.title}”. Điều chỉnh buổi học hoặc gỡ liên kết trước nhé.`); return; } saveTask({ id: item?.id ?? uid(), title: title.trim(), courseId, course, deadline, deadlineTime, notes, priority, status }); onClose(); setToast(item ? 'Đã cập nhật bài tập' : 'Đã thêm bài tập mới'); }} actionLabel="Đang lưu" />
    {item && <><T style={S.small}>Xóa bài tập sẽ gỡ liên kết các buổi tự học; kế hoạch tự học vẫn được giữ lại.</T><Button label={confirmDelete ? 'Xác nhận xóa bài tập' : 'Xóa bài tập'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteTask(item.id); (onDeleted ?? onClose)(); setToast('Đã xóa bài tập và giữ các buổi tự học độc lập'); }} actionLabel={confirmDelete ? 'Đang xóa' : undefined} /></>}
  </Sheet>;
}
