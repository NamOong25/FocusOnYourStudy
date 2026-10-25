import { DateField, TimeField } from '../../shared/components/DateTimePicker';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Field, Icon, Row, Segments, Sheet, StateView, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { CalendarEvent, Exam, calendarEvents, findConflicts, reminderLabel } from '../schedule/calendar';
import ConflictPanel from '../schedule/ConflictPanel';
import { addDays, dateKey, isValidDate, today, uid, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';
import { useFormChanges } from '../../shared/forms/useFormChanges';
import { useAuth } from '../account/auth/AuthProvider';

type ExamFormProps = { item?: Exam; initialCourseId?: string; onClose: () => void; onDeleted?: () => void; onSaved?: (id: string) => void };
export function ExamForm(props: ExamFormProps) {
  const auth = useAuth(), { setScheduleMode } = useApp();
  if (auth.hasSession) return <Sheet title="Lịch thi trong tài khoản" onClose={props.onClose}><StateView title="Xem lịch thi đã lưu" message="Bạn hiện có thể xem lịch thi trong tài khoản. Thêm, sửa và xóa sẽ có trong bản cập nhật tiếp theo." actionLabel="Đến lịch thi đã lưu" onAction={() => { props.onClose(); setScheduleMode('Kỳ thi'); }} /></Sheet>;
  return <PreviewExamForm {...props} />;
}

function PreviewExamForm({ item, initialCourseId, onClose, onDeleted, onSaved }: ExamFormProps) {
  const { courseCatalog, classes, classExceptions, exams, studySessions, saveExam, deleteExam, setToast } = useApp();
  const [courseId, setCourseId] = useState(item?.courseId ?? initialCourseId ?? courseCatalog[0]?.id ?? '');
  const [date, setDate] = useState(item?.date ?? dateKey(addDays(today, 7))); const [time, setTime] = useState(item?.time ?? '08:00'); const [end, setEnd] = useState(item?.end ?? '10:00');
  const [room, setRoom] = useState(item?.room ?? ''); const [kind, setKind] = useState<Exam['kind']>(item?.kind ?? 'Giữa kỳ'); const [format, setFormat] = useState<Exam['format']>(item?.format ?? 'Tự luận');
  const [reminder, setReminder] = useState(item?.reminder ?? true); const [minutes, setMinutes] = useState(item?.reminderMinutes ?? [1440, 180]); const [notes, setNotes] = useState(item?.notes ?? '');
  const [error, setError] = useState(''); const [conflicts, setConflicts] = useState<CalendarEvent[]>([]); const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = useFormChanges({ courseId, date, time, end, room, kind, format, reminder, minutes: [...minutes].sort((a, b) => a - b), notes });
  const save = () => {
    setError(''); setConflicts([]); const course = courseCatalog.find(c => c.id === courseId);
    if (!course) { setError('Hãy chọn môn học.'); return; }
    if (!isValidDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || time >= end) { setError('Kiểm tra ngày thi và khung giờ HH:mm; kết thúc phải sau bắt đầu.'); return; }
    if (reminder && !minutes.length) { setError('Chọn ít nhất một thời điểm nhắc hoặc tắt nhắc.'); return; }
    const clashes = findConflicts(date, time, end, calendarEvents(date, classes, classExceptions, exams, studySessions), item ? { kind: 'Lịch thi', id: item.id } : undefined);
    if (clashes.length) { setConflicts(clashes); return; }
    const exam: Exam = { id: item?.id ?? uid(), courseId, course: course.name, date, time, end, room: room.trim() || 'Chưa cập nhật', kind, format, type: `${kind} • ${format}`, reminder, reminderMinutes: [...minutes].sort((a,b) => b-a), notes: notes.trim() };
    saveExam(exam); setToast(item ? 'Đã cập nhật lịch thi' : 'Đã thêm lịch thi'); if (onSaved) onSaved(exam.id); else onClose();
  };
  return <Sheet title={item ? 'Chỉnh sửa lịch thi' : 'Lịch thi mới'} onClose={onClose} dirty={dirty}>
    <CourseChoices value={courseId} onChange={setCourseId} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Loại kỳ thi</T><Segments values={['Giữa kỳ', 'Cuối kỳ', 'Khác']} value={kind} onChange={v => setKind(v as Exam['kind'])} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Hình thức thi</T>
    <Row style={{ flexWrap: 'wrap' }}>{(['Tự luận', 'Trắc nghiệm', 'Thực hành', 'Vấn đáp', 'Trực tuyến'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`Hình thức ${value}`} accessibilityState={{ checked: format === value }} aria-checked={format === value} onPress={() => setFormat(value)} style={{ minHeight: 44, borderRadius: 17, paddingHorizontal: 13, justifyContent: 'center', backgroundColor: format === value ? C.primary : C.track }}><T style={{ fontFamily: F.semi, fontSize: 12, color: format === value ? '#fff' : C.muted }}>{value}</T></Pressable>)}</Row>
    <DateField label="Ngày thi" value={date} onChange={setDate} />
    <Row><View style={S.grow}><TimeField label="Giờ thi" value={time} onChange={setTime} /></View><View style={S.grow}><TimeField label="Kết thúc thi" value={end} onChange={setEnd} /></View></Row>
    <Field label={format === 'Trực tuyến' ? 'Phòng / đường dẫn thi' : 'Phòng thi'} value={room} onChange={setRoom} placeholder="Ví dụ: B202 hoặc Phòng máy 3" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Tùy chọn nhắc</T><Segments values={['Không nhắc', 'Có nhắc']} value={reminder ? 'Có nhắc' : 'Không nhắc'} onChange={v => setReminder(v === 'Có nhắc')} />
    {reminder && <View style={{ gap: 7 }}>{[1440,180,60,15].map(value => <Pressable key={value} accessibilityRole="checkbox" accessibilityLabel={`Nhắc trước ${reminderLabel(value)}`} accessibilityState={{ checked: minutes.includes(value) }} aria-checked={minutes.includes(value)} onPress={() => setMinutes(v => v.includes(value) ? v.filter(n => n !== value) : [...v,value])} style={{ backgroundColor: minutes.includes(value) ? C.soft : C.canvas, padding: 12, minHeight: 46, borderRadius: 14 }}><Row><Icon name={minutes.includes(value) ? 'checkbox' : 'square-outline'} size={19} /><T style={{ fontSize: 12 }}>Trước {reminderLabel(value)}</T></Row></Pressable>)}</View>}
    <Field label="Ghi chú kỳ thi" value={notes} onChange={setNotes} multiline placeholder="Giấy tờ cần mang, nội dung cần chuẩn bị…" />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}<ConflictPanel conflicts={conflicts} candidate={`${kind} · ${time} – ${end}`} />
    <Button label={item ? 'Lưu lịch thi' : 'Thêm lịch thi'} icon="checkmark" onPress={save} actionLabel="Đang lưu" /><T style={S.small}>Các mốc nhắc là tùy chọn mẫu; chưa đặt chuông hoặc gửi thông báo hệ thống.</T>
    {item && <Button label={confirmDelete ? 'Xác nhận xóa lịch thi' : 'Xóa lịch thi'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteExam(item.id); setToast('Đã xóa lịch thi và tùy chọn nhắc của lịch'); (onDeleted ?? onClose)(); }} actionLabel={confirmDelete ? 'Đang xóa' : undefined} />}
  </Sheet>;
}
