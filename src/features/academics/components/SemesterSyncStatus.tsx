import React from 'react';
import { Button, Card, StateView, T } from '../../../shared/components';
import { useApp } from '../../../store/model';
import { C, S } from '../../../shared/theme';

export function SemesterSyncStatus() {
  const { semesterConnection: c } = useApp();
  if (!c) return null;
  const reload = () => { void c.reload().catch(() => {}); };
  if (!c.loaded) return <StateView kind={c.error ? 'error' : 'loading'} title={c.error ? 'Chưa tải được học kỳ' : 'Đang tải học kỳ'}
    message={c.error?.message ?? 'Đang lấy các học kỳ đã lưu của bạn.'} actionLabel={c.error ? 'Thử tải lại học kỳ' : undefined} onAction={reload} />;
  return <Card style={{ backgroundColor: C.soft, gap: 9 }}>
    <T style={S.small}>Học kỳ được lưu cùng tài khoản. Môn học, lịch, bài tập và điểm trên giao diện hiện vẫn là dữ liệu thử, chưa tải từ tài khoản.</T>
    {!!c.error && <T accessibilityRole="alert" style={{ color: C.red }}>{c.needsReload ? 'Cần kiểm tra lại danh sách trước khi lưu tiếp. ' : ''}{c.error.message}</T>}
    <Button label="Tải lại danh sách học kỳ" secondary loading={c.loading} disabled={c.busy} onPress={reload} />
  </Card>;
}
