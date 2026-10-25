import React, { useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Badge, Button, Field, Icon, Row, Segments, Sheet, T } from '../../../shared/components';
import { DateField, TimeField } from '../../../shared/components/DateTimePicker';
import { FlowScope } from '../../../navigation/Navigation';
import { asApiError } from '../../../shared/api/http';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { CourseChoices } from '../../academics/CourseChoices';
import { examDraft, examDraftInput, examInstants, type ExamDraft } from '../examDraft';
import { examKinds, examFormats, type ServerExam } from '../api/examsApi';
import { useExamWrites } from '../api/ExamWritesProvider';
import { examDate, examTiming } from '../examView';
import ExamWriteReview from './ExamWriteReview';

export default function ExamApiForm({ original, initialCourseId, onClose, onSaved, onDeleted }: {
  original?: ServerExam; initialCourseId?: string; onClose: () => void; onSaved?: (exam: ServerExam) => void; onDeleted?: () => void;
}) {
  const { courseCatalog, courseConnection, academicSemesterId, setToast } = useApp(), { width } = useWindowDimensions(), { manager, state } = useExamWrites();
  const [basis, setBasis] = useState(original), [draft, setDraft] = useState(() => examDraft(original, initialCourseId ?? courseCatalog.find(c => c.semesterId === academicSemesterId)?.id ?? ''));
  const [baseline, setBaseline] = useState(draft), [error, setError] = useState(''), [confirmDelete, setConfirmDelete] = useState(false), [custom, setCustom] = useState('');
  const [parentsLoading, setParentsLoading] = useState(false), [completed, setCompleted] = useState<ServerExam | 'deleted' | null>(null);
  const locked = state.busy || state.checking || parentsLoading || !!courseConnection?.busy || !!courseConnection?.loading;
  const staleParents = !courseConnection?.loaded || !!courseConnection?.needsReload;
  const blocked = locked || !!state.pending || !!completed;
  const change = (patch: Partial<ExamDraft>) => { if (!blocked) { setDraft(d => ({ ...d, ...patch })); setError(''); manager.clearError(); setConfirmDelete(false); } };
  const close = () => { if (!manager.state.busy && !manager.state.checking) onClose(); };
  const dirty = !completed && (JSON.stringify(draft) !== JSON.stringify(baseline) || !!state.pending);
  const save = () => {
    if (blocked || staleParents) return;
    setError(''); setConfirmDelete(false);
    if (!courseCatalog.some(c => c.id === draft.courseId)) { setError('Hãy chọn môn đang có trong tài khoản.'); return; }
    let input;
    try { input = examDraftInput(draft); } catch (failure) { setError(asApiError(failure).message); return; }
    void manager.save(input, basis).then(exam => { setCompleted(exam); setToast(basis ? 'Đã cập nhật lịch thi trong tài khoản' : 'Đã thêm lịch thi vào tài khoản'); onSaved?.(exam); }).catch(() => {});
  };
  const remove = () => {
    if (!basis || blocked) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    void manager.remove(basis).then(() => { setCompleted('deleted'); setToast('Đã xóa lịch thi và cấu hình nhắc của lịch'); (onDeleted ?? onClose)(); }).catch(() => {});
  };
  const fold = (side: 'start' | 'end') => {
    const choices = examInstants(draft.date, draft[side], draft.timeZone.trim());
    if (choices.length < 2) return null;
    const key = side === 'start' ? 'startChoice' : 'endChoice';
    return <View style={{ gap: 8 }}><T style={S.small}>Giờ {side === 'start' ? 'bắt đầu' : 'kết thúc'} xuất hiện hai lần. Chọn đúng lần:</T>{choices.map((at, index) => {
      const offset = new Intl.DateTimeFormat('en', { timeZone: draft.timeZone.trim(), timeZoneName: 'shortOffset' }).formatToParts(Date.parse(at)).find(p => p.type === 'timeZoneName')!.value;
      return <Button key={at} label={`Lần ${index + 1} · ${draft[side]} (${offset})`} secondary={Date.parse(draft[key]) !== Date.parse(at)} disabled={blocked} onPress={() => change({ [key]: at })} />;
    })}</View>;
  };
  return <FlowScope onClose={close}><Sheet title={completed ? 'Kết quả lịch thi' : basis ? 'Chỉnh sửa lịch thi' : 'Lịch thi mới'} onClose={close} dirty={dirty}>
    {completed ? <><T style={{ fontFamily: F.bold }}>{completed === 'deleted' ? 'Lịch thi đã được xóa' : 'Lịch thi đã được lưu vào tài khoản'}</T>{completed !== 'deleted' && <T style={S.small}>{examDate(completed)} · {examTiming(completed)}</T>}<Button label="Đóng kết quả" onPress={close} /></> : <>
      <Badge label="LỊCH THI TRONG TÀI KHOẢN" icon="cloud-done-outline" />
      <T style={{ fontFamily: F.semi }}>Môn học</T><CourseChoices value={draft.courseId} onChange={courseId => change({ courseId })} disabled={blocked} />
      <T style={{ fontFamily: F.semi, fontSize: 12 }}>Loại kỳ thi</T><Segments values={Object.values(examKinds)} value={examKinds[draft.kind]} disabled={blocked} onChange={value => change({ kind: (Object.keys(examKinds) as ServerExam['kind'][]).find(key => examKinds[key] === value)! })} />
      <T style={{ fontFamily: F.semi, fontSize: 12 }}>Hình thức thi</T>
      <Row style={{ flexWrap: 'wrap' }}>{(Object.keys(examFormats) as ServerExam['format'][]).map(key => <Pressable key={key} disabled={blocked} accessibilityRole="radio" accessibilityLabel={`Hình thức ${examFormats[key]}`} accessibilityState={{ checked: draft.format === key, disabled: blocked }} aria-checked={draft.format === key} onPress={() => change({ format: key })} style={{ minHeight: 44, borderRadius: 17, paddingHorizontal: 13, justifyContent: 'center', backgroundColor: draft.format === key ? C.primary : C.track }}><T style={{ fontFamily: F.semi, fontSize: 12, color: draft.format === key ? '#fff' : C.muted }}>{examFormats[key]}</T></Pressable>)}</Row>
      <DateField label="Ngày thi" value={draft.date} disabled={blocked} onChange={date => change({ date, startChoice: '', endChoice: '' })} />
      <View style={{ gap: 12, flexDirection: width < 360 ? 'column' : 'row' }}><View style={S.grow}><TimeField label="Giờ thi" value={draft.start} disabled={blocked} onChange={start => change({ start, startChoice: '' })} /></View><View style={S.grow}><TimeField label="Kết thúc thi" value={draft.end} disabled={blocked} onChange={end => change({ end, endChoice: '' })} /></View></View>
      <Field label="Múi giờ kỳ thi" value={draft.timeZone} disabled={blocked} maxLength={100} placeholder="Asia/Ho_Chi_Minh" onChange={timeZone => change({ timeZone, startChoice: '', endChoice: '' })} />
      <T style={S.small}>Ngày/giờ theo múi giờ ghi ở đây. Kết thúc trước 24:00 cùng ngày. Đổi múi giờ sẽ đổi thời điểm thực tế của lịch thi.</T>{fold('start')}{fold('end')}
      <Field label={draft.format === 'ONLINE' ? 'Phòng / đường dẫn thi' : 'Phòng thi'} value={draft.room} maxLength={100} disabled={blocked} onChange={room => change({ room })} placeholder="Ví dụ: B202 hoặc Phòng máy 3" />
      <T style={{ fontFamily: F.semi, fontSize: 12 }}>Tùy chọn nhắc</T><Segments values={['Không nhắc', 'Có nhắc']} value={draft.reminder ? 'Có nhắc' : 'Không nhắc'} disabled={blocked} onChange={value => change({ reminder: value === 'Có nhắc' })} />
      {draft.reminder && <View style={{ gap: 8 }}>{[...new Set([1440, 180, 60, 15, 0, ...draft.minutes])].sort((a, b) => b - a).map(minutes => <Pressable key={minutes} disabled={blocked} accessibilityRole="checkbox" accessibilityLabel={minutes ? `Nhắc trước ${minutes} phút` : 'Nhắc đúng giờ bắt đầu'} accessibilityState={{ checked: draft.minutes.includes(minutes), disabled: blocked }} aria-checked={draft.minutes.includes(minutes)} onPress={() => {
        if (!draft.minutes.includes(minutes) && draft.minutes.length >= 10) { setError('Chọn tối đa 10 mốc nhắc.'); return; }
        change({ minutes: draft.minutes.includes(minutes) ? draft.minutes.filter(n => n !== minutes) : [...draft.minutes, minutes].sort((a, b) => b - a) });
      }} style={{ padding: 12, minHeight: 46, borderRadius: 14, backgroundColor: draft.minutes.includes(minutes) ? C.soft : C.canvas }}><Row><Icon name={draft.minutes.includes(minutes) ? 'checkbox' : 'square-outline'} size={19} /><T style={{ fontSize: 12 }}>{minutes ? `Trước ${minutes} phút${minutes === 1440 ? ' (1 ngày)' : ''}` : 'Đúng giờ bắt đầu'}</T></Row></Pressable>)}
        <Field label="Thêm mốc nhắc (phút)" value={custom} numeric maxLength={5} disabled={blocked} onChange={setCustom} placeholder="0–10080 phút" />
        <Button label="Thêm mốc nhắc" secondary disabled={blocked} onPress={() => {
          if (!/^\d{1,5}$/.test(custom) || Number(custom) > 10080) { setError('Mốc nhắc cần là số nguyên từ 0 đến 10080 phút.'); return; }
          const n = Number(custom); if (draft.minutes.includes(n)) { setError('Mốc nhắc này đã được chọn.'); return; }
          if (draft.minutes.length >= 10) { setError('Chọn tối đa 10 mốc nhắc.'); return; }
          change({ minutes: [...draft.minutes, n].sort((a, b) => b - a) }); setCustom('');
        }} />
      </View>}
      <T style={S.small}>Các mốc nhắc được lưu vào tài khoản. Thông báo trên thiết bị sẽ được bổ sung ở đợt sau.</T>
      <Field label="Ghi chú kỳ thi" value={draft.notes} onChange={notes => change({ notes })} disabled={blocked} multiline maxLength={5000} placeholder="Giấy tờ cần mang, nội dung cần chuẩn bị…" />
      {!!(error || state.error?.message) && !state.pending && <T accessibilityRole="alert" style={{ color: C.red }}>{error || state.error?.message}</T>}
      {!state.pending && Object.entries(state.error?.fields ?? {}).map(([key, message]) => <T key={key} accessibilityRole="alert" style={{ color: C.red }}>{message}</T>)}
      {staleParents && <><T style={{ color: C.red }}>Cần tải lại danh mục môn trước khi lưu. Nội dung đang nhập được giữ.</T><Button label="Tải lại danh mục môn" secondary disabled={locked} onPress={() => { setParentsLoading(true); void courseConnection?.reload().catch(e => setError(asApiError(e).message)).finally(() => setParentsLoading(false)); }} /></>}
      <ExamWriteReview onReplace={exam => { const next = examDraft(exam); setBasis(exam); setDraft(next); setBaseline(next); setConfirmDelete(false); setError(''); }} onClose={onClose} />
      {state.busy && <T accessibilityLiveRegion="polite" style={S.small}>Đang gửi yêu cầu. Đợi kết quả trước khi đóng biểu mẫu.</T>}
      <Button label={basis ? 'Lưu lịch thi' : 'Thêm lịch thi'} icon="checkmark" loading={state.busy} disabled={blocked || staleParents || !courseCatalog.length} onPress={save} />
      {basis && <>{confirmDelete && <T accessibilityRole="alert" style={{ color: C.red }}>Xóa lịch đã lưu “{courseCatalog.find(c => c.id === basis.courseId)?.name ?? 'Môn học'}”, {examDate(basis)} · {examTiming(basis)} ({basis.timeZone}) và cấu hình nhắc của lịch? Môn học và các lịch khác được giữ.{dirty ? ' Nội dung đang chỉnh sửa chưa được lưu.' : ''}</T>}<Button label={confirmDelete ? 'Xác nhận xóa lịch thi' : 'Xóa lịch thi'} danger={confirmDelete} secondary={!confirmDelete} disabled={blocked} onPress={remove} />{confirmDelete && <Button label="Giữ lịch thi" secondary disabled={blocked} onPress={() => setConfirmDelete(false)} />}</>}
    </>}
  </Sheet></FlowScope>;
}
