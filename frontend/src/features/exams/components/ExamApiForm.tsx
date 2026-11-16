import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Button, Field, Segments, Sheet, StateView, T } from '../../../shared/components';
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
import { ExamExtraFields, ExamFormatPicker } from './ExamFormOptions';
import { useSavedReminderPreferences } from '../../account/preferences/ReminderPreferencesProvider';

type Props = {
  original?: ServerExam; initialCourseId?: string; onClose: () => void; onSaved?: (exam: ServerExam) => void; onDeleted?: () => void;
};

export default function ExamApiForm(props: Props) {
  const preferences = useSavedReminderPreferences();
  if (!props.original && !preferences.value) return <Sheet title="Thêm lịch thi" onClose={props.onClose} hideBackButton>
    <StateView kind={preferences.error ? 'error' : 'loading'} title="Đang chuẩn bị mốc nhắc"
      message={preferences.error?.message ?? 'Đang đọc tùy chọn nhắc học đã lưu.'} />
    {preferences.error && <Button label="Tải lại tùy chọn nhắc học" secondary loading={preferences.loading}
      onPress={() => { void preferences.reload().catch(() => { }); }} />}
  </Sheet>;
  return <ExamApiFormContent {...props} defaultReminderMinutes={preferences.value?.reminderMinutes} />;
}

function ExamApiFormContent({ original, initialCourseId, onClose, onSaved, onDeleted, defaultReminderMinutes }: Props & { defaultReminderMinutes?: number }) {
  const { courseCatalog, courseConnection, academicSemesterId, setToast } = useApp(), { width, fontScale } = useWindowDimensions(), { manager, state } = useExamWrites();
  const [basis, setBasis] = useState(original), [draft, setDraft] = useState(() => examDraft(original, initialCourseId ?? courseCatalog.find(c => c.semesterId === academicSemesterId)?.id ?? '', defaultReminderMinutes));
  const [baseline, setBaseline] = useState(draft), [error, setError] = useState(''), [confirmDelete, setConfirmDelete] = useState(false);
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
  return <FlowScope onClose={close}><Sheet title={completed ? 'Kết quả lịch thi' : basis ? 'Chỉnh sửa lịch thi' : 'Thêm lịch thi'} onClose={close} dirty={dirty} hideBackButton>
    {completed ? <><T style={{ fontFamily: F.bold }}>{completed === 'deleted' ? 'Lịch thi đã được xóa' : 'Lịch thi đã được lưu vào tài khoản'}</T>{completed !== 'deleted' && <T style={S.small}>{examDate(completed)} · {examTiming(completed)}</T>}<Button label="Đóng kết quả" onPress={close} /></> : <>
      <CourseChoices dropdown value={draft.courseId} onChange={courseId => change({ courseId })} disabled={blocked} />
      <View style={{ gap: 7 }}>
        <T style={{ fontFamily: F.semi, fontSize: 12 }}>Loại kỳ thi</T>
        <Segments values={Object.values(examKinds)} value={examKinds[draft.kind]} disabled={blocked}
          onChange={value => change({ kind: (Object.keys(examKinds) as ServerExam['kind'][]).find(key => examKinds[key] === value)! })} />
      </View>
      <ExamFormatPicker value={examFormats[draft.format]} options={Object.values(examFormats)} disabled={blocked}
        onChange={value => change({ format: (Object.keys(examFormats) as ServerExam['format'][]).find(key => examFormats[key] === value)! })} />
      <DateField label="Ngày thi" value={draft.date} disabled={blocked} onChange={date => change({ date, startChoice: '', endChoice: '' })} />
      <View style={{ gap: 12, flexDirection: width < 360 || fontScale > 1.25 ? 'column' : 'row' }}>
        <View style={S.grow}><TimeField label="Bắt đầu" value={draft.start} disabled={blocked} onChange={start => change({ start, startChoice: '' })} /></View>
        <View style={S.grow}><TimeField label="Kết thúc" value={draft.end} disabled={blocked} onChange={end => change({ end, endChoice: '' })} /></View>
      </View>
      {fold('start')}{fold('end')}
      <Field label={draft.format === 'ONLINE' ? 'Đường dẫn thi' : 'Phòng thi'} value={draft.room} maxLength={100}
        disabled={blocked} onChange={room => change({ room })} />
      <ExamExtraFields reminder={draft.reminder} minutes={draft.minutes} notes={draft.notes} disabled={blocked}
        onReminderChange={(reminder, minutes) => change({ reminder, minutes })} onNotesChange={notes => change({ notes })} />
      {!!(error || state.error?.message) && !state.pending && <T accessibilityRole="alert" style={{ color: C.red }}>{error || state.error?.message}</T>}
      {!state.pending && Object.entries(state.error?.fields ?? {}).map(([key, message]) => <T key={key} accessibilityRole="alert" style={{ color: C.red }}>{message}</T>)}
      {staleParents && <><T style={{ color: C.red }}>Cần tải lại danh mục môn trước khi lưu. Nội dung đang nhập được giữ.</T><Button label="Tải lại danh mục môn" secondary disabled={locked} onPress={() => { setParentsLoading(true); void courseConnection?.reload().catch(e => setError(asApiError(e).message)).finally(() => setParentsLoading(false)); }} /></>}
      <ExamWriteReview onReplace={exam => { const next = examDraft(exam); setBasis(exam); setDraft(next); setBaseline(next); setConfirmDelete(false); setError(''); }} onClose={onClose} />
      {state.busy && <T accessibilityLiveRegion="polite" style={S.small}>Đang gửi yêu cầu. Đợi kết quả trước khi đóng biểu mẫu.</T>}
      <Button label="Lưu lịch thi" icon="checkmark" loading={state.busy} disabled={blocked || staleParents || !courseCatalog.length} onPress={save} />
      {basis && <>{confirmDelete && <T accessibilityRole="alert" style={{ color: C.red }}>Xóa lịch đã lưu “{courseCatalog.find(c => c.id === basis.courseId)?.name ?? 'Môn học'}”, {examDate(basis)} · {examTiming(basis)} ({basis.timeZone}) và cấu hình nhắc của lịch? Môn học và các lịch khác được giữ.{dirty ? ' Nội dung đang chỉnh sửa chưa được lưu.' : ''}</T>}<Button label={confirmDelete ? 'Xác nhận xóa lịch thi' : 'Xóa lịch thi'} danger={confirmDelete} secondary={!confirmDelete} disabled={blocked} onPress={remove} />{confirmDelete && <Button label="Giữ lịch thi" secondary disabled={blocked} onPress={() => setConfirmDelete(false)} />}</>}
    </>}
  </Sheet></FlowScope>;
}
