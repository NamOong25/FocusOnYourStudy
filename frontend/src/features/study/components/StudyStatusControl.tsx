import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, T } from '../../../shared/components';
import { asApiError } from '../../../shared/api/http';
import { C, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { useApiAction } from '../../account/auth/useApiAction';
import type { StudySession } from '../learning';

export function StudyStatusControl({ session }: { session: StudySession }) {
  const { studyConnection: c, completeStudySession, setToast } = useApp(), action = useApiAction();
  const [mustReload, setMustReload] = useState(false);
  const change = () => {
    if (!c) { completeStudySession(session.id); setToast('Đã đổi trạng thái buổi học; bài tập giữ trạng thái riêng'); return; }
    void action.run(async () => {
      try { await c.save({ ...session, status: session.status === 'Hoàn thành' ? 'Đã lên lịch' : 'Hoàn thành' }, session); }
      catch (failure) { if (['STUDY_SESSION_VERSION_CONFLICT', 'STUDY_SESSION_NOT_FOUND'].includes(asApiError(failure).code)) setMustReload(true); throw failure; }
    });
  };
  return <View style={{ gap: 9 }}>
    <Button label={session.status === 'Hoàn thành' ? 'Mở lại buổi học' : 'Đánh dấu buổi học đã xong'} icon="checkmark-circle-outline" secondary loading={action.busy} disabled={action.busy || !!c?.busy || !!c?.loading || !!c?.needsReload || mustReload} onPress={change}/>
    {!!action.error && <T accessibilityRole="alert" style={{ color: C.red }}>{action.error.message}</T>}
    {c && (mustReload || c.needsReload) && <><T style={S.small}>Kiểm tra phiên bản buổi học trước khi đổi trạng thái tiếp.</T><Button label="Kiểm tra trạng thái buổi học mới nhất" secondary disabled={c.busy || c.loading || action.busy} onPress={() => { void action.run(() => c.reload(), () => { setMustReload(false); action.clearError(); }); }}/></>}
  </View>;
}
