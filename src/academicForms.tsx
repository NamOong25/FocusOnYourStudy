import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, Segments, Sheet, T } from './components';
import { Course, CourseColor, CourseStatus, Semester, SemesterStatus, courseColors } from './academic';
import { uid, useApp } from './model';
import { C, F, S } from './theme';

export function SemesterForm({ item, onClose, onSaved }: { item?: Semester; onClose: () => void; onSaved: (id: string) => void }) {
  const { semesters, saveSemester, setToast } = useApp();
  const [name, setName] = useState(item?.name ?? '');
  const [academicYear, setAcademicYear] = useState(item?.academicYear ?? '2026 – 2027');
  const [status, setStatus] = useState<SemesterStatus>(item?.status ?? 'Sắp tới');
  const [note, setNote] = useState(item?.note ?? ''); const [error, setError] = useState('');
  const save = () => {
    if (!name.trim()) { setError('Hãy đặt tên cho học kỳ.'); return; }
    const years = /^(\d{4})\s*[-–]\s*(\d{4})$/.exec(academicYear.trim());
    if (!years || Number(years[2]) !== Number(years[1]) + 1) { setError('Năm học cần có hai năm liên tiếp, ví dụ 2026 – 2027.'); return; }
    const normalizedYear = `${years[1]} – ${years[2]}`;
    if (semesters.some(s => s.id !== item?.id && s.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase() && s.academicYear === normalizedYear)) { setError('Học kỳ này đã có trong năm học đã chọn.'); return; }
    const semester: Semester = { id: item?.id ?? uid(), name: name.trim(), academicYear: normalizedYear, status, note: note.trim() };
    saveSemester(semester); setToast(item ? 'Đã cập nhật học kỳ' : 'Đã tạo học kỳ mới'); onSaved(semester.id);
  };
  return <Sheet title={item ? 'Chỉnh sửa học kỳ' : 'Học kỳ mới'} onClose={onClose}>
    <Badge label="Mỗi học kỳ, một chặng đường" icon="school-outline" />
    <Field label="Tên học kỳ" value={name} onChange={setName} placeholder="Ví dụ: Học kỳ 6" />
    <Field label="Năm học" value={academicYear} onChange={setAcademicYear} placeholder="2026 – 2027" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái học kỳ</T>
    <Segments values={['Đang học', 'Sắp tới', 'Đã kết thúc']} value={status} onChange={v => setStatus(v as SemesterStatus)} />
    <Field label="Ghi chú cho học kỳ" value={note} onChange={setNote} placeholder="Bạn muốn tập trung vào điều gì trong học kỳ này?" multiline />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    <Button label="Lưu học kỳ" icon="checkmark" onPress={save} />
  </Sheet>;
}

