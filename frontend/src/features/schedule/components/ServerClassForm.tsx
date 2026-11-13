import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { Button, Card, Field, Sheet, StateView, T } from '../../../shared/components';
import { DateField, TimeField } from '../../../shared/components/DateTimePicker';
import { asApiError, assertNotCancelled } from '../../../shared/api/http';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { useApiAction } from '../../account/auth/useApiAction';
import { CourseChoices } from '../../academics/CourseChoices';
import type { ScheduleSource } from '../api/useServerSchedule';
import type { ServerRule } from '../api/scheduleApi';
import { ruleDraft, draftInput, type RuleDraft } from '../ruleDraft';
import { weekdaysLabel } from '../calendar';
import { useSavedReminderPreferences } from '../../account/preferences/ReminderPreferencesProvider';

type Props = {
  source: ScheduleSource; original?: ServerRule; initialDate: string; semesterId: string;
  onClose: () => void; onSaved: (saved: ServerRule) => void; onDeleted: () => void;
};

export default function ServerClassForm(props: Props) {
  const preferences = useSavedReminderPreferences();
  if (!props.original && !preferences.value) return <Sheet title="Chuỗi lịch học mới" onClose={props.onClose}>
    <StateView kind={preferences.error ? 'error' : 'loading'} title="Đang chuẩn bị mốc nhắc"
      message={preferences.error?.message ?? 'Đang đọc tùy chọn nhắc học đã lưu.'} />
    {preferences.error && <Button label="Tải lại tùy chọn nhắc học" secondary loading={preferences.loading}
      onPress={() => { void preferences.reload().catch(() => { }); }} />}
  </Sheet>;
  return <ServerClassFormContent {...props} defaultReminderMinutes={preferences.value?.reminderMinutes} />;
}

