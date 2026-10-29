import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, IconButton, IconTile, Row, Segments, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { useAuth } from '../../account/auth/AuthProvider';
import { pomodoroDay } from '../../focus/api/pomodoroInsightsApi';
import { usePomodoroToday } from '../../focus/api/usePomodoroInsights';
import { moveStatistics, statisticsWindow, type StatisticsPeriod, type StatisticsQuery } from '../api/pomodoroStatisticsApi';
import { useServerStatistics } from '../api/useServerStatistics';
import { formatStudyTime } from '../statistics';
import { serverStatisticsView, statisticsSemesterCaption } from '../serverStatisticsView';
import { StatisticsRangeCaption } from './StatisticsFilters';
import { StatisticsAnchorSheet, StatisticsFilterButton, StatisticsFilterSheet, type StatisticsOption } from './ServerStatisticsFilters';
import { StudyTimeChart } from './StudyTimeChart';
import { CourseDistribution } from './CourseDistribution';

export default function ServerStudyStats() {
  const auth = useAuth(), app = useApp(), timeZone = auth.profile?.timeZone ?? 'Asia/Ho_Chi_Minh';
  const { now } = usePomodoroToday(timeZone), today = pomodoroDay(now, timeZone);
  const [period, setPeriod] = useState<StatisticsPeriod>('WEEK'), [anchor, setAnchor] = useState<string | null>(null);
  const [semester, setSemester] = useState<StatisticsOption | null>(null), [course, setCourse] = useState<StatisticsOption | null>(null);
  const [sheet, setSheet] = useState<'semester' | 'course' | 'date' | null>(null);
  const query: StatisticsQuery = { period, date: anchor ?? today, timeZone, ...(semester ? { semesterId: semester.id } : {}), ...(course ? { courseId: course.id } : {}) };
  const { state, reload } = useServerStatistics(query);
  const data = state.loaded && !state.loading && !state.error ? state.value : null;
  const chart = useMemo(() => data ? serverStatisticsView(data, app.courseConnection?.loaded ? app.courseCatalog : undefined) : null, [data, app.courseCatalog, app.courseConnection?.loaded]);
  const semesters = new Map<string, StatisticsOption>(app.semesters.map(s => [s.id, { id: s.id, label: `${s.name} · ${s.academicYear}` }]));
  for (const row of data?.courses ?? []) if (!semesters.has(row.semesterId)) semesters.set(row.semesterId, { id: row.semesterId, label: statisticsSemesterCaption(row.semesterTerm, row.semesterStartYear), hint: 'Từ lịch sử phiên học' });
  const courses = new Map<string, StatisticsOption>();
  for (const row of app.courseCatalog.filter(c => !semester || c.semesterId === semester.id)) courses.set(row.id, { id: row.id, label: row.name, hint: `${row.code} · ${semesters.get(row.semesterId)?.label ?? 'Học kỳ đã lưu'}` });
  for (const row of data?.courses ?? []) if (!courses.has(row.courseId)) courses.set(row.courseId, { id: row.courseId, label: row.courseName, hint: `${row.courseCode} · Từ lịch sử phiên học` });
  const retry = () => { void reload().catch(() => {}); };
  const reloadCatalog = () => { void Promise.allSettled([app.courseConnection?.reload(), app.semesterConnection?.reload()]); };
  let window: ReturnType<typeof statisticsWindow> | null = null;
  try { window = statisticsWindow(period, query.date); } catch { /* The read state displays the input error. */ }
  const target = (direction: -1 | 1) => { try { return moveStatistics(period, query.date, direction); } catch { return null; } };
  const previous = target(-1), next = target(1);
  const choosePeriod = (value: string) => { const p = value === 'Tuần' ? 'WEEK' : 'MONTH'; try { statisticsWindow(p, query.date); } catch { setAnchor(null); } setPeriod(p); };
  return <>
    <View style={{ gap: 6 }}><T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 26, lineHeight: 37 }}>Thống kê học tập</T><T style={S.small}>Nhìn lại thời gian bạn dành cho việc học</T></View>
    <Badge label="Từ các phiên học đã hoàn tất" icon="checkmark-circle-outline" />
    <Segments values={['Tuần', 'Tháng']} value={period === 'WEEK' ? 'Tuần' : 'Tháng'} onChange={choosePeriod} />
    <Card style={{ padding: 15, gap: 13 }}>
      <Row between style={{ gap: 5 }}><IconButton label={period === 'WEEK' ? 'Xem tuần trước' : 'Xem tháng trước'} name="chevron-back" disabled={!previous} onPress={() => { if (previous) setAnchor(previous); }} />
        <View style={[S.grow, { gap: 6 }]}>{window && <StatisticsRangeCaption range={{ from: window.fromDate, to: window.toDate }} />}<Button label={period === 'WEEK' ? 'Chọn tuần' : 'Chọn tháng'} secondary onPress={() => setSheet('date')} /></View>
        <IconButton label={period === 'WEEK' ? 'Xem tuần sau' : 'Xem tháng sau'} name="chevron-forward" disabled={!next} onPress={() => { if (next) setAnchor(next); }} /></Row>
      <Row between style={{ gap: 8 }}><Button label={period === 'WEEK' ? 'Về tuần này' : 'Về tháng này'} secondary onPress={() => setAnchor(null)} /><IconButton label="Cập nhật thống kê" name="refresh-outline" disabled={state.loading} onPress={retry} /></Row>
      <T style={[S.small, { fontSize: 10 }]}>Múi giờ: {timeZone}. Tuần bắt đầu từ thứ Hai.</T>
    </Card>
    <Row style={{ gap: 10, alignItems: 'stretch' }}>
      <View style={S.grow}><StatisticsFilterButton label="Học kỳ thống kê" value={semester?.label ?? 'Tất cả học kỳ'} onPress={() => setSheet('semester')} /></View>
      <View style={S.grow}><StatisticsFilterButton label="Môn học thống kê" value={course?.label ?? 'Tất cả môn học'} onPress={() => setSheet('course')} /></View>
    </Row>
    {state.error ? <StateView kind="error" title="Chưa tải được thống kê" message={state.error.message} actionLabel="Thử lại thống kê" onAction={retry} />
      : !data || !chart ? <StateView kind="loading" title="Đang tải thống kê học tập" message="Đang đọc các phiên học đã hoàn tất trong khoảng bạn chọn." />
        : <>
          <Row style={{ gap: 12, alignItems: 'stretch' }}>
            <Card style={[S.grow, { padding: 15, gap: 10 }]}><IconTile name="time-outline" bg={C.soft} size={38} /><T style={S.small}>Thời gian học</T><T testID="server-statistics-time" style={{ fontFamily: F.extra, fontSize: 21, lineHeight: 30 }}>{formatStudyTime(data.studySeconds).replace(/(\d+) (giờ|phút)/g, '$1\u00a0$2')}</T><T style={S.small}>Trong khoảng đã chọn</T></Card>
            <Card style={[S.grow, { padding: 15, gap: 10 }]}><IconTile name="checkmark-circle-outline" bg={C.greenSoft} color={C.green} size={38} /><T style={S.small}>Phiên hoàn tất</T><T testID="server-statistics-sessions" style={{ fontFamily: F.extra, fontSize: 28, lineHeight: 34, color: C.green }}>{data.completedSessions}</T><T style={S.small}>25 phút mỗi phiên</T></Card>
          </Row>
          <StudyTimeChart data={chart} preferredDay={query.date} onStart={() => app.setTab('focus')} startLabel="Đến Pomodoro" />
          {!!chart.distribution.length && <CourseDistribution courses={chart.distribution} />}
          <T style={S.small}>Thời gian được tính vào ngày kết thúc phiên. Phiên đang học, tạm dừng hoặc đã hủy không được cộng. Phiên học cũ vẫn được giữ khi môn thay đổi hoặc bị xóa.</T>
        </>}
    {sheet === 'date' && <StatisticsAnchorSheet date={query.date} period={period} onApply={date => { setAnchor(date); setSheet(null); }} onClose={() => setSheet(null)} />}
    {sheet === 'semester' && <StatisticsFilterSheet title="Học kỳ thống kê" allLabel="Tất cả học kỳ" options={[...semesters.values()]} selected={semester} loading={!!app.semesterConnection && !app.semesterConnection.loaded && !app.semesterConnection.error} error={app.semesterConnection?.error?.message} onRetry={reloadCatalog} onSelect={value => { setSemester(value); setCourse(null); setSheet(null); }} onClose={() => setSheet(null)} />}
    {sheet === 'course' && <StatisticsFilterSheet title="Môn học thống kê" allLabel="Tất cả môn học" options={[...courses.values()]} selected={course} loading={!!app.courseConnection && !app.courseConnection.loaded && !app.courseConnection.error} error={app.courseConnection?.error?.message} onRetry={reloadCatalog} onSelect={value => { setCourse(value); setSheet(null); }} onClose={() => setSheet(null)} />}
  </>;
}
