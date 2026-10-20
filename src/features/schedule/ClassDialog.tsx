import { TimeField } from '../../shared/components/DateTimePicker';
import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Field, Icon, IconButton, Row, Sheet, T } from '../../shared/components';
import { CalendarEvent, ClassException, ClassItem, calendarEvents, findConflicts, isClassDate, reminderLabel, weekdaysLabel } from './calendar';
import { ClassForm } from './ClassForm';
import ConflictPanel from './ConflictPanel';
import { addDays, dateKey, dateLabel, parseDay, today, uid, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';

export default function ClassDialog({ id, date, onClose }: { id: string; date?: string; onClose: () => void }) {
  const { classes, classExceptions, getClassesOn, restoreClassOccurrence, exams, studySessions, setToast } = useApp();
  const series = classes.find(c => c.id === id);
  const [mode, setMode] = useState<'detail' | 'series' | 'change' | 'cancel'>('detail'); const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);
  if (!series) return null;
  let selectedDate = date;
  if (!selectedDate) {
    for (let d = parseDay(dateKey(today) > series.startsOn ? dateKey(today) : series.startsOn), n = 0; dateKey(d) <= series.endsOn && n <= 366; d = addDays(d, 1), n++) { if (isClassDate(series, dateKey(d))) { selectedDate = dateKey(d); break; } }
    selectedDate ??= series.startsOn;
  }
  const occurrence = getClassesOn(selectedDate).find(c => c.id === id);
  const exception = classExceptions.find(e => e.seriesId === id && e.date === selectedDate);
  if (mode === 'series') return <ClassForm item={series} onClose={() => setMode('detail')} onDeleted={onClose} />;
  if (mode === 'change' || mode === 'cancel') return <ExceptionForm series={series} date={selectedDate} kind={mode === 'cancel' ? 'cancelled' : 'changed'} onClose={() => setMode('detail')} />;
  const restore = () => {
    const clashes = findConflicts(selectedDate!, series.start, series.end, calendarEvents(selectedDate!, classes, classExceptions, exams, studySessions), { kind: 'Ca học', id });
    setConflicts(clashes); if (clashes.length) return;
    restoreClassOccurrence(id, selectedDate!); setToast('Đã khôi phục buổi học theo lịch gốc');
  };
  return <Sheet title="Chi tiết buổi học" onClose={onClose}>
    <Card style={{ backgroundColor: occurrence?.cancelled ? C.redSoft : C.soft, gap: 13 }}><Row between><Badge label={occurrence?.cancelled ? 'Đã nghỉ buổi này' : occurrence?.changed ? 'Đã điều chỉnh buổi này' : 'Theo lịch gốc'} color={occurrence?.cancelled ? C.red : C.primary} bg="#FFFFFFAA" /><IconButton name="create-outline" label="Sửa cả chuỗi" onPress={() => setMode('series')} bg="#FFFFFFAA" /></Row><T style={{ fontFamily: F.extra, fontSize: 23, lineHeight: 33 }}>{series.title}</T><T style={{ fontFamily: F.semi, color: C.primary }}>{dateLabel(selectedDate)}/{selectedDate.slice(0,4)}</T></Card>
    {occurrence ? <>
      <Row><Card style={[S.grow, { backgroundColor: C.canvas, gap: 6 }]}><Icon name="time-outline" /><T style={{ fontFamily: F.bold }}>{occurrence.start} – {occurrence.end}</T><T style={S.small}>Giờ của buổi này</T></Card><Card style={[S.grow, { backgroundColor: C.canvas, gap: 6 }]}><Icon name="business-outline" /><T style={{ fontFamily: F.bold }}>{occurrence.room}</T><T style={S.small}>Phòng học</T></Card></Row>
      <T style={S.small}>Giảng viên: {occurrence.teacher}</T>
      {exception && <Card style={{ backgroundColor: C.amberSoft, gap: 6 }}><T style={{ fontFamily: F.bold, color: C.amber }}>Chỉ áp dụng cho ngày này</T><T style={{ fontSize: 12 }}>{exception.reason || 'Chưa ghi lý do'}</T><T style={S.small}>Lịch gốc: {series.start} – {series.end} · {series.room}</T></Card>}
      <ConflictPanel conflicts={conflicts} candidate={`Khôi phục · ${series.start} – ${series.end}`} />
      {!occurrence.cancelled && <Button label="Đổi giờ hoặc phòng buổi này" icon="swap-horizontal-outline" onPress={() => setMode('change')} />}
      {!occurrence.cancelled && <Button label="Nghỉ buổi này" secondary icon="close-circle-outline" onPress={() => setMode('cancel')} />}
      {exception && <Button label={occurrence.cancelled ? 'Khôi phục buổi học' : 'Bỏ thay đổi buổi này'} secondary icon="refresh-outline" onPress={restore} actionLabel="Đang khôi phục" />}
    </> : <T style={S.small}>Ngày này nằm ngoài phạm vi hiện tại của chuỗi. Bạn có thể chỉnh chuỗi hoặc quay lại lịch để chọn ngày khác.</T>}
    <Card style={{ backgroundColor: C.canvas, gap: 7 }}><T style={{ fontFamily: F.bold }}>Chuỗi lịch học</T><T style={{ fontSize: 12 }}>{weekdaysLabel(series.weekdays)} · {series.start} – {series.end}</T><T style={S.small}>{dateLabel(series.startsOn)}/{series.startsOn.slice(0,4)} → {dateLabel(series.endsOn)}/{series.endsOn.slice(0,4)}</T><T style={S.small}>{series.reminderMinutes ? `Nhắc trước ${reminderLabel(series.reminderMinutes)} (tùy chọn mẫu)` : 'Không chọn nhắc'}</T></Card>
    <Button label="Chỉnh sửa cả chuỗi" secondary icon="repeat-outline" onPress={() => setMode('series')} />
    <T style={S.small}>Đổi hoặc nghỉ một buổi giữ nguyên các buổi khác. Sửa cả chuỗi áp dụng cho tất cả ngày trong phạm vi đã chọn.</T>
  </Sheet>;
}