function ServerClassFormContent({ source, original, initialDate, semesterId, onClose, onSaved, onDeleted, defaultReminderMinutes }: Props & { defaultReminderMinutes?: number }) {
  const { courseCatalog, courseConnection, semesters } = useApp(), action = useApiAction(), { width } = useWindowDimensions();
  const firstCourse = courseCatalog.find(c => c.semesterId === semesterId);
  const [basis, setBasis] = useState(original), [draft, setDraft] = useState(() => ruleDraft(original, { date: initialDate, courseId: firstCourse?.id, room: firstCourse?.room, teacher: firstCourse?.teacher, reminderMinutes: defaultReminderMinutes }));
  const [baseline, setBaseline] = useState(draft), [error, setError] = useState(''), [mustRebase, setMustRebase] = useState(false), [gone, setGone] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false), [checked, setChecked] = useState<ServerRule[] | null>(null);
  const [completed, setCompleted] = useState<{ kind: 'saved'; rule: ServerRule } | { kind: 'deleted' } | null>(null), live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const locked = action.busy || source.busy || source.loading || !!courseConnection?.busy || !!courseConnection?.loading;
  const parentsStale = !!courseConnection?.needsReload;
  const calendarStale = !source.loaded || !!source.error;
  const change = (patch: Partial<RuleDraft>) => { if (!locked) { setDraft(d => ({ ...d, ...patch })); setError(''); action.clearError(); setConfirmDelete(false); } };
  const execute = (operation: () => Promise<ServerRule | void>, success: (value: ServerRule | void) => void) => {
    setError(''); void action.run(async () => {
      try { const result = await operation(); if (live.current) setCompleted(result ? { kind: 'saved', rule: result } : { kind: 'deleted' }); return result; }
      catch (e) { const code = asApiError(e).code; if (code === 'CLASS_SCHEDULE_VERSION_CONFLICT') setMustRebase(true); if (code === 'CLASS_SCHEDULE_NOT_FOUND') { setMustRebase(true); setGone(true); } throw e; }
    }, success);
  };
  const save = () => {
    if (locked || source.needsReload || mustRebase || gone || parentsStale || calendarStale) return;
    setError('');
    if (!courseCatalog.some(c => c.id === draft.courseId)) { setError('Chọn môn học đang có trong tài khoản.'); return; }
    let input;
    try { input = draftInput(draft); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Kiểm tra dữ liệu lịch.'); return; }
    execute(() => source.save(input, basis), result => onSaved(result as ServerRule));
  };
  const latest = () => {
    void action.run(async signal => {
      setError(''); setConfirmDelete(false);
      if (basis) {
        try {
          const current = await source.readRule(basis.id, signal); assertNotCancelled(signal);
          await Promise.all([source.reload(), courseConnection?.reload()]); assertNotCancelled(signal);
          const next = ruleDraft(current); setBasis(current); setDraft(next); setBaseline(next); setMustRebase(false); setGone(false); source.acknowledge();
        } catch (failure) { if (asApiError(failure).code === 'CLASS_SCHEDULE_NOT_FOUND') { setGone(true); setMustRebase(true); } throw failure; }
      } else {
        const rows = await source.rules(undefined, signal); await Promise.all([source.reload(), courseConnection?.reload()]); assertNotCancelled(signal); setChecked(rows);
      }
    }, () => action.clearError());
  };
  const remove = () => {
    if (!basis || locked || source.needsReload || mustRebase || gone || calendarStale) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    execute(() => source.remove(basis), onDeleted);
  };
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const message = error || action.error?.message;
  if (completed) return <Sheet title="Kết quả chuỗi lịch" onClose={onClose}><StateView title={completed.kind === 'saved' ? 'Chuỗi lịch đã được lưu' : 'Chuỗi lịch đã được xóa'} message="Yêu cầu đã được xác nhận. Không cần gửi lại." actionLabel={completed.kind === 'saved' ? 'Xem chuỗi đã lưu' : 'Đóng kết quả'} onAction={() => completed.kind === 'saved' ? onSaved(completed.rule) : onDeleted()} /></Sheet>;
  return <Sheet title={basis ? 'Chỉnh sửa cả chuỗi lịch' : 'Chuỗi lịch học mới'} onClose={() => { if (!source.busy) onClose(); }} dirty={!source.busy && dirty}>
    <CourseChoices dropdown value={draft.courseId} disabled={locked} onChange={courseId => {
      const before = courseCatalog.find(c => c.id === draft.courseId), next = courseCatalog.find(c => c.id === courseId);
      change({ courseId, ...(!basis && (!draft.room || draft.room === before?.room) ? { room: next?.room ?? '' } : {}), ...(!basis && (!draft.teacher || draft.teacher === before?.teacher) ? { teacher: next?.teacher ?? '' } : {}) });
    }} />
    <T style={{ fontFamily: F.semi }}>Các thứ trong tuần</T>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{[1, 2, 3, 4, 5, 6, 7].map(day => <Pressable key={day} accessibilityRole="checkbox" accessibilityLabel={day === 7 ? 'Chủ nhật' : `Thứ ${day + 1}`} accessibilityState={{ checked: draft.weekdays.includes(day), disabled: locked }} disabled={locked} onPress={() => change({ weekdays: draft.weekdays.includes(day) ? draft.weekdays.filter(d => d !== day) : [...draft.weekdays, day].sort((a, b) => a - b) })} style={{ minHeight: 44, minWidth: 42, paddingHorizontal: 9, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: draft.weekdays.includes(day) ? C.primary : C.canvas }}><T style={{ color: draft.weekdays.includes(day) ? '#fff' : C.ink, fontFamily: F.semi }}>{day === 7 ? 'CN' : `T${day + 1}`}</T></Pressable>)}</View>
    <View style={{ gap: 12, flexDirection: width < 360 ? 'column' : 'row' }}>
      <View style={S.grow}><DateField label="Ngày bắt đầu" value={draft.startsOn} onChange={startsOn => change({ startsOn })} disabled={locked} /></View>
      <View style={S.grow}><DateField label="Ngày kết thúc" value={draft.endsOn} onChange={endsOn => change({ endsOn })} disabled={locked} /></View>
    </View>
    <View style={{ gap: 12, flexDirection: width < 360 ? 'column' : 'row' }}><View style={S.grow}><TimeField label="Giờ bắt đầu" value={draft.startTime} onChange={startTime => change({ startTime })} disabled={locked} /></View><View style={S.grow}><TimeField label="Giờ kết thúc" value={draft.endTime} onChange={endTime => change({ endTime })} disabled={locked} /></View></View>
    <Field label="Phòng học" value={draft.room} onChange={room => change({ room })} maxLength={100} disabled={locked} />
    <Field label="Giảng viên" value={draft.teacher} onChange={teacher => change({ teacher })} maxLength={200} disabled={locked} />
    <Field label="Nhắc trước (phút)" value={draft.reminderMinutes} onChange={reminderMinutes => change({ reminderMinutes })} numeric maxLength={5} disabled={locked} />
    <Field label="Ghi chú" value={draft.notes} onChange={notes => change({ notes })} multiline maxLength={5000} disabled={locked} />
    {!!message && <T accessibilityRole="alert" style={{ color: C.red }}>{message}</T>}
    {parentsStale && <><T style={{color:C.red}}>Cần tải lại danh mục môn trước khi lưu. Nội dung đang nhập được giữ.</T><Button label="Tải lại danh mục môn" secondary disabled={locked} onPress={() => { void action.run(async signal => { await courseConnection?.reload(); assertNotCancelled(signal); }); }} /></>}
    {calendarStale && !source.loading && <><T style={{color:C.red}}>Chưa tải lại được lịch. Nội dung đang nhập vẫn được giữ.</T><Button label="Tải lại lịch trước khi lưu" secondary disabled={locked} onPress={() => { void action.run(async signal => { await source.reload(); assertNotCancelled(signal); }); }} /></>}
    {source.busy && <T accessibilityLiveRegion="polite" style={S.small}>Đang gửi yêu cầu. Đợi kết quả trước khi đóng biểu mẫu.</T>}
    {Object.entries(action.error?.fields ?? {}).map(([field, message]) => <T key={field} accessibilityRole="alert" style={{ color: C.red }}>{field}: {message}</T>)}
    {(source.needsReload || mustRebase) && <Card style={{ backgroundColor: C.amberSoft, gap: 10 }}>
      <T style={S.small}>{basis ? 'Nạp bản mới sẽ thay nội dung đang nhập bằng chuỗi đã lưu. Không tự ghép phiên bản mới vào bản nháp cũ.' : 'Chưa xác định được lần lưu trước đã thành công hay chưa. Kiểm tra danh sách trước khi cho phép gửi lại.'}</T>
      <Button label={basis ? 'Thay bản nháp bằng lịch mới nhất' : 'Kiểm tra kết quả lần lưu'} secondary loading={action.busy} disabled={source.busy || source.loading} onPress={latest} />
      {checked && <><T style={{ fontFamily: F.semi }}>Chuỗi đang có trong tài khoản ({checked.length})</T>{checked.map(row => {
        const course = courseCatalog.find(c => c.id === row.courseId), semester = semesters.find(s => s.id === course?.semesterId);
        return <T key={row.id} style={S.small}>{course?.name ?? 'Môn học'} · {semester?.name} {semester?.academicYear} · {weekdaysLabel(row.weekdays.map(d => d % 7))} · {row.startsOn} → {row.endsOn} · {row.startTime}–{row.endTime} · {row.room || 'Chưa có phòng'}</T>;
      })}<T style={S.small}>Nếu chuỗi đã xuất hiện, đóng biểu mẫu để tránh tạo lại. Nếu chưa thấy, bạn có thể tiếp tục nhập và tự bấm lưu sau khi kiểm tra.</T><Button label="Đã kiểm tra danh sách, tiếp tục" secondary disabled={locked} onPress={() => { source.acknowledge(); setChecked(null); action.clearError(); }} /></>}
    </Card>}
    {gone && <T accessibilityRole="alert" style={{ color: C.red }}>Chuỗi không còn tồn tại. Đóng biểu mẫu và tải lại lịch; không tự tạo lại chuỗi đã xóa.</T>}
    <Button label="Lưu chuỗi lịch học" icon="checkmark" loading={action.busy} disabled={locked || source.needsReload || mustRebase || gone || parentsStale || calendarStale || !courseCatalog.length} onPress={save} />
    {basis && <>{confirmDelete && <T accessibilityRole="alert" style={{ color: C.red }}>Xóa chuỗi đã lưu “{courseCatalog.find(c => c.id === basis.courseId)?.name ?? 'Môn học'}”, {basis.startsOn} → {basis.endsOn}, {basis.startTime}–{basis.endTime} ({basis.timeZone}) và toàn bộ ngoại lệ nghỉ/đổi của chuỗi? Môn, bài tập và buổi tự học được giữ.{dirty ? ' Các chỉnh sửa đang nhập chưa được lưu.' : ''}</T>}<Button label={confirmDelete ? 'Xác nhận xóa cả chuỗi' : 'Xóa cả chuỗi lịch'} secondary={!confirmDelete} danger={confirmDelete} disabled={locked || source.needsReload || mustRebase || gone || calendarStale} onPress={remove} />{confirmDelete && <Button label="Giữ chuỗi lịch" secondary disabled={locked} onPress={() => setConfirmDelete(false)} />}</>}
  </Sheet>;
}
