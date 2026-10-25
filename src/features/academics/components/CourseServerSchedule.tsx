import React from 'react';
import { Button, Empty, Section, T } from '../../../shared/components';
import { S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import type { Course } from '../academic';
import { projectOverview } from '../../schedule/overview/overview';
import type { ScheduleOverviewSource } from '../../schedule/overview/useScheduleOverview';
import OverviewOccurrenceCard from '../../schedule/overview/components/OverviewOccurrenceCard';
import OverviewSyncStatus from '../../schedule/overview/components/OverviewSyncStatus';

export default function CourseServerSchedule({ source, course, now, compact = false, onNavigate }: { source: ScheduleOverviewSource; course: Course; now: Date; compact?: boolean; onNavigate: () => void }) {
  const { openSavedSchedule, courseConnection } = useApp(), data = projectOverview(source, now), ready = source.loaded && !source.loading && !source.error;
  const rows = compact ? data.remaining.slice(0, 1) : data.remaining.slice(0, 5);
  const open = (date?: string) => { onNavigate(); openSavedSchedule(course.semesterId, date); };
  return <>
    <Section title={compact ? 'Buổi học gần nhất của môn' : 'Đang học & sắp tới'} icon="calendar-outline" />
    <T style={S.small}>Giờ theo thiết bị ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Không tính buổi đã kết thúc hoặc báo nghỉ.</T>
    <OverviewSyncStatus source={source} label="Tải lại lịch môn" reload={() => { void Promise.all([source.reload(), courseConnection?.reload()]).catch(() => {}); }} />
    {source.loaded && rows.map(row => <OverviewOccurrenceCard key={`${row.scheduleId}:${row.date}`} row={row} title={course.name} now={now} context="Chi tiết môn" onOpen={item => open(item.date)} />)}
    {ready && !rows.length && <Empty title={data.hasRules ? 'Không còn buổi học đang diễn ra hoặc sắp tới' : 'Môn này chưa có lịch học'} message={data.hasRules ? 'Xem Thời khóa biểu nếu cần kiểm tra các buổi đã kết thúc hoặc được nghỉ.' : 'Tạo chuỗi lịch cho môn này trong Thời khóa biểu.'} actionLabel="Mở thời khóa biểu" onAdd={() => open()} />}
    {!compact && ready && data.remaining.length > rows.length && <T style={S.small}>Đang hiện {rows.length}/{data.remaining.length} buổi. Mở Thời khóa biểu để xem theo ngày, tuần hoặc tháng.</T>}
    <Button label="Xem trong Thời khóa biểu" secondary onPress={() => open(data.next?.date)} />
  </>;
}
