import React from 'react';
import { Button, Card, Empty, Section, T } from '../../../shared/components';
import { S } from '../../../shared/theme';
import { dateKey } from '../../../shared/utils/dates';
import { useApp } from '../../../store/model';
import { projectOverview } from '../../schedule/overview/overview';
import { useScheduleOverview } from '../../schedule/overview/useScheduleOverview';
import OverviewOccurrenceCard from '../../schedule/overview/components/OverviewOccurrenceCard';
import OverviewSyncStatus from '../../schedule/overview/components/OverviewSyncStatus';

export default function HomeServerSchedule({ semesterId, now }: { semesterId: string; now: Date }) {
  const { courseCatalog, courseConnection, openSavedSchedule } = useApp();
  const source = useScheduleOverview({ semesterId, today: dateKey(now) }), data = projectOverview(source, now);
  const ready = source.loaded && !source.loading && !source.error;
  const title = (id: string) => courseCatalog.find(c => c.id === id)?.name ?? 'Môn chưa được tải';
  const open = (row: typeof source.rows[number]) => openSavedSchedule(semesterId, row.date);
  const reload = () => { void Promise.all([source.reload(), courseConnection?.reload()]).catch(() => {}); };
  return <>
    <Section title="Buổi học gần nhất" icon="calendar-outline" />
    <T style={S.small}>Theo học kỳ đang chọn · Giờ hiển thị theo thiết bị ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Buổi nghỉ không tính vào buổi sắp học.</T>
    <OverviewSyncStatus source={source} label="Tải lại lịch học" reload={reload} />
    {source.loaded && data.next && <OverviewOccurrenceCard row={data.next} title={title(data.next.courseId)} now={now} context="Trang chủ gần nhất" onOpen={open} />}
    {ready && !data.next && <Empty title={data.hasRules ? 'Chưa có buổi học đang diễn ra hoặc sắp tới' : 'Học kỳ này chưa có lịch học'} message={data.hasRules ? 'Các buổi đã kết thúc hoặc được nghỉ không được đề xuất ở đây. Xem Thời khóa biểu để kiểm tra lịch đã lưu.' : 'Thêm chuỗi lịch học để xem buổi gần nhất của học kỳ này.'} actionLabel="Mở thời khóa biểu" onAdd={() => openSavedSchedule(semesterId)} />}
    <Section title="Lịch học hôm nay" icon="time-outline" />
    <T style={S.small}>{now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} · Theo giờ thiết bị và học kỳ đang chọn</T>
    {source.loaded && data.today.map(row => <OverviewOccurrenceCard key={`${row.scheduleId}:${row.date}`} row={row} title={title(row.courseId)} now={now} context="Trang chủ hôm nay" onOpen={open} />)}
    {ready && !data.today.length && <Card><T style={S.small}>Hôm nay không có buổi học hoạt động trong học kỳ này. Buổi đã báo nghỉ không tính vào danh sách.</T></Card>}
    <Button label="Xem thời khóa biểu đã lưu" secondary onPress={() => openSavedSchedule(semesterId)} />
  </>;
}
