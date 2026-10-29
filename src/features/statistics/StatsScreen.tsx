import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Badge, Card, IconTile, Row, Segments, StateView, T } from '../../shared/components';
import { NavigationScope } from '../../navigation/Navigation';
import { C, F, S } from '../../shared/theme';
import useCurrentTime from '../../shared/hooks/useCurrentTime';
import { useApp } from '../../store/model';
import Grades from '../grades/GradesScreen';
import { formatStudyTime, statisticsData, statisticsPeriods, statisticsRange, type StatisticsPeriod, type StatisticsRange } from './statistics';
import { StatisticsDateRangeSheet, StatisticsRangeCaption, StatisticsSemesterSelector, StatisticsSemesterSheet } from './components/StatisticsFilters';
import { StudyTimeChart } from './components/StudyTimeChart';
import { CourseDistribution } from './components/CourseDistribution';
import { TaskProgressCard } from './components/TaskProgressCard';
import GpaComparisonScreen from './components/GpaComparisonScreen';
import { useAuth } from '../account/auth/AuthProvider';
import ServerStudyStats from './components/ServerStudyStats';

export default function Stats() {
  const [view, setView] = useState('Tổng quan');
  return <>
    <Segments values={['Tổng quan', 'So sánh GPA', 'Điểm & GPA']} value={view} onChange={setView} />
    <NavigationScope active={view === 'Tổng quan'}><View style={{ display: view === 'Tổng quan' ? 'flex' : 'none', gap: 16 }}><StudyStats /></View></NavigationScope>
    <NavigationScope active={view === 'So sánh GPA'}><View style={{ display: view === 'So sánh GPA' ? 'flex' : 'none', gap: 16 }}><GpaComparisonScreen /></View></NavigationScope>
    <NavigationScope active={view === 'Điểm & GPA'}><View style={{ display: view === 'Điểm & GPA' ? 'flex' : 'none', gap: 16 }}><Grades onCompare={() => setView('So sánh GPA')} /></View></NavigationScope>
  </>;
}

function StudyStats() {
  const auth = useAuth();
  return auth.hasSession ? <ServerStudyStats key={`${auth.revision}:${auth.profile?.id ?? ''}`} /> : <PreviewStudyStats />;
}

function PreviewStudyStats() {
  const { tasks, courseCatalog, focusRecords, semesters, setScheduleMode, setAcademicSemesterId, setTab } = useApp();
  const clock = useCurrentTime();
  const now = useMemo(() => new Date(), [clock, focusRecords]);
  const [selectedSemester, setSelectedSemester] = useState(() => (semesters.find(semester => semester.status === 'Đang học') ?? semesters[0])?.id ?? '');
  const [period, setPeriod] = useState<StatisticsPeriod>('7 ngày');
  const [customRange, setCustomRange] = useState<StatisticsRange>(() => statisticsRange('7 ngày', new Date(), { from: '', to: '' }));
  const [sheet, setSheet] = useState<'semester' | 'range' | null>(null);
  const semester = semesters.find(item => item.id === selectedSemester) ?? semesters.find(item => item.status === 'Đang học') ?? semesters[0];
  const manage = () => { setSheet(null); if (semester) setAcademicSemesterId(semester.id); setScheduleMode('Môn & học kỳ'); };
  if (!semester) return <StateView title="Bắt đầu thống kê từ học kỳ đầu tiên" message="Thêm học kỳ, môn và bài tập. Khi bạn hoàn tất một phiên tập trung, thời gian học sẽ xuất hiện ở đây." actionLabel="Thêm học kỳ và môn học" onAction={manage} />;
  const range = statisticsRange(period, now, customRange);
  const data = statisticsData({ semesterId: semester.id, catalog: courseCatalog, records: focusRecords, tasks, range, now });
  const hasCourses = courseCatalog.some(course => course.semesterId === semester.id);
  return <>
    <View style={{ gap: 5 }}><T accessibilityRole="header" style={{ fontFamily: F.extra, fontSize: 26, lineHeight: 37, letterSpacing: -0.7 }}>Thống kê học tập</T><T style={S.small}>Nhìn lại nhịp học của bạn</T></View>
    <StatisticsSemesterSelector semester={semester} onPress={() => setSheet('semester')} />
    <Segments values={statisticsPeriods} value={period} onChange={value => { if (value === 'Tùy chọn') setSheet('range'); else setPeriod(value as StatisticsPeriod); }} />
    <View style={{ gap: 4 }}><StatisticsRangeCaption range={range} /><T style={[S.small, { textAlign: 'center', fontSize: 10 }]}>Khoảng ngày áp dụng cho thời gian học và phân bổ môn.</T></View>
    {!!data.sampleCount && <Badge label={`Có ${data.sampleCount} phiên mẫu trong số liệu`} icon="flask-outline" />}
    <Row style={{ gap: 12, alignItems: 'stretch' }}>
      <Card style={[S.grow, { padding: 15, gap: 10 }]}><IconTile name="time-outline" bg={C.soft} size={38} /><T style={S.small}>Thời gian học</T><T style={{ fontFamily: F.extra, fontSize: 21, lineHeight: 30 }}>{formatStudyTime(data.totalSeconds).replace(/(\d+) (giờ|phút)/g, '$1\u00a0$2')}</T><T style={S.small}>Từ {data.entries.length} phiên hoàn tất</T></Card>
      <Card style={[S.grow, { padding: 15, gap: 10 }]}><IconTile name="flame-outline" color={C.amber} bg={C.amberSoft} size={38} /><T style={S.small}>Chuỗi ngày học</T><T style={{ fontFamily: F.extra, fontSize: 26, lineHeight: 33 }}>{data.streak} ngày</T><T style={S.small}>Trong học kỳ · Tính đến hôm nay</T></Card>
    </Row>
    <StudyTimeChart data={data} onStart={hasCourses ? () => setTab('focus') : manage} startLabel={hasCourses ? 'Đến Pomodoro' : 'Thêm môn cho học kỳ'} />
    {!!data.distribution.length && <CourseDistribution courses={data.distribution} />}
    <TaskProgressCard tasks={data.tasks} onTasks={() => setScheduleMode('Bài tập')} />
    <T style={S.small}>Chuỗi ngày học xét các phiên của học kỳ đến hôm nay, không bị cắt theo khoảng ngày trên biểu đồ. Phiên qua nửa đêm được tính vào ngày kết thúc; thời gian tạm dừng và nghỉ không cộng vào phút học.</T>
    {sheet === 'semester' && <StatisticsSemesterSheet semesters={semesters} selectedId={semester.id} onSelect={id => { setSelectedSemester(id); setSheet(null); }} onManage={manage} onClose={() => setSheet(null)} />}
    {sheet === 'range' && <StatisticsDateRangeSheet range={range} onApply={value => { setCustomRange(value); setPeriod('Tùy chọn'); setSheet(null); }} onClose={() => setSheet(null)} />}
  </>;
}
