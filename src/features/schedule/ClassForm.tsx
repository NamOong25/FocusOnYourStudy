import { DateField, TimeField } from '../../shared/components/DateTimePicker';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Field, Icon, Row, Segments, Sheet, T } from '../../shared/components';
import { CourseChoices } from '../academics/CourseChoices';
import { CalendarEvent, ClassItem, dayNames, seriesConflicts } from './calendar';
import ConflictPanel from './ConflictPanel';
import { addDays, dateKey, isValidDate, parseDay, today, uid, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';
import { useFormChanges } from '../../shared/forms/useFormChanges';

export function ClassForm({ item, initialCourseId, onClose, onDeleted }: { item?: ClassItem; initialCourseId?: string; onClose: () => void; onDeleted?: () => void }) {
  const { saveClass, deleteClass, classes, classExceptions, exams, studySessions, courseCatalog, setToast } = useApp();
  const [courseId, setCourseId] = useState(item?.courseId ?? initialCourseId ?? courseCatalog[0]?.id ?? '');
  const course = courseCatalog.find(c => c.id === courseId);
  const [weekdays, setWeekdays] = useState(item?.weekdays ?? [today.getDay()]);
  const [startsOn, setStartsOn] = useState(item?.startsOn ?? dateKey(addDays(today, -30))); const [endsOn, setEndsOn] = useState(item?.endsOn ?? dateKey(addDays(today, 90)));
  const [start, setStart] = useState(item?.start ?? '08:00'); const [end, setEnd] = useState(item?.end ?? '10:00');
  const [room, setRoom] = useState(item?.room ?? course?.room ?? ''); const [teacher, setTeacher] = useState(item?.teacher ?? course?.teacher ?? '');
  const [reminder, setReminder] = useState(item?.reminderMinutes ?? 15); const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<CalendarEvent[]>([]); const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = useFormChanges({ courseId, weekdays: [...weekdays].sort(), startsOn, endsOn, start, end, room, teacher, reminder });
  const save = () => {
    setError(''); setConflicts([]);
    if (!course) { setError('Hãy chọn môn học.'); return; }
    if (!weekdays.length) { setError('Chọn ít nhất một thứ trong tuần.'); return; }
    if (!isValidDate(startsOn) || !isValidDate(endsOn) || startsOn > endsOn || (parseDay(endsOn).getTime() - parseDay(startsOn).getTime()) / 86400000 > 366) { setError('Kiểm tra khoảng ngày áp dụng; ngày kết thúc phải từ ngày bắt đầu và trong tối đa 366 ngày.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || start >= end) { setError('Kiểm tra giờ HH:mm; giờ kết thúc phải sau giờ bắt đầu.'); return; }
    let hasOccurrence = false;
    for (let d = parseDay(startsOn); dateKey(d) <= endsOn; d = addDays(d, 1)) { if (weekdays.includes(d.getDay())) { hasOccurrence = true; break; } }
    if (!hasOccurrence) { setError('Khoảng ngày này chưa có thứ nào bạn đã chọn.'); return; }
    const candidate: ClassItem = { id: item?.id ?? uid(), courseId, title: course.name, weekday: weekdays[0]!, weekdays, startsOn, endsOn, start, end, room: room.trim() || 'Chưa có phòng', teacher: teacher.trim() || 'Chưa cập nhật', reminderMinutes: reminder };
    const clashes = seriesConflicts(candidate, classes, classExceptions, exams, studySessions);
    if (clashes.length) { setConflicts(clashes); return; }
    saveClass(candidate); setToast(item ? 'Đã cập nhật chuỗi lịch học' : 'Đã thêm lịch học lặp'); onClose();
  };
  return <Sheet title={item ? 'Sửa cả chuỗi lịch học' : 'Thêm lịch học'} onClose={onClose} dirty={dirty}>
    <Badge label="Lặp theo tuần · Trong khoảng ngày đã chọn" icon="repeat-outline" />
    <CourseChoices value={courseId} onChange={id => { setCourseId(id); const next = courseCatalog.find(c => c.id === id); setRoom(next?.room ?? ''); setTeacher(next?.teacher ?? ''); }} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Các thứ trong tuần</T>
    <Row style={{ gap: 0 }}>{[1,2,3,4,5,6,0].map(day => <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={`Học vào ${dayNames[day]}`} accessibilityState={{ checked: weekdays.includes(day) }} aria-checked={weekdays.includes(day)} onPress={() => setWeekdays(v => v.includes(day) ? v.filter(d => d !== day) : [...v, day])} style={{ flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 34, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: weekdays.includes(day) ? C.primary : C.track }}><T style={{ fontFamily: F.bold, fontSize: 11, color: weekdays.includes(day) ? '#fff' : C.muted }}>{dayNames[day]}</T></View></Pressable>)}</Row>
    <DateField label="Áp dụng từ" value={startsOn} onChange={setStartsOn} /><DateField label="Áp dụng đến" value={endsOn} onChange={setEndsOn} />
    <Row><View style={S.grow}><TimeField label="Bắt đầu" value={start} onChange={setStart} /></View><View style={S.grow}><TimeField label="Kết thúc" value={end} onChange={setEnd} /></View></Row>
    <Field label="Phòng học" value={room} onChange={setRoom} /><Field label="Giảng viên" value={teacher} onChange={setTeacher} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Nhắc trước ca học</T><Segments values={['Tắt', '5 phút', '15 phút', '30 phút']} value={reminder ? `${reminder} phút` : 'Tắt'} onChange={v => setReminder(v === 'Tắt' ? 0 : Number(v.split(' ')[0]))} />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}<ConflictPanel conflicts={conflicts} candidate={`${course?.name ?? 'Ca học'} · ${start} – ${end}`} />
    <Button label="Lưu lịch học" icon="checkmark" onPress={save} actionLabel="Đang lưu" />
    <T style={S.small}>Phạm vi áp dụng thuộc môn/học kỳ đã chọn. Khi sửa cả chuỗi, ngoại lệ còn thuộc khoảng ngày và các thứ mới sẽ được giữ; ngoại lệ ngoài phạm vi mới được bỏ. Tùy chọn nhắc hiện là mẫu, chưa phát thông báo trên thiết bị.</T>
    {item && <Button label={confirmDelete ? 'Xác nhận xóa cả chuỗi' : 'Xóa cả chuỗi lịch học'} danger={confirmDelete} secondary={!confirmDelete} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } deleteClass(item.id); setToast('Đã xóa chuỗi và các ngoại lệ của chuỗi'); (onDeleted ?? onClose)(); }} actionLabel={confirmDelete ? 'Đang xóa' : undefined} />}
  </Sheet>;
}
