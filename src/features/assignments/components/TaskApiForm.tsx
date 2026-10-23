import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Badge, Button, Field, Row, Segments, Sheet, T } from '../../../shared/components';
import { DateField, TimeField } from '../../../shared/components/DateTimePicker';
import { ApiError, asApiError, assertNotCancelled } from '../../../shared/api/http';
import { C, F, S } from '../../../shared/theme';
import { addDays, dateKey, useApp } from '../../../store/model';
import { CourseChoices } from '../../academics/CourseChoices';
import { useApiAction } from '../../account/auth/useApiAction';
import { deadlineTimestamp, sessionExceedsDeadline, taskDeadlineLabel, taskDeadlineTime, type Task, type TaskStatus } from '../assignments';
import type { AssignmentInput } from '../api/assignmentsApi';

const draftOf = (item?: Task, courseId = ''): AssignmentInput => ({ title: item?.title ?? '', courseId: item?.courseId ?? courseId,
  deadline: item?.deadline ?? dateKey(addDays(new Date(), 1)), deadlineTime: item ? taskDeadlineTime(item) : '23:59',
  priority: item?.priority ?? 'Trung bình', status: item?.status ?? 'Chưa làm', notes: item?.notes ?? '' });

export function TaskApiForm({ item, initialCourseId, onClose, onDeleted }: {
  item?: Task; initialCourseId?: string; onClose: () => void; onDeleted: () => void;
}) {
  const { assignmentConnection: c, courseConnection, courseCatalog, studySessions, academicSemesterId } = useApp();
  const { width } = useWindowDimensions();
  // Editing is based on the version that opened the form, never a live replacement of its draft.
  const [basis, setBasis] = useState(item), [draft, setDraft] = useState(() => draftOf(item, initialCourseId ?? courseCatalog.find(course => course.semesterId === academicSemesterId)?.id ?? courseCatalog[0]?.id));
  const [baseline, setBaseline] = useState(draft), [error, setError] = useState(''), [mustRebase, setMustRebase] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const action = useApiAction();
  if (!c) return null;
  const locked = action.busy || c.busy || c.loading || !!courseConnection?.busy || !!courseConnection?.loading;
  const needsReload = c.needsReload || !!courseConnection?.needsReload;
  const update = (patch: Partial<AssignmentInput>) => { if (!locked) { setDraft(d => ({ ...d, ...patch })); setError(''); setConfirmDelete(false); } };
  const execute = (operation: () => Promise<unknown>, success: () => void) => {
    setError(''); void action.run(async () => {
      try { return await operation(); }
      catch (failure) { if (['ASSIGNMENT_VERSION_CONFLICT', 'ASSIGNMENT_NOT_FOUND'].includes(asApiError(failure).code)) setMustRebase(true); throw failure; }
    }, success);
  };
  const save = () => {
    if (locked || needsReload || mustRebase) return;
    if (!draft.title.trim()) { setError('Nhập tên bài tập trước nhé.'); return; }
    if (!courseCatalog.some(course => course.id === draft.courseId)) { setError('Hãy chọn môn học đang có trong tài khoản.'); return; }
    if (!Number.isFinite(deadlineTimestamp(draft))) { setError('Ngày hoặc giờ hạn nộp chưa hợp lệ. Mở lịch/đồng hồ để chọn lại.'); return; }
    if (basis && draft.courseId !== basis.courseId && studySessions.some(s => s.taskId === basis.id)) {
      setError('Bài tập đang có buổi tự học liên quan. Gỡ liên kết các buổi trước khi đổi môn.'); return;
    }
    const conflicting = basis && studySessions.find(s => s.taskId === basis.id && sessionExceedsDeadline(draft, s));
    if (conflicting) { setError(`Hạn nộp mới ${taskDeadlineLabel(draft)} đang trước lúc kết thúc buổi “${conflicting.title}”. Điều chỉnh buổi học hoặc gỡ liên kết trước nhé.`); return; }
    execute(() => c.save(draft, basis), onClose);
  };
  const latest = () => {
    void action.run(async signal => {
      const [tasks] = await Promise.all([c.reload(), courseConnection?.reload()]); assertNotCancelled(signal);
      if (basis) {
        const current = tasks.find(task => task.id === basis.id);
        if (!current) throw new ApiError('Bài tập đã bị xóa. Đóng biểu mẫu để xem danh sách mới.', 'ASSIGNMENT_NOT_FOUND', 404);
        setBasis(current); const next = draftOf(current); setDraft(next); setBaseline(next); setMustRebase(false);
      }
      setError(''); setConfirmDelete(false);
    }, () => action.clearError());
  };
  const remove = () => {
    if (!basis || locked || needsReload || mustRebase) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    execute(() => c.remove(basis), onDeleted);
  };
  const problem = error || action.error?.message || (needsReload ? 'Tải lại danh sách bài tập và môn học trước khi lưu tiếp.' : '');
  return <Sheet title={basis ? 'Chỉnh sửa bài tập' : 'Bài tập mới'} onClose={onClose} dirty={JSON.stringify(draft) !== JSON.stringify(baseline)}>
    <Badge label="BÀI TẬP TRONG TÀI KHOẢN" icon="cloud-done-outline" />
    <Field label="Tên bài tập" value={draft.title} onChange={title => update({ title })} placeholder="Bạn cần hoàn thành điều gì?" maxLength={200} disabled={locked} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Môn học</T><CourseChoices value={draft.courseId} onChange={courseId => update({ courseId })} disabled={locked} />
    <View style={{ gap: 12, flexDirection: width < 360 ? 'column' : 'row' }}><View style={S.grow}><DateField label="Hạn nộp" value={draft.deadline} onChange={deadline => update({ deadline })} disabled={locked} /></View><View style={S.grow}><TimeField label="Giờ hạn nộp" value={taskDeadlineTime(draft)} onChange={deadlineTime => update({ deadlineTime })} disabled={locked} /></View></View>
    <T style={S.small}>Ngày và giờ theo thiết bị · Đồng hồ 24 giờ. Hạn nộp được lưu kèm thời điểm để mở trên thiết bị khác vẫn đúng giờ.</T>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Độ ưu tiên</T><Segments values={['Trung bình', 'Cao']} value={draft.priority} onChange={priority => update({ priority: priority as Task['priority'] })} disabled={locked} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái</T><Segments values={['Chưa làm', 'Đang làm', 'Hoàn thành']} value={draft.status} onChange={status => update({ status: status as TaskStatus })} disabled={locked} />
    <Field label="Ghi chú" value={draft.notes} onChange={notes => update({ notes })} multiline maxLength={5000} disabled={locked} placeholder="Yêu cầu bài tập, tài liệu cần đọc…" />
    {!!problem && <T accessibilityRole="alert" style={{ color: C.red }}>{problem}</T>}
    {!!action.error?.fields && Object.entries(action.error.fields).map(([field, message]) => <T key={field} accessibilityRole="alert" style={{ color: C.red }}>{message}</T>)}
    {(needsReload || mustRebase) && <><T style={S.small}>{basis ? 'Nạp bản mới sẽ thay nội dung đang chỉnh sửa bằng dữ liệu đã lưu.' : 'Kiểm tra danh sách trước khi tạo tiếp để biết lần lưu trước đã được ghi nhận hay chưa.'}</T><Button label={basis ? 'Nạp bản bài tập mới nhất' : 'Kiểm tra lại danh sách bài tập'} secondary loading={action.busy} disabled={c.busy || c.loading || !!courseConnection?.busy || !!courseConnection?.loading} onPress={latest} /></>}
    <Button label={basis ? 'Lưu thay đổi' : 'Tạo bài tập'} icon="checkmark" loading={action.busy} disabled={locked || needsReload || mustRebase} onPress={save} />
    {basis && <><T style={S.small}>Xóa bài tập sẽ gỡ liên kết các buổi tự học trong phiên này; buổi học vẫn được giữ lại.</T>
      {confirmDelete && <T accessibilityRole="alert" style={S.small}>Xóa bài tập “{basis.title}” khỏi tài khoản?</T>}
      <Button label={confirmDelete ? 'Xác nhận xóa bài tập' : 'Xóa bài tập'} danger={confirmDelete} secondary={!confirmDelete} disabled={locked || needsReload || mustRebase} onPress={remove} />
      {confirmDelete && <Button label="Giữ bài tập" secondary disabled={locked} onPress={() => setConfirmDelete(false)} />}</>}
  </Sheet>;
}
