import React from 'react';
import { Button, IconButton, Row, StateView } from '../../../shared/components';
import { S } from '../../../shared/theme';
import { breakMode, breakRemaining } from '../api/pomodoroBreakApi';
import type { usePomodoroBreak } from '../api/usePomodoroBreak';
import { focusDurations } from '../focus';
import FocusTimerFace from './FocusTimerFace';

export default function ServerBreakTimer({ timer, mode, clock }: {
  timer: ReturnType<typeof usePomodoroBreak>; mode: number; clock: number;
}) {
  const { saved, error, busy, reload, change } = timer;
  const duration = focusDurations[mode]!;
  const matching = saved && breakMode(saved.row.kind) === mode ? saved : null;
  const remaining = matching ? breakRemaining(matching.row, matching.receivedAt, clock) : duration * 1000;
  const running = matching?.row.state === 'RUNNING' && remaining > 0;
  const paused = matching?.row.state === 'PAUSED';
  const label = running ? 'Đang nghỉ' : paused ? 'Đang tạm dừng' : remaining === 0 ? 'Đã hết giờ nghỉ' : 'Sẵn sàng nghỉ';
  const blocked = busy || !saved || !!error;

  return <>
    <FocusTimerFace testID="server-break-clock" duration={duration} milliseconds={remaining} label={label}
      caption="Thời gian nghỉ không tính vào mục tiêu học." />
    {error && <StateView kind="error" title="Chưa đồng bộ được giờ nghỉ" message={error.message}
      actionLabel="Tải lại giờ nghỉ" onAction={() => { void reload(); }} />}
    <Row>
      {remaining === 0 && <IconButton name="refresh-outline" label="Đặt lại giờ nghỉ" disabled={blocked}
        onPress={() => { void change('RESET'); }} bg="#fff" />}
      <Button label={running ? 'Tạm dừng' : paused ? 'Tiếp tục' : mode === 1 ? 'Bắt đầu nghỉ ngắn' : 'Bắt đầu nghỉ dài'}
        icon={running ? 'pause' : 'play'} disabled={blocked} loading={busy || !saved && !error}
        onPress={() => { if (running) void change('PAUSE'); else if (paused) void change('RESUME'); else void change('START', mode === 1 ? 'SHORT' : 'LONG'); }}
        style={[S.grow, { borderRadius: 15 }]} />
    </Row>
    {(running || paused) && <Button label="Kết thúc nghỉ" secondary disabled={blocked} onPress={() => { void change('RESET'); }} />}
  </>;
}
