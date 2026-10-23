import React, { useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Field, Segments, Sheet, T } from '../../../shared/components';
import { ApiError, asApiError } from '../../../shared/api/http';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { useApiAction } from '../../account/auth/useApiAction';
import { Semester, SemesterStatus, SemesterTerm } from '../academic';
import { AcademicYearPicker } from './AcademicYearPicker';
import { SemesterPicker } from './SemesterPicker';

const draftOf = (s?: Semester, defaultYear = new Date().getFullYear()) => ({ term: s?.term ?? 1 as SemesterTerm,
  startYear: s ? Number(s.academicYear.slice(0, 4)) : defaultYear, status: s?.status ?? 'Sắp tới' as SemesterStatus, note: s?.note ?? '' });
export function SemesterApiForm({ item, onClose, onSaved, onDeleted }: { item?: Semester; onClose: () => void; onSaved: (id: string) => void; onDeleted?: () => void }) {
  const { semesters, semesterConnection: c, courseCatalog } = useApp();
  const [basis, setBasis] = useState(item);
  const [draft, setDraft] = useState(() => draftOf(item, Number((semesters.find(s => s.status === 'Đang học')?.academicYear ?? String(new Date().getFullYear())).slice(0, 4))));
  const [baseline, setBaseline] = useState(draft), [error, setError] = useState(''), [mustRebase, setMustRebase] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const action = useApiAction();
  if (!c) return null;
  const locked = action.busy || c.busy || c.loading;
  const update = (value: Partial<typeof draft>) => { if (!locked) { setDraft(v => ({ ...v, ...value })); setError(''); setConfirmDelete(false); } };
  const execute = (operation: () => Promise<Semester | void>, success: (result: Semester | void) => void) => {
    setError('');
    void action.run(async () => {
      try { return await operation(); }
      catch (failure) { if (['SEMESTER_VERSION_CONFLICT', 'SEMESTER_NOT_FOUND'].includes(asApiError(failure).code)) setMustRebase(true); throw failure; }
    }, success);
  };
  const save = () => {
    if (locked || mustRebase || c.needsReload) return;
    if (semesters.some(s => s.id !== basis?.id && s.term === draft.term && Number(s.academicYear.slice(0, 4)) === draft.startYear)) { setError('Học kỳ này đã có trong năm học đã chọn.'); return; }
    if (draft.note.length > 2000) { setError('Ghi chú tối đa 2000 ký tự.'); return; }
    execute(() => c.save({ ...draft, note: draft.note.trim() }, basis), result => {
      onSaved((result as Semester).id);
    });
  };
  const latest = () => {
    void action.run(async () => {
      const rows = await c.reload();
      if (basis) {
        const current = rows.find(s => s.id === basis.id);
        if (!current) throw new ApiError('Học kỳ đã bị xóa. Đóng biểu mẫu để xem danh sách mới.', 'SEMESTER_NOT_FOUND', 404);
        setBasis(current); const next = draftOf(current); setDraft(next); setBaseline(next); setMustRebase(false);
      }
      setError(''); setConfirmDelete(false);
    }, () => { action.clearError(); });
  };
  const remove = () => {
    if (!basis || locked || mustRebase || c.needsReload) return;
    if (courseCatalog.some(course => course.semesterId === basis.id)) { setError('Học kỳ còn môn thử trong phiên này. Xóa hoặc chuyển các môn thử trước khi xóa học kỳ.'); return; }
    if (!confirmDelete) { setConfirmDelete(true); return; }
    execute(() => c.remove(basis), () => { if (onDeleted) onDeleted(); else onClose(); });
  };
  const problem = error || action.error?.message || (c.needsReload ? 'Chưa xác nhận được dữ liệu mới nhất. Tải lại danh sách trước khi lưu tiếp.' : '');
  return <Sheet title={basis ? 'Chỉnh sửa học kỳ' : 'Học kỳ mới'} onClose={onClose} dirty={JSON.stringify(draft) !== JSON.stringify(baseline)}>
    <Badge label="HỌC KỲ TRONG TÀI KHOẢN" icon="cloud-done-outline" />
    <AcademicYearPicker value={draft.startYear} onChange={startYear => update({ startYear })} disabled={locked} />
    <SemesterPicker value={draft.term} onChange={term => update({ term })} disabled={locked} />
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Trạng thái học kỳ</T>
    <Segments values={['Đang học', 'Sắp tới', 'Đã kết thúc']} value={draft.status} onChange={status => update({ status: status as SemesterStatus })} disabled={locked} />
    {draft.status === 'Đang học' && <T style={S.small}>Kỳ đang học trước đó sẽ chuyển sang Đã kết thúc khi lưu.</T>}
    <Field label="Ghi chú cho học kỳ" value={draft.note} onChange={note => update({ note })} multiline disabled={locked} maxLength={2000} />
    <T style={S.small}>{draft.note.length}/2000 ký tự</T>
    {!!problem && <T accessibilityRole="alert" style={{ color: C.red }}>{problem}</T>}
    {(mustRebase || c.needsReload) && <View style={{ gap: 9 }}>
      <T style={S.small}>{basis ? 'Nạp bản mới sẽ thay nội dung đang chỉnh sửa bằng dữ liệu đã lưu.' : 'Kiểm tra danh sách để biết lần lưu trước đã được ghi nhận hay chưa. Thao tác lưu không tự gửi lại.'}</T>
      <Button label={basis ? 'Nạp bản học kỳ mới nhất' : 'Kiểm tra lại danh sách học kỳ'} secondary loading={action.busy} disabled={c.busy || c.loading} onPress={latest} />
    </View>}
    <Button label="Lưu học kỳ" icon="checkmark" loading={action.busy} disabled={c.busy || c.loading || mustRebase || c.needsReload} onPress={save} />
    {!!basis && <>
      {confirmDelete && <T accessibilityRole="alert" style={S.small}>Xóa {basis.name}, {basis.academicYear}? Chỉ học kỳ không còn môn mới xóa được.</T>}
      <Button label={confirmDelete ? 'Xác nhận xóa học kỳ' : 'Xóa học kỳ'} secondary={!confirmDelete} danger={confirmDelete} disabled={locked || mustRebase || c.needsReload} onPress={remove} />
      {confirmDelete && <Button label="Giữ học kỳ" secondary disabled={locked} onPress={() => setConfirmDelete(false)} />}
    </>}
  </Sheet>;
}
