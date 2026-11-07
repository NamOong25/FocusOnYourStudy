import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Badge, Button, Field, Icon, Row, Segments, Sheet, T } from '../../../shared/components';
import { DateField, TimeField } from '../../../shared/components/DateTimePicker';
import { ApiError, asApiError, assertNotCancelled } from '../../../shared/api/http';
import { C, F, S } from '../../../shared/theme';
import { dateKey, useApp } from '../../../store/model';
import { CourseChoices } from '../../academics/CourseChoices';
import { useApiAction } from '../../account/auth/useApiAction';
import { sessionExceedsDeadline, taskDeadlineLabel } from '../../assignments/assignments';
import { calendarEvents, findConflicts, type CalendarEvent } from '../../schedule/calendar';
import ConflictPanel from '../../schedule/ConflictPanel';
import type { StudySession, StudyStatus } from '../learning';
import { deviceTimeZone, localTime, studyOverlaps, studyTiming, type StudyInput } from '../studyTime';

export function StudyApiForm({ item, initialTaskId, initialCourseId, initialDate, onClose, onSaved, onDeleted }: {
  item?: StudySession; initialTaskId?: string; initialCourseId?: string; initialDate?: string;
  onClose: () => void; onSaved?: (id: string, date?: string) => void; onDeleted: () => void;
}) {
  const { studyConnection: c, assignmentConnection, courseConnection, courseCatalog, tasks, studySessions, classes, classExceptions, exams, academicSemesterId } = useApp();
  const { width } = useWindowDimensions(), action = useApiAction();
  const draftOf = (row?: StudySession) => ({
    title: row?.title ?? '', courseId: row?.courseId ?? tasks.find(t => t.id === initialTaskId)?.courseId ?? initialCourseId ?? courseCatalog.find(course => course.semesterId === academicSemesterId)?.id ?? courseCatalog[0]?.id ?? '',
    taskId: row ? row.taskId ?? '' : initialTaskId ?? '', date: row?.date ?? initialDate ?? dateKey(new Date()), start: row?.start ?? '19:00',
    duration: String(row?.duration ?? 45), notes: row?.notes ?? '', status: row?.status ?? 'Đã lên lịch' as StudyStatus,
  });
  const [basis, setBasis] = useState(item), [draft, setDraft] = useState(() => draftOf(item));
  const [baseline, setBaseline] = useState(draft), [error, setError] = useState(''), [mustRebase, setMustRebase] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);
  if (!c) return null;
  const parentsBusy = !!assignmentConnection?.busy || !!assignmentConnection?.loading || !!courseConnection?.busy || !!courseConnection?.loading;
  const locked = action.busy || c.busy || c.loading || parentsBusy;
  const needsReload = c.needsReload || !!assignmentConnection?.needsReload || !!courseConnection?.needsReload;
  const change = (patch: Partial<typeof draft>) => { if (!locked) { setDraft(d => ({ ...d, ...patch })); setError(''); setConflicts([]); setConfirmDelete(false); } };
  const execute = (operation: () => Promise<StudySession | void>, success: (result: StudySession | void) => void) => {
    setError(''); void action.run(async () => {
      try { return await operation(); }
      catch (failure) { if (['STUDY_SESSION_VERSION_CONFLICT', 'STUDY_SESSION_NOT_FOUND'].includes(asApiError(failure).code)) setMustRebase(true); throw failure; }
    }, success);
  };
  const save = () => {
    if (locked || needsReload || mustRebase) return;
    setError(''); setConflicts([]);
    if (!draft.title.trim()) { setError('Đặt tên nội dung bạn muốn học trong buổi này.'); return; }
    if (!courseCatalog.some(course => course.id === draft.courseId)) { setError('Hãy chọn môn học đang có trong tài khoản.'); return; }
    if (!/^\d+$/.test(draft.duration)) { setError('Thời lượng cần là số nguyên từ 1 đến 240 phút.'); return; }
    const input: StudyInput = { ...draft, taskId: draft.taskId || undefined, duration: Number(draft.duration) };
    let timing: ReturnType<typeof studyTiming>;
    try { timing = studyTiming(input, basis); } catch (failure) { setError(asApiError(failure).message); return; }
    const candidate = { ...input, startsAt: timing.startsAt };
    const task = tasks.find(task => task.id === draft.taskId);
    if (draft.taskId && (!task || task.courseId !== draft.courseId)) { setError('Bài đang chọn không còn thuộc môn này. Tải lại hoặc chọn Tự học độc lập.'); return; }
    if (task && sessionExceedsDeadline(task, candidate)) { setError(`Buổi học kết thúc sau hạn nộp bài ${taskDeadlineLabel(task)}. Chọn giờ kết thúc không sau hạn hoặc bỏ liên kết để tự học độc lập.`); return; }
    const studyConflicts = studySessions.filter(row => row.id !== basis?.id && studyOverlaps(candidate, row)).map(row => ({ id: row.id, kind: 'Tự học' as const, title: row.title, date: row.date, start: row.start, end: localTime(Date.parse(row.startsAt!) + row.duration * 60_000) }));
    const otherConflicts = findConflicts(draft.date, draft.start, localTime(Date.parse(timing.endsAt)), calendarEvents(draft.date, classes, classExceptions, exams, []));
    if (studyConflicts.length || otherConflicts.length) { setConflicts([...studyConflicts, ...otherConflicts]); if (studyConflicts.length) setError('Khung giờ này đang trùng một buổi tự học đã lưu.'); return; }
    execute(() => c.save(input, basis), result => { const saved = result as StudySession; if (onSaved) onSaved(saved.id, saved.date); else onClose(); });
  };
  const latest = () => {
    void action.run(async signal => {
      // assignment reload also refreshes study links after a parent was deleted.
      const [rows] = await Promise.all([c.reload(), assignmentConnection?.reload(), courseConnection?.reload()]); assertNotCancelled(signal);
      if (basis) {
        const current = rows.find(row => row.id === basis.id);
        if (!current) throw new ApiError('Buổi học đã bị xóa. Đóng biểu mẫu để xem danh sách mới.', 'STUDY_SESSION_NOT_FOUND', 404);
        setBasis(current); const next = draftOf(current); setDraft(next); setBaseline(next); setMustRebase(false);
      }
      setError(''); setConflicts([]); setConfirmDelete(false);
    }, () => action.clearError());
  };
  const remove = () => {
    if (!basis || locked || needsReload || mustRebase) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    execute(() => c.remove(basis), onDeleted);
  };
  const problem = error || action.error?.message || (needsReload ? 'Tải lại buổi học, bài tập và môn trước khi lưu tiếp.' : '');
  return <Sheet title={basis ? 'Chỉnh sửa buổi tự học' : 'Buổi tự học mới'} onClose={onClose} dirty={JSON.stringify(draft) !== JSON.stringify(baseline)}>
    <Badge label="BUỔI HỌC TRONG TÀI KHOẢN" icon="cloud-done-outline" />
    <Field label="Nội dung tự học" value={draft.title} onChange={title => change({ title })} placeholder="Ví dụ: Viết phần giới thiệu báo cáo" maxLength={200} disabled={locked}/>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Môn học</T><CourseChoices value={draft.courseId} onChange={courseId => change({ courseId, taskId: '' })} disabled={locked}/>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Liên kết bài tập (không bắt buộc)</T>
    <View style={{ gap: 7 }}>{[{ id: '', title: 'Tự học độc lập' }, ...tasks.filter(task => task.courseId === draft.courseId)].map(task => <Pressable key={task.id || 'independent'} disabled={locked} accessibilityRole="radio" accessibilityLabel={`Liên kết: ${task.title}`} aria-checked={draft.taskId === task.id} accessibilityState={{ checked: draft.taskId === task.id, disabled: locked }} onPress={() => change({ taskId: task.id })} style={{ padding: 12, minHeight: 48, borderRadius: 14, backgroundColor: draft.taskId === task.id ? C.soft : C.canvas }}><Row><Icon name={draft.taskId === task.id ? 'radio-button-on' : 'radio-button-off'} size={18}/><T style={[S.grow, { fontSize: 12 }]}>{task.title}</T></Row></Pressable>)}</View>
    {!!draft.taskId && !tasks.some(task => task.id === draft.taskId && task.courseId === draft.courseId) && <T style={{ color: C.red }}>Bài đang liên kết không còn trong danh sách. Tải lại dữ liệu hoặc chọn Tự học độc lập.</T>}
    <DateField label="Ngày học" value={draft.date} onChange={date => change({ date })} disabled={locked}/>
    <View style={{ gap: 12, flexDirection: width < 360 ? 'column' : 'row' }}><View style={S.grow}><TimeField label="Bắt đầu" value={draft.start} onChange={start => change({ start })} disabled={locked}/></View><View style={S.grow}><Field label="Thời lượng (phút)" value={draft.duration} onChange={duration => change({ duration })} numeric maxLength={3} disabled={locked}/></View></View>
    <Segments values={['25', '45', '60', '90']} value={draft.duration} onChange={duration => change({ duration })} disabled={locked}/>
    <T style={S.small}>Ngày/giờ hiển thị theo thiết bị · Múi giờ buổi: {basis && basis.date === draft.date && basis.start === draft.start ? basis.timeZone : deviceTimeZone()}. Thời lượng dự kiến không tự cộng thời gian Pomodoro.</T>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái buổi học</T><Segments values={['Đã lên lịch', 'Đang học', 'Hoàn thành']} value={draft.status} onChange={status => change({ status: status as StudyStatus })} disabled={locked}/>
    <Field label="Ghi chú buổi học" value={draft.notes} onChange={notes => change({ notes })} multiline maxLength={5000} disabled={locked}/>
    {!!problem && <T accessibilityRole="alert" style={{ color: C.red }}>{problem}</T>}
    {!!action.error?.fields && Object.entries(action.error.fields).map(([field, message]) => <T key={field} accessibilityRole="alert" style={{ color: C.red }}>{message}</T>)}
    <ConflictPanel conflicts={conflicts} candidate={`${draft.title || 'Buổi tự học'} · ${draft.start}`}/>
    {(needsReload || mustRebase) && <><T style={S.small}>{basis ? 'Nạp bản mới sẽ thay nội dung đang chỉnh sửa bằng dữ liệu đã lưu.' : 'Kiểm tra danh sách trước để biết lần lưu trước đã được ghi nhận hay chưa. App không tự gửi lại.'}</T><Button label={basis ? 'Nạp bản buổi học mới nhất' : 'Kiểm tra lại danh sách tự học'} secondary loading={action.busy} disabled={c.busy || c.loading || parentsBusy} onPress={latest}/></>}
    <Button label="Lưu buổi tự học" icon="checkmark" loading={action.busy} disabled={locked || needsReload || mustRebase} onPress={save}/>
    {basis && <>{confirmDelete && <T accessibilityRole="alert" style={S.small}>Xóa buổi “{basis.title}”? Bài tập liên quan vẫn được giữ.</T>}<Button label={confirmDelete ? 'Xác nhận xóa buổi tự học' : 'Xóa buổi tự học'} danger={confirmDelete} secondary={!confirmDelete} disabled={locked || needsReload || mustRebase} onPress={remove}/>{confirmDelete && <Button label="Giữ buổi tự học" secondary disabled={locked} onPress={() => setConfirmDelete(false)}/>}</>}
  </Sheet>;
}
