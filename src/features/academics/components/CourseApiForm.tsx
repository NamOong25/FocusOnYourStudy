import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Icon, Row, Segments, Sheet, T } from '../../../shared/components';
import { ApiError, asApiError, assertNotCancelled } from '../../../shared/api/http';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { useApiAction } from '../../account/auth/useApiAction';
import { courseGradeLinks } from '../courseLinks';
import { Course, CourseColor, CourseStatus, courseColors } from '../academic';
import type { CourseInput } from '../api/coursesApi';

const draftOf = (course?: Course, semesterId = '') => ({ name: course?.name ?? '', code: course?.code ?? '', credits: String(course?.credits ?? 3),
  teacher: course?.teacher ?? '', room: course?.room ?? '', semesterId: course?.semesterId ?? semesterId,
  status: course?.status ?? 'Đang học' as CourseStatus, color: course?.color ?? 'lavender' as CourseColor, description: course?.description ?? '' });

export function CourseApiForm({ item, semesterId, onClose, onSaved, onDeleted }: {
  item?: Course; semesterId: string; onClose: () => void; onSaved: (id: string, semesterId: string) => void; onDeleted: () => void;
}) {
  const { semesters, courseCatalog, courseConnection: c, semesterConnection, tasks, classes, exams, studySessions, gradeBook } = useApp();
  const [basis, setBasis] = useState(item), [draft, setDraft] = useState(() => draftOf(item, semesterId));
  const [baseline, setBaseline] = useState(draft), [error, setError] = useState(''), [mustRebase, setMustRebase] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const action = useApiAction();
  if (!c) return null;
  const locked = action.busy || c.busy || c.loading || !!semesterConnection?.busy || !!semesterConnection?.loading;
  const needsReload = c.needsReload || !!semesterConnection?.needsReload;
  const linkCount = basis ? [...tasks, ...classes, ...exams, ...studySessions].filter(value => value.courseId === basis.id).length : 0;
  const { retakeLinked, gradeLinked } = basis ? courseGradeLinks(basis.id, gradeBook) : { retakeLinked: false, gradeLinked: false };
  const update = (value: Partial<typeof draft>) => { if (!locked) { setDraft(v => ({ ...v, ...value })); setError(''); setConfirmDelete(false); } };
  const execute = (operation: () => Promise<Course | void>, success: (result: Course | void) => void) => {
    setError(''); void action.run(async () => {
      try { return await operation(); }
      catch (failure) { if (['COURSE_VERSION_CONFLICT', 'COURSE_NOT_FOUND'].includes(asApiError(failure).code)) setMustRebase(true); throw failure; }
    }, success);
  };
  const save = () => {
    if (locked || mustRebase || needsReload) return;
    const code = draft.code.trim().toUpperCase(), name = draft.name.trim();
    if (!name || !code) { setError('Hãy nhập tên môn và mã môn học.'); return; }
    if (name.length > 200 || code.length > 64) { setError('Tên môn tối đa 200 ký tự và mã môn tối đa 64 ký tự sau khi viết hoa.'); return; }
    if (!/^\d+$/.test(draft.credits) || Number(draft.credits) < 1 || Number(draft.credits) > 30) { setError('Số tín chỉ cần là số nguyên từ 1 đến 30.'); return; }
    if (!semesters.some(s => s.id === draft.semesterId)) { setError('Hãy chọn học kỳ đang có trong tài khoản.'); return; }
    if (courseCatalog.some(course => course.id !== basis?.id && course.semesterId === draft.semesterId && course.code.toUpperCase() === code)) { setError('Mã môn này đã có trong học kỳ đã chọn.'); return; }
    if (basis && draft.semesterId !== basis.semesterId && (linkCount || gradeLinked)) { setError('Môn còn bài, lịch, điểm hoặc liên kết học lại thử. Xử lý các mục này trước khi chuyển học kỳ.'); return; }
    if (basis && retakeLinked && Number(draft.credits) !== basis.credits) { setError('Các lần học lại cần cùng số tín chỉ. Xử lý liên kết học lại trước khi đổi tín chỉ.'); return; }
    const input: CourseInput = { ...draft, name, code, credits: Number(draft.credits), teacher: draft.teacher.trim(), room: draft.room.trim(), description: draft.description.trim() };
    execute(() => c.save(input, basis), value => { const result = value as Course; onSaved(result.id, result.semesterId); });
  };
  const latest = () => {
    void action.run(async signal => {
      const [, courses] = await Promise.all([semesterConnection?.reload(), c.reload()]); assertNotCancelled(signal);
      if (basis) {
        const current = courses.find(course => course.id === basis.id);
        if (!current) throw new ApiError('Môn đã bị xóa. Đóng biểu mẫu để xem danh sách mới.', 'COURSE_NOT_FOUND', 404);
        setBasis(current); const next = draftOf(current); setDraft(next); setBaseline(next); setMustRebase(false);
      }
      setError(''); setConfirmDelete(false);
    }, () => action.clearError());
  };
  const remove = () => {
    if (!basis || locked || needsReload || mustRebase) return;
    if (linkCount || gradeLinked) { setError('Xử lý các bài, lịch, điểm và liên kết học lại thử trước khi xóa môn.'); return; }
    if (!confirmDelete) { setConfirmDelete(true); return; }
    execute(() => c.remove(basis), onDeleted);
  };
  const problem = error || action.error?.message || (needsReload ? 'Tải lại học kỳ và môn học trước khi lưu tiếp.' : '');
  return <Sheet title={basis ? 'Chỉnh sửa môn học' : 'Môn học mới'} onClose={onClose} dirty={JSON.stringify(draft) !== JSON.stringify(baseline)}>
    <Badge label="MÔN HỌC TRONG TÀI KHOẢN" icon="cloud-done-outline" />
    <Field label="Tên môn học" value={draft.name} onChange={name => update({ name })} placeholder="Ví dụ: Công nghệ phần mềm" disabled={locked} maxLength={200} />
    <Row style={{ alignItems: 'flex-start' }}><View style={S.grow}><Field label="Mã môn học" value={draft.code} onChange={code => update({ code })} placeholder="SE301" disabled={locked} maxLength={64} /></View><View style={{ width: 105 }}><Field label="Số tín chỉ" value={draft.credits} onChange={credits => update({ credits })} numeric disabled={locked} maxLength={3} /></View></Row>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Thuộc học kỳ</T>
    <View style={{ gap: 7 }}>{semesters.map(s => <Pressable key={s.id} disabled={locked} accessibilityRole="radio" accessibilityLabel={`${s.name}, ${s.academicYear}`} accessibilityState={{ checked: draft.semesterId === s.id, disabled: locked }} aria-checked={draft.semesterId === s.id} onPress={() => update({ semesterId: s.id })} style={{ backgroundColor: draft.semesterId === s.id ? C.soft : C.canvas, padding: 12, minHeight: 48, borderRadius: 14 }}><Row><Icon name={draft.semesterId === s.id ? 'radio-button-on' : 'radio-button-off'} size={19} /><T style={[S.grow, { fontFamily: F.semi, fontSize: 12 }]}>{s.name} · {s.academicYear}</T></Row></Pressable>)}</View>
    <Field label="Giảng viên" value={draft.teacher} onChange={teacher => update({ teacher })} disabled={locked} maxLength={200} />
    <Field label="Phòng học thường dùng" value={draft.room} onChange={room => update({ room })} disabled={locked} maxLength={100} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái môn học</T>
    <Segments values={['Đang học', 'Hoàn thành', 'Dự kiến']} value={draft.status} onChange={status => update({ status: status as CourseStatus })} disabled={locked} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Màu nhận diện</T>
    <Row style={{ flexWrap: 'wrap' }}>{(Object.keys(courseColors) as CourseColor[]).map(color => <Pressable key={color} disabled={locked} accessibilityRole="radio" accessibilityLabel={`Màu ${courseColors[color].label}`} accessibilityState={{ checked: draft.color === color, disabled: locked }} aria-checked={draft.color === color} onPress={() => update({ color })} style={{ minHeight: 46, paddingHorizontal: 12, borderWidth: 2, borderColor: draft.color === color ? courseColors[color].ink : 'transparent', borderRadius: 16, backgroundColor: courseColors[color].bg, alignItems: 'center', justifyContent: 'center' }}><T style={{ fontSize: 11, fontFamily: F.semi, color: courseColors[color].ink }}>{courseColors[color].label}</T></Pressable>)}</Row>
    <Field label="Giới thiệu & mục tiêu môn học" value={draft.description} onChange={description => update({ description })} multiline disabled={locked} maxLength={5000} />
    {!!problem && <T accessibilityRole="alert" style={{ color: C.red }}>{problem}</T>}
    {!!action.error?.fields && Object.entries(action.error.fields).map(([field, message]) => <T key={field} accessibilityRole="alert" style={{ color: C.red }}>{message}</T>)}
    {(mustRebase || needsReload) && <View style={{ gap: 9 }}><T style={S.small}>{basis ? 'Nạp bản mới sẽ thay nội dung đang chỉnh sửa bằng dữ liệu đã lưu.' : 'Kiểm tra danh sách để biết lần lưu trước đã được ghi nhận hay chưa. App không tự gửi lại thao tác lưu.'}</T><Button label={basis ? 'Nạp bản môn học mới nhất' : 'Kiểm tra lại danh sách môn học'} secondary loading={action.busy} disabled={c.busy || c.loading || !!semesterConnection?.busy || !!semesterConnection?.loading} onPress={latest} /></View>}
    <Button label="Lưu môn học" icon="checkmark" loading={action.busy} disabled={locked || needsReload || mustRebase} onPress={save} />
    {basis && <>
      {(linkCount > 0 || gradeLinked) && <Card style={{ backgroundColor: C.canvas }}><T style={S.small}>Môn đang có bài, lịch, điểm hoặc liên kết học lại thử. Xử lý các mục này trước khi chuyển kỳ hoặc xóa môn. Các dữ liệu thử chưa được lưu vào tài khoản.</T></Card>}
      {confirmDelete && <T accessibilityRole="alert" style={S.small}>Xóa môn {basis.name} khỏi tài khoản? Thao tác này không xóa học kỳ.</T>}
      <Button label={confirmDelete ? 'Xác nhận xóa môn học' : 'Xóa môn học'} danger={confirmDelete} secondary={!confirmDelete} disabled={locked || needsReload || mustRebase || linkCount > 0 || gradeLinked} onPress={remove} />
      {confirmDelete && <Button label="Giữ môn học" secondary disabled={locked} onPress={() => setConfirmDelete(false)} />}
    </>}
  </Sheet>;
}
