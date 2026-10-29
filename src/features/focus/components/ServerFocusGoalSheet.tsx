import React, { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Row, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import type { PomodoroGoalManager, PomodoroGoalState } from '../api/PomodoroGoalManager';
import { useFeedback } from '../../../shared/feedback/FeedbackProvider';

export default function ServerFocusGoalSheet({ manager, state, onClose }: { manager: PomodoroGoalManager; state: PomodoroGoalState; onClose: () => void }) {
  const mounted = useRef(true);
  const { showNotice } = useFeedback();
  useEffect(() => { mounted.current = true; void manager.load().then(() => { if (mounted.current) manager.begin(); }).catch(() => {}); return () => { mounted.current = false; }; }, [manager]);
  const locked = state.busy || state.loading || !!state.pending, draft = state.draft;
  const reload = () => { void manager.load().then(() => { if (mounted.current) manager.begin(); }).catch(() => {}); };
  const save = (retry = false) => { void Promise.resolve().then(() => retry ? manager.retry() : manager.save()).then(goal => { if (mounted.current) { showNotice(`Đã lưu mục tiêu ${goal.dailySessions} phiên/ngày.`); onClose(); } }).catch(() => {}); };
  return <Sheet title="Mục tiêu tập trung mỗi ngày" onClose={onClose} dirty={!!draft && !locked && draft.dailySessions !== draft.baseline}>
    <T style={S.small}>Mục tiêu chung cho tài khoản. Thay đổi mục tiêu giữ nguyên số phiên và phút học đã hoàn tất.</T>
    {!!state.error && <T accessibilityRole="alert" style={{ color: C.red, lineHeight: 22 }}>{state.error.message}</T>}
    {state.loading && <StateView kind="loading" title="Đang đọc mục tiêu đã lưu" message="Lấy phiên bản mới nhất của mục tiêu." />}
    {state.goal && <T style={S.small}>{state.needsReload ? 'Đọc gần nhất' : state.goal.persisted ? 'Mục tiêu đã lưu' : 'Mục tiêu mặc định'}: {state.goal.dailySessions} phiên/ngày{state.needsReload ? ' · Cần đối chiếu' : !state.goal.persisted ? ' · Chưa thay đổi' : ''}</T>}
    {draft && <><T style={{ fontFamily: F.bold, fontSize: 24 }}>{draft.dailySessions} phiên · {draft.dailySessions * 25} phút</T><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
      {Array.from({ length: 12 }, (_, i) => i + 1).map(n => <Pressable key={n} accessibilityRole="radio" accessibilityLabel={`Mục tiêu ${n} phiên`} accessibilityState={{ checked: draft.dailySessions === n, disabled: locked || state.needsReview }} aria-checked={draft.dailySessions === n} aria-disabled={locked || state.needsReview} disabled={locked || state.needsReview} onPress={() => manager.choose(n)} style={{ width: '22%', minHeight: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: draft.dailySessions === n ? C.primary : C.canvas, opacity: locked ? 0.6 : 1 }}><T style={{ color: draft.dailySessions === n ? 'white' : C.primary, fontFamily: F.bold }}>{n}</T></Pressable>)}
    </View></>}
    {state.pending ? <><T style={S.small}>Chưa xác nhận kết quả lưu {state.pending.dailySessions} phiên/ngày. Lựa chọn cũ được giữ để đối chiếu; app không tự gửi lại.</T><Button label="Đối chiếu mục tiêu đã lưu" secondary loading={state.loading} disabled={state.busy || state.loading} onPress={reload}/><Button label="Gửi lại đúng yêu cầu cũ" loading={state.busy} disabled={state.busy || state.loading || state.needsReload || !state.loaded || state.goal?.version !== state.pending.version} onPress={() => save(true)}/></>
      : state.needsReview ? <><T style={S.small}>Lựa chọn đang nhập vẫn được giữ. Đọc mục tiêu mới rồi chọn lại nếu cần thay đổi.</T><Button label="Nạp mục tiêu mới và chọn lại" secondary disabled={locked} onPress={() => { void manager.load().then(() => manager.adopt()).catch(() => {}); }}/></>
        : <><Button label="Lưu mục tiêu ngày" icon="checkmark" loading={state.busy} disabled={locked || !draft || !state.loaded || state.needsReload} onPress={() => save()}/>{(!state.loaded || state.needsReload) && <Button label="Thử đọc lại mục tiêu" secondary disabled={locked} onPress={reload}/>}</>}
    {!!state.notice && <T accessibilityLiveRegion="polite" style={{ color: C.primary }}>{state.notice}</T>}
    <Row><Button label={state.pending || state.busy ? 'Đóng và giữ thông tin đối chiếu' : draft && draft.dailySessions !== draft.baseline ? 'Hủy thay đổi mục tiêu' : 'Đóng'} secondary onPress={onClose}/></Row>
  </Sheet>;
}
