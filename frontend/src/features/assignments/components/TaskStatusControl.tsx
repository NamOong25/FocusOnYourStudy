import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Segments, T } from '../../../shared/components';
import { C, S } from '../../../shared/theme';
import { asApiError } from '../../../shared/api/http';
import { useApp } from '../../../store/model';
import { useApiAction } from '../../account/auth/useApiAction';
import type { Task, TaskStatus } from '../assignments';

export function TaskStatusControl({ task }: { task: Task }) {
  const { assignmentConnection: c, saveTask } = useApp(), action = useApiAction();
  const [mustReload, setMustReload] = useState(false);
  const disabled = action.busy || !!c?.busy || !!c?.loading || !!c?.needsReload || mustReload;
  const change = (value: string) => {
    if (disabled || value === task.status) return;
    if (!c) { saveTask({ ...task, status: value as TaskStatus }); return; }
    void action.run(async () => {
      try { await c.save({ ...task, status: value as TaskStatus }, task); }
      catch (failure) { if (['ASSIGNMENT_VERSION_CONFLICT', 'ASSIGNMENT_NOT_FOUND'].includes(asApiError(failure).code)) setMustReload(true); throw failure; }
    });
  };
  return <View style={{ gap: 9 }}>
    <Segments values={['Chưa làm', 'Đang làm', 'Hoàn thành']} value={task.status} disabled={disabled} onChange={change} />
    {action.busy && <T style={S.small}>Đang lưu trạng thái bài tập…</T>}
    {!!action.error && <T accessibilityRole="alert" style={{ color: C.red }}>{action.error.message}</T>}
    {c && (mustReload || c.needsReload) && <Button label="Kiểm tra trạng thái bài tập mới nhất" secondary disabled={c.busy || c.loading || action.busy} onPress={() => {
      void action.run(() => c.reload(), () => { setMustReload(false); action.clearError(); });
    }} />}
  </View>;
}
