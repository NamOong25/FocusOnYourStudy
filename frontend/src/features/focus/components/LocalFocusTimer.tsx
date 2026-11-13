import React, { type ReactNode } from 'react';
import { Button, IconButton, Row } from '../../../shared/components';
import { S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { focusDurations } from '../focus';
import FocusTimerFace from './FocusTimerFace';
import { focusTone } from './FocusSetup';

export default function LocalFocusTimer({ children }: { children?: ReactNode }) {
  const { mode, timerRemainingMs, running, toggleTimer, resetTimer } = useApp();
  const duration = focusDurations[mode]!;
  const paused = !running && timerRemainingMs > 0 && timerRemainingMs < duration * 1000;
  const finished = timerRemainingMs === 0;
  const label = finished ? (mode ? 'Đã hết giờ nghỉ' : 'Đã hoàn tất') : running
    ? (mode ? 'Đang nghỉ' : 'Đang tập trung') : paused ? 'Đang tạm dừng' : mode ? 'Sẵn sàng nghỉ' : 'Sẵn sàng tập trung';
  const startLabel = ['Bắt đầu tập trung', 'Bắt đầu nghỉ ngắn', 'Bắt đầu nghỉ dài'][mode]!;
  return <>
    <FocusTimerFace testID="local-focus-clock" duration={duration} milliseconds={timerRemainingMs} label={label} mode={mode}>
      {children}
    </FocusTimerFace>
    <Row>
      <IconButton name="refresh-outline" label="Đặt lại đồng hồ" onPress={resetTimer} bg="#fff" />
      <Button label={running ? 'Tạm dừng' : paused ? 'Tiếp tục' : startLabel}
        icon={running ? 'pause' : 'play'} onPress={toggleTimer}
        style={[S.grow, { borderRadius: 15, backgroundColor: focusTone(mode).accent }]} />
    </Row>
    {mode > 0 && (running || paused) && <Button label="Kết thúc nghỉ" secondary onPress={resetTimer} />}
  </>;
}
