import { useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigationScope } from '../../navigation/Navigation';
import { monotonicNow, type AnchoredPomodoro } from './api/PomodoroManager';
import type { BreakSnapshot } from './api/pomodoroBreakApi';
import { cancelFocusAlarm, scheduleFocusAlarm } from './focusAlarm';

export function useFocusSessionDevice({ study, rest, clock, onLockChange }: {
  study: AnchoredPomodoro | null;
  rest: { row: BreakSnapshot; receivedAt: number } | null;
  clock: number;
  onLockChange: (locked: boolean) => void;
}) {
  let key: string | undefined, deadline: number | undefined, title = '';
  let pausedOrReset = false;
  if (study) {
    pausedOrReset = study.row.status === 'PAUSED';
    if (study.row.status === 'RUNNING') {
      key = `study:${study.row.id}:${study.row.version}`;
      deadline = study.receivedAt + study.row.remainingMillis;
      title = 'Đã hết giờ tập trung';
    }
  } else if (rest) {
    pausedOrReset = rest.row.state === 'PAUSED' || rest.row.state === 'IDLE';
    if (rest.row.state === 'RUNNING') {
      key = `break:${rest.row.kind}:${rest.row.version}`;
      deadline = rest.receivedAt + rest.row.remainingMs;
      title = rest.row.kind === 'SHORT' ? 'Đã hết giờ nghỉ ngắn' : 'Đã hết giờ nghỉ dài';
    }
  }

  const { active } = useNavigationScope();
  const locked = active && deadline !== undefined && deadline > clock;
  const scheduled = useRef<{ key: string; deadline: number } | null>(null);
  useLayoutEffect(() => { onLockChange(locked); }, [locked, onLockChange]);
  useEffect(() => () => { scheduled.current = null; cancelFocusAlarm(); onLockChange(false); }, [onLockChange]);

  useEffect(() => {
    const previous = scheduled.current;
    if (!key || deadline === undefined) {
      if (previous && (pausedOrReset || monotonicNow() + 600 < previous.deadline)) cancelFocusAlarm();
      scheduled.current = null;
      return;
    }
    if (key === previous?.key || deadline <= monotonicNow()) return;
    scheduled.current = { key, deadline };
    scheduleFocusAlarm(Math.max(0, deadline - monotonicNow()), title);
  }, [key, deadline, title, pausedOrReset]);

  return locked;
}
