import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, Segments, Sheet, T } from './components';
import { C, F, S } from './theme';
import { ClassItem, Task, TaskStatus, courses, dateKey, isValidDate, today, uid, useApp, Exam, addDays } from './model';

export function CourseChoices({ value, onChange }: { value: string; onChange: (s: string) => void }) { return <View style={{ gap: 6 }}>{courses.map(c => <Pressable key={c} onPress={() => onChange(c)} accessibilityRole="radio" accessibilityState={{ checked: value === c }} style={{ minHeight: 48, padding: 12, backgroundColor: value === c ? C.soft : C.canvas, borderRadius: 12 }}><Row><Icon name={value === c ? 'radio-button-on' : 'radio-button-off'} size={19} /><T style={[S.grow, { fontFamily: value === c ? F.semi : F.regular, fontSize: 13 }]}>{c}</T></Row></Pressable>)}</View>; }
export function TaskForm({ item, onClose }: { item?: Task; onClose: () => void }) {
  const { saveTask, setTasks, setToast } = useApp();
  const [title, setTitle] = useState(item?.title ?? ''); const [course, setCourse] = useState(item?.course ?? courses[0]!);
  const [deadline, setDeadline] = useState(item?.deadline ?? dateKey(addDays(today, 1))); const [notes, setNotes] = useState(item?.notes ?? '');
  const [priority, setPriority] = useState<'Cao' | 'Trung bình'>(item?.priority ?? 'Trung bình'); const [status, setStatus] = useState<TaskStatus>(item?.status ?? 'Chưa làm');
  const [error, setError] = useState(''); const [confirmDelete, setConfirmDelete] = useState(false);
  return <Sheet title={item ? 'Chi tiết bài tập' : 'Bài tập mới'} onClose={onClose}>
    <Field label="Tên bài tập" value={title} onChange={setTitle} placeholder="Bạn cần hoàn thành điều gì?" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Môn học</T><CourseChoices value={course} onChange={setCourse} />
    <Field label="Hạn nộp (YYYY-MM-DD)" value={deadline} onChange={setDeadline} placeholder="2026-10-25" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Độ ưu tiên</T><Segments values={['Trung bình', 'Cao']} value={priority} onChange={v => setPriority(v as typeof priority)} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái</T><Segments values={['Chưa làm', 'Đang làm', 'Hoàn thành']} value={status} onChange={v => setStatus(v as TaskStatus)} />
    <Field label="Ghi chú" value={notes} onChange={setNotes} multiline placeholder="Yêu cầu bài tập, tài liệu cần đọc…" />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    <Button label={item ? 'Lưu thay đổi' : 'Tạo bài tập'} icon="checkmark" onPress={() => { if (!title.trim()) { setError('Nhập tên bài tập trước nhé.'); return; } if (!isValidDate(deadline)) { setError('Ngày chưa hợp lệ. Nhập theo dạng YYYY-MM-DD.'); return; } saveTask({ id: item?.id ?? uid(), title: title.trim(), course, deadline, notes, priority, status }); onClose(); setToast(item ? 'Đã cập nhật bài tập' : 'Đã thêm bài tập mới'); }} />
    {item && <Button label={confirmDelete ? 'Xác nhận xóa bài tập' : 'Xóa bài tập'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } setTasks(v => v.filter(t => t.id !== item.id)); onClose(); setToast('Đã xóa bài tập'); }} />}
  </Sheet>;
}
export function ClassForm({ item, onClose }: { item?: ClassItem; onClose: () => void }) {
  const { saveClass, classes, setClasses, setToast } = useApp();
  const [title, setTitle] = useState(item?.title ?? courses[0]!); const [weekday, setWeekday] = useState(item?.weekday ?? today.getDay());
  const [start, setStart] = useState(item?.start ?? '08:00'); const [end, setEnd] = useState(item?.end ?? '10:00');
  const [room, setRoom] = useState(item?.room ?? ''); const [teacher, setTeacher] = useState(item?.teacher ?? ''); const [error, setError] = useState(''); const [confirmDelete, setConfirmDelete] = useState(false);
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return <Sheet title={item ? 'Chỉnh sửa lịch học' : 'Thêm lịch học'} onClose={onClose}>
    <CourseChoices value={title} onChange={setTitle} /><T style={S.small}>Lặp lại hằng tuần vào</T>
    <Segments values={labels} value={labels[weekday]!} onChange={v => setWeekday(labels.indexOf(v))} />
    <Row><View style={S.grow}><Field label="Bắt đầu (HH:mm)" value={start} onChange={setStart} /></View><View style={S.grow}><Field label="Kết thúc (HH:mm)" value={end} onChange={setEnd} /></View></Row>
    <Field label="Phòng học" value={room} onChange={setRoom} placeholder="Ví dụ: B1.204" /><Field label="Giảng viên" value={teacher} onChange={setTeacher} placeholder="Họ và tên giảng viên" />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    <Button label="Lưu lịch học" icon="checkmark" onPress={() => {
      const pattern = /^([01]\d|2[0-3]):[0-5]\d$/;
      if (!pattern.test(start) || !pattern.test(end) || start >= end) { setError('Kiểm tra giờ học theo dạng HH:mm. Giờ kết thúc phải sau giờ bắt đầu.'); return; }
      if (classes.some(c => c.id !== item?.id && c.weekday === weekday && start < c.end && end > c.start)) { setError('Khung giờ bị trùng với lịch học đã có. Hãy chọn giờ khác.'); return; }
      saveClass({ id: item?.id ?? uid(), title, weekday, start, end, room: room.trim() || 'Chưa có phòng', teacher: teacher.trim() || 'Chưa cập nhật' }); onClose(); setToast('Đã lưu lịch học');
    }} />
    {item && <Button label={confirmDelete ? 'Xác nhận xóa lịch học' : 'Xóa lịch học'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } setClasses(v => v.filter(c => c.id !== item.id)); onClose(); setToast('Đã xóa lịch học'); }} />}
  </Sheet>;
}
export function ExamForm({ onClose }: { onClose: () => void }) {
  const { setExams, setToast } = useApp(); const [course, setCourse] = useState(courses[0]!); const [date, setDate] = useState(dateKey(addDays(today, 7))); const [time, setTime] = useState('08:00'); const [room, setRoom] = useState(''); const [error, setError] = useState('');
  return <Sheet title="Lịch thi mới" onClose={onClose}><CourseChoices value={course} onChange={setCourse} /><Field label="Ngày thi (YYYY-MM-DD)" value={date} onChange={setDate} /><Field label="Giờ thi (HH:mm)" value={time} onChange={setTime} /><Field label="Phòng thi" value={room} onChange={setRoom} />{!!error && <T style={{ color: C.red }}>{error}</T>}<Button label="Thêm lịch thi" onPress={() => { if (!isValidDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setError('Vui lòng kiểm tra ngày và giờ thi.'); return; } const exam: Exam = { id: uid(), course, date, time, room: room || 'Chưa cập nhật', type: 'Lịch thi mới', reminder: false }; setExams(v => [...v, exam].sort((a, b) => a.date.localeCompare(b.date))); onClose(); setToast('Đã thêm lịch thi'); }} /></Sheet>;
}
