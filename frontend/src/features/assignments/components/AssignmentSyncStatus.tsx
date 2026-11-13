import React from 'react';
import { Button, Card, StateView, T } from '../../../shared/components';
import { C, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';

export function AssignmentSyncStatus({ statusOnly = false }: { statusOnly?: boolean }) {
  const { assignmentConnection: c, courseConnection, studyConnection } = useApp();
  if (!c) return null;
  const reload = () => { void Promise.all([c.reload(), courseConnection?.reload()]).catch(() => {}); };
  if (!c.loaded) return <StateView kind={c.error ? 'error' : 'loading'} title={c.error ? 'Chưa tải được bài tập' : 'Đang tải bài tập'}
    message={c.error?.message ?? 'Đang lấy bài tập đã lưu trong tài khoản.'} actionLabel={c.error ? 'Thử tải lại bài tập' : undefined} onAction={reload} />;
  if (statusOnly && !c.error && !c.needsReload) return null;
  return <Card style={{ backgroundColor: C.soft, gap: 9 }}>
    {!statusOnly && <T style={S.small}>Bài tập đã lưu trong tài khoản. Checklist và tài liệu mẫu chỉ giữ trong phiên này.</T>}
    {!!c.error && <T accessibilityRole="alert" style={{ color: C.red }}>Đang hiển thị dữ liệu lần tải thành công gần nhất. {c.error.message}</T>}
    {c.needsReload && <T style={S.small}>Cần tải lại để kiểm tra dữ liệu trước khi lưu tiếp. App không tự gửi lại thao tác lưu.</T>}
    <Button label="Tải lại danh sách bài tập" secondary loading={c.loading} disabled={c.busy || !!studyConnection?.busy || !!studyConnection?.loading || !!courseConnection?.busy || !!courseConnection?.loading} onPress={reload} />
  </Card>;
}
