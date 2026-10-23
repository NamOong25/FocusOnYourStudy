import React from 'react';
import { Button, Card, StateView, T } from '../../../shared/components';
import { C, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';

export function StudySyncStatus() {
  const { studyConnection: c, assignmentConnection, courseConnection } = useApp();
  if (!c) return null;
  const reload = () => { void Promise.all([c.reload(), assignmentConnection?.reload(), courseConnection?.reload()]).catch(() => {}); };
  const otherBusy = !!assignmentConnection?.busy || !!assignmentConnection?.loading || !!courseConnection?.busy || !!courseConnection?.loading;
  if (!c.loaded) return <StateView kind={c.error ? 'error' : 'loading'} title={c.error ? 'Chưa tải được buổi tự học' : 'Đang tải buổi tự học'}
    message={c.error?.message ?? 'Đang lấy các buổi đã lưu trong tài khoản.'} actionLabel={c.error ? 'Thử tải lại buổi tự học' : undefined} onAction={reload} />;
  return <Card style={{ backgroundColor: C.soft, gap: 9 }}>
    <T style={S.small}>Buổi tự học đã lưu trong tài khoản. Thời gian Pomodoro vẫn chỉ giữ trong phiên này.</T>
    {!!c.error && <T accessibilityRole="alert" style={{ color: C.red }}>Đang giữ danh sách buổi học đã tải gần nhất. {c.error.message}</T>}
    {c.needsReload && <T style={S.small}>Tải lại để kiểm tra kết quả trước khi lưu tiếp. App không tự gửi lại thao tác lưu.</T>}
    <Button label="Tải lại danh sách tự học" secondary loading={c.loading} disabled={c.busy || otherBusy} onPress={reload} />
  </Card>;
}