export function CourseForm({ item, semesterId, onClose, onSaved, onDeleted }: { item?: Course; semesterId: string; onClose: () => void; onSaved: (id: string, semesterId: string) => void; onDeleted: () => void }) {
  const { semesters, courseCatalog, saveCourse, deleteCourse, tasks, classes, exams, setToast } = useApp();
  const [name, setName] = useState(item?.name ?? ''); const [code, setCode] = useState(item?.code ?? '');
  const [credits, setCredits] = useState(String(item?.credits ?? 3));
  const [teacher, setTeacher] = useState(item?.teacher ?? ''); const [room, setRoom] = useState(item?.room ?? '');
  const [semester, setSemester] = useState(item?.semesterId ?? semesterId);
  const [status, setStatus] = useState<CourseStatus>(item?.status ?? 'Đang học');
  const [color, setColor] = useState<CourseColor>(item?.color ?? 'lavender');
  const [description, setDescription] = useState(item?.description ?? '');
  const [error, setError] = useState(''); const [confirmDelete, setConfirmDelete] = useState(false);
  const linkCount = item ? tasks.filter(t => t.courseId === item.id).length + classes.filter(c => c.courseId === item.id).length + exams.filter(e => e.courseId === item.id).length : 0;
  const save = () => {
    if (!name.trim() || !code.trim()) { setError('Hãy nhập tên môn và mã môn học.'); return; }
    if (!/^\d+$/.test(credits) || Number(credits) < 1 || Number(credits) > 30) { setError('Số tín chỉ cần là số nguyên từ 1 đến 30.'); return; }
    if (!semesters.some(s => s.id === semester)) { setError('Hãy chọn học kỳ cho môn học.'); return; }
    if (courseCatalog.some(c => c.id !== item?.id && c.semesterId === semester && c.code.toUpperCase() === code.trim().toUpperCase())) { setError('Mã môn này đã có trong học kỳ đã chọn.'); return; }
    if (item && semester !== item.semesterId && linkCount > 0) { setError('Môn đang có lịch hoặc bài tập liên quan. Giữ nguyên học kỳ để tránh chuyển nhầm dữ liệu.'); return; }
    const course: Course = { id: item?.id ?? uid(), name: name.trim(), code: code.trim().toUpperCase(), credits: Number(credits), teacher: teacher.trim(), room: room.trim(), semesterId: semester, status, color, description: description.trim() };
    saveCourse(course); setToast(item ? 'Đã cập nhật môn học' : 'Đã thêm môn học mới'); onSaved(course.id, course.semesterId);
  };
  return <Sheet title={item ? 'Chỉnh sửa môn học' : 'Môn học mới'} onClose={onClose}>
    <Field label="Tên môn học" value={name} onChange={setName} placeholder="Ví dụ: Công nghệ phần mềm" />
    <Row style={{ alignItems: 'flex-start' }}><View style={S.grow}><Field label="Mã môn học" value={code} onChange={setCode} placeholder="SE301" /></View><View style={{ width: 105 }}><Field label="Số tín chỉ" value={credits} onChange={setCredits} numeric /></View></Row>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Thuộc học kỳ</T>
    <View style={{ gap: 7 }}>{semesters.map(s => <Pressable key={s.id} accessibilityRole="radio" accessibilityLabel={`${s.name}, ${s.academicYear}`} accessibilityState={{ checked: semester === s.id }} aria-checked={semester === s.id} onPress={() => setSemester(s.id)} style={{ backgroundColor: semester === s.id ? C.soft : C.canvas, padding: 12, minHeight: 48, borderRadius: 14 }}><Row><Icon name={semester === s.id ? 'radio-button-on' : 'radio-button-off'} size={19} /><T style={[S.grow, { fontFamily: F.semi, fontSize: 12 }]}>{s.name} · {s.academicYear}</T></Row></Pressable>)}</View>
    <Field label="Giảng viên" value={teacher} onChange={setTeacher} placeholder="Họ và tên giảng viên" />
    <Field label="Phòng học thường dùng" value={room} onChange={setRoom} placeholder="Ví dụ: B1.204" />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái môn học</T>
    <Segments values={['Đang học', 'Hoàn thành', 'Dự kiến']} value={status} onChange={v => setStatus(v as CourseStatus)} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Màu nhận diện</T>
    <Row style={{ flexWrap: 'wrap' }}>{(Object.keys(courseColors) as CourseColor[]).map(key => <Pressable key={key} accessibilityRole="radio" accessibilityLabel={`Màu ${courseColors[key].label}`} accessibilityState={{ checked: key === color }} aria-checked={key === color} onPress={() => setColor(key)} style={{ minHeight: 46, paddingHorizontal: 12, borderWidth: 2, borderColor: key === color ? courseColors[key].ink : 'transparent', borderRadius: 16, backgroundColor: courseColors[key].bg, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: F.semi, color: courseColors[key].ink }}>{courseColors[key].label}</T></Pressable>)}</Row>
    <Field label="Giới thiệu & mục tiêu môn học" value={description} onChange={setDescription} placeholder="Nội dung chính, điều bạn muốn đạt được…" multiline />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    <Button label="Lưu môn học" icon="checkmark" onPress={save} />
    {item && <>
      {linkCount > 0 && <Card style={{ backgroundColor: C.canvas }}><T style={S.small}>Môn đang liên kết với {linkCount} bài tập, ca học hoặc lịch thi. Bạn có thể sửa thông tin; chỉ xóa môn khi đã xử lý các mục liên quan.</T></Card>}
      <Button label={confirmDelete ? 'Xác nhận xóa môn học' : 'Xóa môn học'} danger={confirmDelete} secondary={!confirmDelete} disabled={linkCount > 0} onPress={() => { if (!confirmDelete) { setConfirmDelete(true); return; } if (!deleteCourse(item.id)) { setError('Môn học vẫn còn dữ liệu liên quan.'); return; } setToast('Đã xóa môn học'); onDeleted(); }} />
    </>}
  </Sheet>;
}

