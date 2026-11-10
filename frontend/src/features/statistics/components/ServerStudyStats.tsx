import React, { useMemo, useRef, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Button, Card, Icon, IconButton, IconTile, Row, Segments, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import { useApp } from '../../../store/model';
import { useAuth } from '../../account/auth/AuthProvider';
import { pomodoroDay } from '../../focus/api/pomodoroInsightsApi';
import { usePomodoroToday } from '../../focus/api/usePomodoroInsights';
import { moveStatistics, statisticsWindow, type StatisticsPeriod, type StatisticsQuery } from '../api/pomodoroStatisticsApi';
import { useServerStatistics } from '../api/useServerStatistics';
import { formatStudyTime } from '../statistics';
import { serverStatisticsView, statisticsSemesterCaption } from '../serverStatisticsView';
import { StatisticsAnchorSheet, StatisticsScopeSheet, type StatisticsOption } from './ServerStatisticsFilters';
import { StudyTimeChart } from './StudyTimeChart';
import { CourseDistribution } from './CourseDistribution';
import { usePomodoroProgress } from '../../focus/api/PomodoroProgressProvider';
import ServerFocusStreakCard from '../../focus/components/ServerFocusStreakCard';
import ServerAssignmentProgressCard from './ServerAssignmentProgressCard';

export default function ServerStudyStats() {
  const auth = useAuth(), app = useApp(), timeZone = auth.profile?.timeZone ?? 'Asia/Ho_Chi_Minh';
  const { width, fontScale } = useWindowDimensions();
  const progress = usePomodoroProgress();
  const { now } = usePomodoroToday(timeZone), confirmedToday = useRef<string | null>(null);
  if (progress.data) confirmedToday.current = progress.data.streak.today;
  const today = confirmedToday.current ?? pomodoroDay(now, timeZone);
  const [period, setPeriod] = useState<StatisticsPeriod>('WEEK'), [anchor, setAnchor] = useState<string | null>(null);
  const [semester, setSemester] = useState<StatisticsOption | null>(null), [course, setCourse] = useState<StatisticsOption | null>(null);
  const [dateOpen, setDateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const query: StatisticsQuery = { period, date: anchor ?? today, timeZone, ...(semester ? { semesterId: semester.id } : {}), ...(course ? { courseId: course.id } : {}) };
  const { state, reload } = useServerStatistics(query);
  const data = state.loaded && !state.error ? state.value : null;
  const chart = useMemo(() => data && detailsOpen ? serverStatisticsView(data, app.courseConnection?.loaded ? app.courseCatalog : undefined) : null, [data, detailsOpen, app.courseCatalog, app.courseConnection?.loaded]);
  const semesters = new Map<string, StatisticsOption>(app.semesters.map(s => [s.id, { id: s.id, label: `${s.name} · ${s.academicYear}` }]));
  for (const row of data?.courses ?? []) if (!semesters.has(row.semesterId)) semesters.set(row.semesterId, { id: row.semesterId, label: statisticsSemesterCaption(row.semesterTerm, row.semesterStartYear), hint: 'Từ lịch sử phiên học' });
  const courses = new Map<string, StatisticsOption>();
  for (const row of app.courseCatalog.filter(c => !semester || c.semesterId === semester.id)) courses.set(row.id, { id: row.id, label: row.name, hint: `${row.code} · ${semesters.get(row.semesterId)?.label ?? 'Học kỳ đã lưu'}` });
  for (const row of data?.courses ?? []) if (!courses.has(row.courseId)) courses.set(row.courseId, { id: row.courseId, label: row.courseName, hint: `${row.courseCode} · Từ lịch sử phiên học` });
  const retry = () => { void reload().catch(() => {}); };
  const reloadCatalog = () => { void Promise.allSettled([app.courseConnection?.reload(), app.semesterConnection?.reload()]); };
  let range: ReturnType<typeof statisticsWindow> | null = null;
  try { range = statisticsWindow(period, query.date); } catch { /* The read state displays the input error. */ }
  const target = (direction: -1 | 1) => { try { return moveStatistics(period, query.date, direction); } catch { return null; } };
  const previous = target(-1), next = target(1);
  const choosePeriod = (value: string) => { const p = value === 'Tuần' ? 'WEEK' : 'MONTH'; try { statisticsWindow(p, query.date); } catch { setAnchor(null); } setPeriod(p); };
  const periodLabel = period === 'WEEK' ? 'tuần' : 'tháng';
  const rangeLabel = range ? formatRange(range.fromDate, range.toDate) : 'Chọn ngày';
  const studyTime = data ? formatStudyTime(data.studySeconds) : null;
  const stacked = width < 390 || fontScale > 1.2;
  return <>
    <Card style={{ padding: 15, gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Chi tiết thời gian học" accessibilityHint={data ? `${studyTime}, ${data.completedSessions} phiên` : undefined} accessibilityState={{ expanded: detailsOpen }} onPress={() => setDetailsOpen(open => !open)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Row style={{ gap: 10 }}>
          <IconTile name="time-outline" size={38} />
          <View style={S.grow}>
            <T style={{ fontFamily: F.bold, fontSize: 16 }}>Thời gian học</T>
            {data ? <T accessibilityLiveRegion="polite" style={{ fontFamily: F.semi, color: C.primary }}>
              <T testID="server-statistics-time" style={{ fontFamily: F.semi, color: C.primary }}>{studyTime}</T>
              {' · '}<T testID="server-statistics-sessions" style={{ fontFamily: F.semi, color: C.primary }}>{data.completedSessions}</T> phiên
            </T> : <T style={S.small}>{state.error ? 'Chưa tải được thời gian học' : 'Đang tải các phiên hoàn tất…'}</T>}
          </View>
          <Icon name={detailsOpen ? 'chevron-up' : 'chevron-down'} size={17} />
        </Row>
      </Pressable>
      <View style={{ flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'center', gap: 8 }}>
        <View style={stacked ? undefined : { width: 108 }}>
          <Segments values={['Tuần', 'Tháng']} value={period === 'WEEK' ? 'Tuần' : 'Tháng'} onChange={choosePeriod} />
        </View>
        <Row style={{ flexGrow: 1, flexBasis: stacked ? 'auto' : 0, minWidth: 0, minHeight: 48, gap: 0, borderRadius: 24, borderWidth: 1, borderColor: C.line, backgroundColor: C.card }}>
          <IconButton label={`Xem ${periodLabel} trước`} name="chevron-back" bg="transparent" disabled={!previous} onPress={() => { if (previous) setAnchor(previous); }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ${periodLabel}`} accessibilityHint={rangeLabel} onPress={() => setDateOpen(true)} style={{ flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', paddingVertical: 3 }}>
            <T style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{rangeLabel}</T>
          </Pressable>
          <IconButton label={`Xem ${periodLabel} sau`} name="chevron-forward" bg="transparent" disabled={!next} onPress={() => { if (next) setAnchor(next); }} />
        </Row>
      </View>
      {range && (today < range.fromDate || today > range.toDate) && <Button label={`Về ${periodLabel} này`} secondary onPress={() => setAnchor(null)} />}
      {(semester || course) && <T style={S.small}>{[semester?.label, course?.label].filter(Boolean).join(' · ')}</T>}
      {state.error && <><T accessibilityRole="alert" style={[S.small, { color: C.red }]}>{state.error.message}</T><Button label="Thử lại thống kê" secondary onPress={retry} /></>}
      {detailsOpen && <Button label="Bộ lọc thời gian học" icon="options-outline" secondary onPress={() => setFiltersOpen(true)} />}
    </Card>
    {chart && <>
      <StudyTimeChart data={chart} preferredDay={query.date} period={period} onStart={() => app.setTab('focus')} startLabel="Đến Pomodoro" />
      {!!chart.distribution.length && <CourseDistribution courses={chart.distribution} />}
      <T style={S.small}>Múi giờ {timeZone}. Thời gian học được tính vào ngày kết thúc phiên, kể cả phiên cũ của môn đã thay đổi hoặc bị xóa.</T>
    </>}
    <ServerAssignmentProgressCard />
    <ServerFocusStreakCard />
    {dateOpen && <StatisticsAnchorSheet date={query.date} period={period} onApply={date => { setAnchor(date); setDateOpen(false); }} onClose={() => setDateOpen(false)} />}
    {filtersOpen && <StatisticsScopeSheet
      semester={{
        title: 'Học kỳ thống kê', allLabel: 'Tất cả học kỳ', options: [...semesters.values()], selected: semester,
        loading: !!app.semesterConnection && !app.semesterConnection.loaded && !app.semesterConnection.error,
        error: app.semesterConnection?.error?.message,
        onSelect: value => { if (value?.id !== semester?.id) { setSemester(value); setCourse(null); } },
      }}
      course={{
        title: 'Môn học thống kê', allLabel: 'Tất cả môn học', options: [...courses.values()], selected: course,
        loading: !!app.courseConnection && !app.courseConnection.loaded && !app.courseConnection.error,
        error: app.courseConnection?.error?.message, onSelect: setCourse,
      }}
      onRetry={reloadCatalog} onClose={() => setFiltersOpen(false)}
    />}
  </>;
}

function formatRange(from: string, to: string) {
  const startYear = from.slice(0, 4), endYear = to.slice(0, 4);
  const start = startYear === endYear ? dateLabel(from) : `${dateLabel(from)}/${startYear}`;
  return `${start} – ${dateLabel(to)}/${endYear}`;
}
