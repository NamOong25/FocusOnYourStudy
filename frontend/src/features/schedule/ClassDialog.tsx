import { TimeField } from '../../shared/components/DateTimePicker';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Field, Row, Sheet, SheetFlow, T } from '../../shared/components';
import { CalendarEvent, ClassException, ClassItem, calendarEvents, findConflicts, isClassDate, weekdaysLabel } from './calendar';
import { ClassForm } from './ClassForm';
import ConflictPanel from './ConflictPanel';
import { addDays, dateKey, dateLabel, parseDay, today, uid, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';
import { useFormChanges } from '../../shared/forms/useFormChanges';
import ClassOccurrenceDetails from './components/ClassOccurrenceDetails';

export default function ClassDialog({ id, date, onClose }: { id: string; date?: string; onClose: () => void }) {
  const { classes } = useApp();
  const series = classes.find(c => c.id === id);
  if (!series) return null;
  return <SheetFlow><PreviewClassDialog series={series} date={date} onClose={onClose} /></SheetFlow>;
}

function PreviewClassDialog({ series, date, onClose }: { series: ClassItem; date?: string; onClose: () => void }) {
  const { classes, classExceptions, getClassesOn, restoreClassOccurrence, exams, studySessions, setToast } = useApp();
  const { id } = series;
  const [mode, setMode] = useState<'detail' | 'series' | 'change' | 'cancel'>('detail'); const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);
  let selectedDate = date;
  if (!selectedDate) {
    for (let d = parseDay(dateKey(today) > series.startsOn ? dateKey(today) : series.startsOn), n = 0; dateKey(d) <= series.endsOn && n <= 366; d = addDays(d, 1), n++) { if (isClassDate(series, dateKey(d))) { selectedDate = dateKey(d); break; } }
    selectedDate ??= series.startsOn;
  }
  const occurrence = getClassesOn(selectedDate).find(c => c.id === id);
  if (mode === 'series') return <ClassForm item={series} onClose={() => setMode('detail')} onDeleted={onClose} />;
  if (mode === 'change' || mode === 'cancel') return <ExceptionForm series={series} date={selectedDate} kind={mode === 'cancel' ? 'cancelled' : 'changed'} onClose={() => setMode('detail')} />;
  const restore = () => {
    const clashes = findConflicts(selectedDate!, series.start, series.end, calendarEvents(selectedDate!, classes, classExceptions, exams, studySessions), { kind: 'Ca học', id });
    setConflicts(clashes); if (clashes.length) return;
    restoreClassOccurrence(id, selectedDate!); setToast('Đã khôi phục buổi học theo lịch gốc');
  };
  return <Sheet title="Chi tiết buổi học" onClose={onClose} hideBackButton>
    <ClassOccurrenceDetails title={series.title} date={selectedDate} lesson={occurrence} format={series}
      recurrence={{ ...series, weekdays: weekdaysLabel(series.weekdays) }}
      onChange={() => setMode('change')} onCancel={() => setMode('cancel')} onRestore={restore}
      onEdit={() => setMode('series')} restoreActionLabel="Đang khôi phục">
      <ConflictPanel conflicts={conflicts} candidate={`Khôi phục · ${series.start} – ${series.end}`} />
    </ClassOccurrenceDetails>
  </Sheet>;
}

function ExceptionForm({ series, date, kind, onClose }: { series: ClassItem; date: string; kind: ClassException['kind']; onClose: () => void }) {
  const { classes, classExceptions, exams, studySessions, getClassesOn, saveClassException, setToast } = useApp();
  const occurrence = getClassesOn(date).find(c => c.id === series.id) ?? series;
  const current = classExceptions.find(e => e.seriesId === series.id && e.date === date);
  const [start, setStart] = useState(occurrence.start); const [end, setEnd] = useState(occurrence.end); const [room, setRoom] = useState(occurrence.room); const [teacher, setTeacher] = useState(occurrence.teacher);
  const [reason, setReason] = useState(current?.reason ?? ''); const [error, setError] = useState(''); const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);
  const dirty = useFormChanges({ start, end, room, teacher, reason });
  const save = () => {
    setError(''); setConflicts([]);
    if (!isClassDate(series, date)) { setError('Ngày này không thuộc chuỗi lịch học.'); return; }
    if (kind === 'changed') {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) { setError('Kiểm tra giờ bắt đầu và kết thúc theo dạng HH:mm.'); return; }
      const clashes = findConflicts(date, start, end, calendarEvents(date, classes, classExceptions, exams, studySessions), { kind: 'Ca học', id: series.id });
      if (clashes.length) { setConflicts(clashes); return; }
    }
    saveClassException({ id: current?.id ?? uid(), seriesId: series.id, date, kind, start, end, room: room.trim() || series.room, teacher: teacher.trim() || series.teacher, reason: reason.trim() });
    setToast(kind === 'cancelled' ? 'Đã ghi nghỉ đúng một buổi' : 'Đã điều chỉnh đúng một buổi'); onClose();
  };
  return <Sheet title={kind === 'cancelled' ? 'Nghỉ một buổi học' : 'Điều chỉnh một buổi'} onClose={onClose} dirty={dirty}><Badge label={`Chỉ ngày ${dateLabel(date)}/${date.slice(0,4)}`} icon="calendar-outline" /><T style={{ fontFamily: F.bold }}>{series.title}</T>{kind === 'changed' && <><Row><View style={S.grow}><TimeField label="Bắt đầu mới" value={start} onChange={setStart} /></View><View style={S.grow}><TimeField label="Kết thúc mới" value={end} onChange={setEnd} /></View></Row><Field label="Phòng học buổi này" value={room} onChange={setRoom} /><Field label="Giảng viên buổi này" value={teacher} onChange={setTeacher} /></>}<Field label="Lý do / ghi chú" value={reason} onChange={setReason} multiline placeholder={kind === 'cancelled' ? 'Ví dụ: Giảng viên báo nghỉ' : 'Ví dụ: Đổi phòng theo thông báo của lớp'} />{!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}<ConflictPanel conflicts={conflicts} candidate={`${series.title} · ${start} – ${end}`} /><Button label={kind === 'cancelled' ? 'Xác nhận nghỉ buổi này' : 'Lưu thay đổi buổi này'} icon="checkmark" onPress={save} actionLabel="Đang lưu" /><T style={S.small}>Các buổi còn lại giữ nguyên theo chuỗi gốc.</T></Sheet>;
}
