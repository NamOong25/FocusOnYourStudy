import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Card, Field, Sheet, StateView, T } from '../../../shared/components';
import { TimeField } from '../../../shared/components/DateTimePicker';
import { ApiError, asApiError, assertNotCancelled, isCancelled } from '../../../shared/api/http';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import { useApp } from '../../../store/model';
import { useApiAction } from '../../account/auth/useApiAction';
import type { ScheduleSource } from '../api/useServerSchedule';
import type { ExceptionSnapshot, OccurrenceTarget } from '../api/classExceptionsApi';
import { draftException, exceptionDraft, exceptionFields, type ExceptionDraft, type ExceptionField, type ExceptionMode } from '../exceptionDraft';

export type ExceptionFlowRequest = { target: OccurrenceTarget; mode: ExceptionMode; expectedVersion?: number };
type Props = { request: ExceptionFlowRequest; source: ScheduleSource; onClose: () => void; onComplete: (snapshot: ExceptionSnapshot, mode: ExceptionMode) => void };
const labels: Record<ExceptionField, string> = { startTime: 'Giờ bắt đầu', endTime: 'Giờ kết thúc', room: 'Phòng học', teacher: 'Giảng viên' };
const titleOf: Record<ExceptionMode, string> = { change: 'Điều chỉnh một buổi', cancel: 'Nghỉ một buổi học', restore: 'Khôi phục buổi học', review: 'Kiểm tra buổi vừa thay đổi' };
const isGone = (error: ApiError) => ['CLASS_SCHEDULE_NOT_FOUND', 'CLASS_OCCURRENCE_NOT_FOUND'].includes(error.code);
export default function ServerExceptionFlow(props: Props) {
  const { request, source, onClose } = props, [basis, setBasis] = useState<ExceptionSnapshot | null>(null), [error, setError] = useState<ApiError | null>(null), [attempt, setAttempt] = useState(0);
  const recovery = useApiAction();
  useEffect(() => {
    const controller = new AbortController(); let live = true; setBasis(null); setError(null);
    void source.readDay(request.target, controller.signal).then(snapshot => {
      if (!live) return;
      if (!attempt && request.expectedVersion !== undefined && request.expectedVersion !== snapshot.rule.version) {
        setError(new ApiError('Lịch đã đổi từ lúc mở chi tiết. Đọc lại buổi hiện tại trước khi chỉnh.', 'CLASS_SCHEDULE_VERSION_CONFLICT', 409)); return;
      }
      setBasis(snapshot);
    }).catch(failure => { if (live && !isCancelled(failure)) setError(asApiError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [request.target.scheduleId, request.target.date, request.expectedVersion, source.readDay, attempt]);
  if (basis) return <ExceptionEditor {...props} initial={basis} />;
  return <Sheet title={titleOf[request.mode]} onClose={onClose}>
    <Badge label={`Chỉ ngày ${request.target.date}`} icon="calendar-outline" />
    <StateView kind={error ? 'error' : 'loading'} title={error ? 'Chưa mở được buổi học' : 'Đang kiểm tra buổi học'} message={error?.message ?? 'Đang đọc lịch gốc, buổi hiện tại và thay đổi riêng cùng phiên bản.'} actionLabel={error ? 'Đọc lại buổi hiện tại' : undefined} onAction={() => setAttempt(n => n + 1)} />
    {error && isGone(error) && source.pendingOccurrence?.scheduleId === request.target.scheduleId && source.pendingOccurrence.date === request.target.date && <Button label="Đã kiểm tra buổi không còn, đóng" secondary loading={recovery.busy} disabled={source.busy || source.loading} onPress={() => {
      void recovery.run(async signal => { await source.reload(); assertNotCancelled(signal); if (source.acknowledge(request.target)) onClose(); });
    }} />}
    {!!recovery.error && <T accessibilityRole="alert" style={{ color: C.red }}>{recovery.error.message}</T>}
  </Sheet>;
}

function ExceptionEditor({ request, source, initial, onClose, onComplete }: Props & { initial: ExceptionSnapshot }) {
  const { courseCatalog, courseConnection } = useApp(), action = useApiAction();
  const [basis, setBasis] = useState(initial), [draft, setDraft] = useState(() => exceptionDraft(initial)), [baseline, setBaseline] = useState(() => exceptionDraft(initial));
  const [error, setError] = useState(''), [mustRebase, setMustRebase] = useState(false), [gone, setGone] = useState(false), [completed, setCompleted] = useState(false);
  const live = useRef(true); useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const locked = action.busy || source.busy || source.loading;
  const calendarStale = !source.loaded || !!source.error, needsReview = source.needsReload || mustRebase;
  const dirty = request.mode !== 'restore' && request.mode !== 'review' && JSON.stringify(draft) !== JSON.stringify(baseline);
  const course = courseCatalog.find(c => c.id === basis.rule.courseId), row = basis.occurrence;
  const change = (patch: Partial<ExceptionDraft>) => { if (!locked) { setDraft(d => ({ ...d, ...patch })); setError(''); action.clearError(); } };
  const latest = () => {
    void action.run(async signal => {
      try {
        const next = await source.readDay(request.target, signal);
        await Promise.all([source.reload(), courseConnection?.reload()]); assertNotCancelled(signal);
        const nextDraft = exceptionDraft(next); setBasis(next); setDraft(nextDraft); setBaseline(nextDraft); setMustRebase(false); setGone(false); setError(''); source.acknowledge(request.target);
      } catch (failure) { if (isGone(asApiError(failure))) { setGone(true); setMustRebase(true); } throw failure; }
    }, () => action.clearError());
  };
  const submit = () => {
    if (locked || needsReview || calendarStale || gone || request.mode === 'review') return;
    setError('');
    let input;
    if (request.mode !== 'restore') { try { input = draftException(draft, request.mode, basis); } catch (failure) { setError(asApiError(failure).message); return; } }
    void action.run(async () => {
      try {
        if (request.mode === 'restore') await source.restoreException(basis); else await source.saveException(basis, input!);
        if (live.current) setCompleted(true);
      } catch (failure) {
        const code = asApiError(failure).code;
        if (['CLASS_SCHEDULE_VERSION_CONFLICT', 'CLASS_EXCEPTION_NOT_FOUND', 'CLASS_SCHEDULE_NOT_FOUND', 'CLASS_OCCURRENCE_NOT_FOUND'].includes(code)) setMustRebase(true);
        if (isGone(asApiError(failure))) setGone(true);
        throw failure;
      }
    }, () => onComplete(basis, request.mode));
  };
  const verify = () => {
    void action.run(async signal => {
      // Re-read the exact day on acknowledgement; a series list cannot establish its current exception.
      const next = await source.readDay(request.target, signal); await source.reload(); assertNotCancelled(signal);
      if (next.rule.version !== basis.rule.version) {
        const nextDraft = exceptionDraft(next); setBasis(next); setDraft(nextDraft); setBaseline(nextDraft);
        throw new ApiError('Buổi vừa được thay đổi ở nơi khác. Xem lại dữ liệu mới vừa nạp rồi xác nhận kiểm tra.', 'CLASS_SCHEDULE_VERSION_CONFLICT', 409);
      }
      if (source.acknowledge(request.target)) onComplete(next, 'review');
    });
  };
  if (completed) return <Sheet title="Kết quả buổi học" onClose={onClose}><StateView title="Thay đổi đã được lưu" message="Yêu cầu đã được xác nhận. Không cần gửi lại." actionLabel="Xem lại buổi học" onAction={() => onComplete(basis, request.mode)} /></Sheet>;
  return <Sheet title={titleOf[request.mode]} onClose={() => { if (!source.busy) onClose(); }} dirty={!source.busy && dirty}>
    <Badge label={`Chỉ ${dateLabel(row.date)}/${row.date.slice(0, 4)}`} icon="calendar-outline" />
    <T style={{ fontFamily: F.bold, fontSize: 18 }}>{course?.name ?? 'Môn chưa được tải'}</T><T style={S.small}>Múi giờ: {basis.rule.timeZone} · Các ngày khác giữ nguyên.</T>
    <Card style={{ backgroundColor: row.cancelled ? C.redSoft : C.canvas, gap: 7 }}><T style={{ fontFamily: F.semi }}>{row.cancelled ? 'Hiện tại: Đã nghỉ' : row.changed ? 'Hiện tại: Đã điều chỉnh' : 'Hiện tại: Theo lịch gốc'}</T><T style={S.small}>{row.startTime} – {row.endTime} · {row.room || 'Chưa có phòng'} · {row.teacher || 'Chưa có giảng viên'}</T>{!!row.reason && <T style={S.small}>{row.reason}</T>}</Card>
    {request.mode === 'change' && <><T style={S.small}>Chỉ bật thông tin muốn đổi riêng. Bỏ chọn để dùng theo chuỗi; để phòng/giảng viên trống khi đã bật sẽ xóa thông tin riêng của buổi này.</T>
      {exceptionFields.map(key => <View key={key} style={{ gap: 7 }}><Pressable accessibilityRole="checkbox" accessibilityLabel={`Đổi riêng ${labels[key].toLowerCase()}`} aria-checked={draft[key].override} accessibilityState={{ checked: draft[key].override, disabled: locked }} disabled={locked} onPress={() => change({ [key]: { ...draft[key], override: !draft[key].override } })} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 13, backgroundColor: draft[key].override ? C.soft : C.canvas }}><T style={{ color: draft[key].override ? C.primary : C.muted, fontFamily: F.semi }}>{draft[key].override ? '✓ ' : '○ '}{labels[key]} riêng</T></Pressable>
        {draft[key].override ? key === 'startTime' || key === 'endTime' ? <TimeField label={`${labels[key]} buổi này`} value={draft[key].value} disabled={locked} onChange={value => change({ [key]: { ...draft[key], value } })} /> : <Field label={`${labels[key]} buổi này`} value={draft[key].value} disabled={locked} maxLength={key === 'room' ? 100 : 200} onChange={value => change({ [key]: { ...draft[key], value } })} /> : <T style={S.small}>Theo chuỗi: {basis.rule[key] || 'Chưa có thông tin'}</T>}
      </View>)}
    </>}
    {(request.mode === 'change' || request.mode === 'cancel') && <Field label="Lý do thay đổi buổi học" value={draft.reason} onChange={reason => change({ reason })} maxLength={1000} multiline disabled={locked} />}
    {request.mode === 'cancel' && <T style={S.small}>Xác nhận nghỉ đúng ngày này. Giờ/phòng thay thế cũ sẽ được bỏ; các buổi khác không thay đổi.</T>}
    {request.mode === 'restore' && <Card style={{ backgroundColor: C.soft, gap: 7 }}><T style={{ fontFamily: F.bold }}>Khôi phục về lịch gốc hiện tại</T><T style={S.small}>{basis.rule.startTime} – {basis.rule.endTime} · {basis.rule.room || 'Chưa có phòng'} · {basis.rule.teacher || 'Chưa có giảng viên'}</T><T style={S.small}>Bỏ ngoại lệ của đúng ngày {row.date}. Nếu giờ gốc đã có lịch khác, hệ thống sẽ chặn và giữ ngoại lệ.</T></Card>}
    {!!(error || action.error) && <T accessibilityRole="alert" style={{ color: C.red }}>{error || action.error?.message}</T>}
    {Object.entries(action.error?.fields ?? {}).map(([field, message]) => <T key={field} style={{color:C.red}}>{field}: {message}</T>)}
    {source.busy && <T accessibilityLiveRegion="polite" style={S.small}>Đang gửi yêu cầu. Đợi kết quả trước khi đóng biểu mẫu.</T>}
    {calendarStale && !source.loading && <Button label="Tải lại lịch trước khi lưu" secondary disabled={locked} onPress={() => { void action.run(async signal => { await source.reload(); assertNotCancelled(signal); }); }} />}
    {needsReview && <Card style={{ backgroundColor: C.amberSoft, gap: 8 }}><T style={S.small}>Chưa thể gửi tiếp. Đọc lại đúng buổi này để kiểm tra kết quả; dữ liệu mới sẽ thay bản nháp đang nhập. App không tự ghép phiên bản mới hoặc tự gửi lại.</T><Button label="Thay bản nháp bằng buổi mới nhất" secondary disabled={source.busy || source.loading} loading={action.busy} onPress={latest} /></Card>}
    {gone && <><T accessibilityRole="alert" style={{ color: C.red }}>Chuỗi/ngày học này không còn. Không tự tạo lại từ bản cũ.</T>{source.pendingOccurrence && <Button label="Kiểm tra buổi không còn và đóng" secondary disabled={locked} onPress={() => { void action.run(async signal => { await source.reload(); assertNotCancelled(signal); if (source.acknowledge(request.target)) onClose(); }); }} />}</>}
    {request.mode === 'review' ? <><T style={S.small}>Đây là buổi hiện tại đã lưu. Kiểm tra trạng thái, giờ, phòng và lý do trước khi tiếp tục; không cần gửi lại thay đổi nếu kết quả đã đúng.</T><Button label="Đã kiểm tra đúng buổi, đóng" disabled={locked || gone} loading={action.busy} onPress={verify} /></> : request.mode === 'restore' && !basis.exception ? <StateView title="Buổi đang theo lịch gốc" message="Không còn ngoại lệ riêng để khôi phục. Không có yêu cầu xóa nào được gửi." actionLabel="Đóng về lịch" onAction={() => onComplete(basis, 'review')} /> : <Button label={request.mode === 'change' ? 'Lưu thay đổi buổi này' : request.mode === 'cancel' ? row.cancelled ? 'Lưu lý do buổi nghỉ' : 'Xác nhận nghỉ buổi này' : 'Xác nhận khôi phục buổi này'} icon="checkmark" loading={action.busy} disabled={locked || calendarStale || needsReview || gone} onPress={submit} />}
  </Sheet>;
}
