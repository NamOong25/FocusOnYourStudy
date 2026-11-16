import { DateField, TimeField } from '../../shared/components/DateTimePicker';
import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Button, Field, Segments, Sheet, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { CalendarEvent, Exam, calendarEvents, findConflicts } from '../schedule/calendar';
import ConflictPanel from '../schedule/ConflictPanel';
import { addDays, dateKey, isValidDate, today, uid, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';
import { useFormChanges } from '../../shared/forms/useFormChanges';
import { useAuth } from '../account/auth/AuthProvider';
import ExamApiForm from './components/ExamApiForm';
import ServerExamDialog from './components/ServerExamDialog';
import { ExamExtraFields, ExamFormatPicker } from './components/ExamFormOptions';
import { examFormats } from './api/examsApi';

type ExamFormProps = { item?: Exam; initialCourseId?: string; onClose: () => void; onDeleted?: () => void; onSaved?: (id: string) => void };
export function ExamForm(props: ExamFormProps) {
  const auth = useAuth();
  if (auth.hasSession) return props.item ? <ServerExamDialog id={props.item.id} onClose={props.onClose} onRefreshList={() => {}} />
    : <ExamApiForm initialCourseId={props.initialCourseId} onClose={props.onClose} onDeleted={props.onDeleted} onSaved={props.onSaved ? exam => props.onSaved!(exam.id) : () => props.onClose()} />;
  return <PreviewExamForm {...props} />;
}

function PreviewExamForm({ item, initialCourseId, onClose, onDeleted, onSaved }: ExamFormProps) {
  const { courseCatalog, classes, classExceptions, exams, studySessions, saveExam, deleteExam, setToast, accountPreferences } = useApp();
  const { width, fontScale } = useWindowDimensions();
  const [courseId, setCourseId] = useState(item?.courseId ?? initialCourseId ?? courseCatalog[0]?.id ?? '');
  const [date, setDate] = useState(item?.date ?? dateKey(addDays(today, 7))); const [time, setTime] = useState(item?.time ?? '08:00'); const [end, setEnd] = useState(item?.end ?? '10:00');
  const [room, setRoom] = useState(item?.room ?? ''); const [kind, setKind] = useState<Exam['kind']>(item?.kind ?? 'Giữa kỳ'); const [format, setFormat] = useState<Exam['format']>(item?.format ?? 'Tự luận');
  const [reminder, setReminder] = useState(item?.reminder ?? true); const [minutes, setMinutes] = useState(item?.reminderMinutes ?? [accountPreferences.reminderMinutes]); const [notes, setNotes] = useState(item?.notes ?? '');
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
  return <Sheet title={item ? 'Chỉnh sửa lịch thi' : 'Thêm lịch thi'} onClose={onClose} dirty={dirty} hideBackButton>
    <CourseChoices dropdown value={courseId} onChange={setCourseId} />
    <View style={{ gap: 7 }}>
      <T style={{ fontFamily: F.semi, fontSize: 12 }}>Loại kỳ thi</T>
      <Segments values={['Giữa kỳ', 'Cuối kỳ', 'Khác']} value={kind} onChange={v => setKind(v as Exam['kind'])} />
    </View>
    <ExamFormatPicker value={format} options={Object.values(examFormats)} onChange={setFormat} />
    <DateField label="Ngày thi" value={date} onChange={setDate} />
    <View style={{ gap: 12, flexDirection: width < 360 || fontScale > 1.25 ? 'column' : 'row' }}>
      <View style={S.grow}><TimeField label="Bắt đầu" value={time} onChange={setTime} /></View>
      <View style={S.grow}><TimeField label="Kết thúc" value={end} onChange={setEnd} /></View>
    </View>
    <Field label={format === 'Trực tuyến' ? 'Đường dẫn thi' : 'Phòng thi'} value={room} onChange={setRoom} maxLength={100} />
    <ExamExtraFields reminder={reminder} minutes={minutes} notes={notes}
      onReminderChange={(enabled, nextMinutes) => { setReminder(enabled); setMinutes(nextMinutes); setError(''); }} onNotesChange={setNotes} />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}<ConflictPanel conflicts={conflicts} candidate={`${kind} · ${time} – ${end}`} />
    <Button label="Lưu lịch thi" icon="checkmark" onPress={save} actionLabel="Đang lưu" />
    {item && <Button label={confirmDelete ? 'Xác nhận xóa lịch thi' : 'Xóa lịch thi'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteExam(item.id); setToast('Đã xóa lịch thi và tùy chọn nhắc của lịch'); (onDeleted ?? onClose)(); }} actionLabel={confirmDelete ? 'Đang xóa' : undefined} />}
  </Sheet>;
}
