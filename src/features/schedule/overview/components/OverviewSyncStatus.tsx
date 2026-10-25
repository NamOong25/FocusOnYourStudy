import React from 'react';
import { Button, Card, StateView, T } from '../../../../shared/components';
import { C, S } from '../../../../shared/theme';
import type { ScheduleOverviewSource } from '../useScheduleOverview';

export default function OverviewSyncStatus({ source, label, reload }: { source: ScheduleOverviewSource; label: string; reload: () => void }) {
  if (!source.loaded) return <StateView kind={source.error ? 'error' : 'loading'} title={source.error ? 'Chưa tổng hợp được lịch học' : 'Đang tổng hợp lịch học'} message={source.error?.message ?? 'Đang kiểm tra các chuỗi và buổi đã lưu, gồm những buổi được nghỉ hoặc điều chỉnh.'} actionLabel={source.error ? label : undefined} onAction={reload} />;
  if (source.error) return <Card style={{ gap: 9, backgroundColor: C.redSoft }}><T accessibilityRole="alert" style={{ color: C.red }}>{source.error.message}</T><T style={S.small}>Dữ liệu bên dưới thuộc lần tải gần nhất; chưa xác nhận là lịch hiện tại. Tải lại trước khi dựa vào số buổi hoặc kết luận không có lịch.</T><Button label={label} secondary onPress={reload} /></Card>;
  return <><Button label={label} secondary icon="refresh-outline" loading={source.loading} onPress={reload} />{source.loading && <T accessibilityLiveRegion="polite" style={S.small}>Đang cập nhật lịch đã lưu…</T>}</>;
}