function ExceptionForm({ series, date, kind, onClose }: { series: ClassItem; date: string; kind: ClassException['kind']; onClose: () => void }) {
  const { classes, classExceptions, exams, studySessions, getClassesOn, saveClassException, setToast } = useApp();
  const occurrence = getClassesOn(date).find(c => c.id === series.id) ?? series;
  const current = classExceptions.find(e => e.seriesId === series.id && e.date === date);
  const [start, setStart] = useState(occurrence.start); const [end, setEnd] = useState(occurrence.end); const [room, setRoom] = useState(occurrence.room); const [teacher, setTeacher] = useState(occurrence.teacher);
  const [reason, setReason] = useState(current?.reason ?? ''); const [error, setError] = useState(''); const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);
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
  return <Sheet title={kind === 'cancelled' ? 'Nghỉ một buổi học' : 'Điều chỉnh một buổi'} onClose={onClose}><Badge label={`Chỉ ngày ${dateLabel(date)}/${date.slice(0,4)}`} icon="calendar-outline" /><T style={{ fontFamily: F.bold }}>{series.title}</T>{kind === 'changed' && <><Row><View style={S.grow}><TimeField label="Bắt đầu mới" value={start} onChange={setStart} /></View><View style={S.grow}><TimeField label="Kết thúc mới" value={end} onChange={setEnd} /></View></Row><Field label="Phòng học buổi này" value={room} onChange={setRoom} /><Field label="Giảng viên buổi này" value={teacher} onChange={setTeacher} /></>}<Field label="Lý do / ghi chú" value={reason} onChange={setReason} multiline placeholder={kind === 'cancelled' ? 'Ví dụ: Giảng viên báo nghỉ' : 'Ví dụ: Đổi phòng theo thông báo của lớp'} />{!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}<ConflictPanel conflicts={conflicts} candidate={`${series.title} · ${start} – ${end}`} /><Button label={kind === 'cancelled' ? 'Xác nhận nghỉ buổi này' : 'Lưu thay đổi buổi này'} icon="checkmark" onPress={save} actionLabel="Đang lưu" /><T style={S.small}>Các buổi còn lại giữ nguyên theo chuỗi gốc.</T></Sheet>;
}
