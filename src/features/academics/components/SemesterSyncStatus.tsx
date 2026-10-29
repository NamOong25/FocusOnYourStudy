import React from 'react';
import { Button, Card, StateView, T } from '../../../shared/components';
import { useApp } from '../../../store/model';
import { C, S } from '../../../shared/theme';

export function SemesterSyncStatus() {
  const { semesterConnection: c, courseConnection: courses } = useApp();
  if (!c) return null;
  const reload = () => { void Promise.all([c.reload(), courses?.reload()]).catch(() => {}); };
  if (!c.loaded) return <StateView kind={c.error ? 'error' : 'loading'} title={c.error ? 'Chưa tải được học kỳ' : 'Đang tải học kỳ'}
    message={c.error?.message ?? 'Đang lấy các học kỳ đã lưu của bạn.'} actionLabel={c.error ? 'Thử tải lại học kỳ' : undefined} onAction={reload} />;
  if (courses && !courses.loaded) return <StateView kind={courses.error ? 'error' : 'loading'} title={courses.error ? 'Chưa tải được môn học' : 'Đang tải môn học'}
    message={courses.error?.message ?? 'Đang lấy các môn học đã lưu của bạn.'} actionLabel={courses.error ? 'Thử tải lại môn học' : undefined} onAction={reload} />;
  return <Card style={{ backgroundColor: C.soft, gap: 9 }}>
    <T style={S.small}>Học kỳ, môn học, bài tập và tự học được lưu cùng tài khoản. Thời khóa biểu đã lưu cả chuỗi lịch. Lịch thi đã thêm, sửa và xóa được trong mục Kỳ thi; điểm số và bộ cột được lưu trong tài khoản, xem tại Thống kê → Điểm & GPA. Đồng hồ, lịch sử, mục tiêu và tiến độ Pomodoro đã lưu trong tài khoản.</T>
    {!!c.error && <T accessibilityRole="alert" style={{ color: C.red }}>{c.needsReload ? 'Cần kiểm tra lại danh sách trước khi lưu tiếp. ' : ''}{c.error.message}</T>}
    {!!courses?.error && <T accessibilityRole="alert" style={{ color: C.red }}>Cần kiểm tra lại danh sách môn học trước khi lưu tiếp. {courses.error.message}</T>}
    <Button label="Tải lại danh sách học kỳ" secondary loading={c.loading} disabled={c.busy || !!courses?.busy || !!courses?.loading} onPress={reload} />
    <Button label="Tải lại danh sách môn học" secondary loading={!!courses?.loading} disabled={c.busy || c.loading || !!courses?.busy} onPress={reload} />
  </Card>;
}
