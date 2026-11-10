import React, { useState } from 'react';
import { Pressable, TextInput, useWindowDimensions, View } from 'react-native';
import { Badge, Button, Card, Icon, Row, Segments, Sheet, SheetFlow, StateView, T } from '../../../shared/components';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import { C, F, S } from '../../../shared/theme';
import { StatisticsSemesterSelector, StatisticsSemesterSheet } from '../../statistics/components/StatisticsFilters';
import type { ServerCourseGrade, ServerSemesterGrades } from '../api/gradesReadApi';
import { useServerSemesterGrades } from '../api/useServerGrades';
import { gradePresentation } from '../gradePresentation';
import { gradeNumber, serverGradeView } from '../serverGradeView';
import { semesterGpaCaption } from '../serverGpaView';
import { ServerCourseGradeDialog } from './ServerGradePanel';
import ServerCumulativeCard from './ServerCumulativeCard';
import { GradeConfigurationPendingNotice } from './GradeConfigurationReview';

export function ServerSemesterGradesSheet({ semesterId, onClose }: { semesterId: string; onClose: () => void }) {
  const [opened, setOpened] = useState<string | null>(null);
  return <SheetFlow>
    {opened ? <ServerCourseGradeDialog courseId={opened} onClose={() => setOpened(null)} />
      : <Sheet title="Điểm học kỳ đã lưu" onClose={onClose}><ServerGradesScreen fixedSemesterId={semesterId} onOpenCourse={setOpened} /></Sheet>}
  </SheetFlow>;
}

const filters = ['Tất cả', 'Đủ điểm', 'Chưa đủ', 'Không đạt'];

export default function ServerGradesScreen({ fixedSemesterId, onOpenCourse, onCompare }: {
  fixedSemesterId?: string; onOpenCourse?: (id: string) => void; onCompare?: () => void;
} = {}) {
  const { semesters, courseCatalog, academicSemesterId, setAcademicSemesterId, setScheduleMode, courseConnection, semesterConnection } = useApp();
  const { width, fontScale } = useWindowDimensions();
  const [filter, setFilter] = useState('Tất cả');
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const openCourse = onOpenCourse ?? setOpened;
  const semester = fixedSemesterId ? semesters.find(item => item.id === fixedSemesterId)
    : semesters.find(item => item.id === academicSemesterId) ?? semesters.find(item => item.status === 'Đang học') ?? semesters[0];
  const courses = courseCatalog.filter(course => course.semesterId === semester?.id);
  const read = useServerSemesterGrades(semester ? { semesterId: semester.id, semesterVersion: semester.version ?? -1, courses } : null, useNavigationScope().active);
  const reload = () => { void Promise.allSettled([read.reload(), courseConnection?.reload(), semesterConnection?.reload()]); };
  const manage = () => {
    setPickerOpen(false);
    if (semester) setAcademicSemesterId(semester.id);
    setScheduleMode('Môn & học kỳ');
  };
  const dialog = opened && <ServerCourseGradeDialog key={opened} courseId={opened} onClose={() => { setOpened(null); void read.reload().catch(() => {}); }} />;
  if (!semester) return <>
    <GradeConfigurationPendingNotice onOpen={openCourse} />
    <StateView title={fixedSemesterId ? 'Không tìm thấy học kỳ' : 'Chưa có bảng điểm'} message="Tạo học kỳ và thêm môn học để bắt đầu theo dõi điểm." actionLabel="Quản lý học kỳ và môn" onAction={manage} />
    {dialog}
  </>;

  const term = query.trim().toLocaleLowerCase();
  const filtered = read.value?.courses.filter(course => {
    const result = serverGradeView(course.result);
    const matchesFilter = filter === 'Tất cả' || (filter === 'Không đạt' ? result.failed : filter === 'Đủ điểm' ? result.complete : !result.complete);
    return matchesFilter && `${course.code} ${course.name}`.toLocaleLowerCase().includes(term);
  }) ?? [];
  return <>
    <GradeConfigurationPendingNotice onOpen={openCourse} />
    {fixedSemesterId
      ? <T style={S.title}>{semester.name} · {semester.academicYear}</T>
      : <StatisticsSemesterSelector semester={semester} onPress={() => setPickerOpen(true)} />}
    <View style={{ flexDirection: fixedSemesterId || width < 320 || fontScale >= 1.3 ? 'column' : 'row', alignItems: 'stretch', gap: 10 }}>
      <SemesterGpaCard summary={read.value?.summary} error={!!read.error} />
      {!fixedSemesterId && <ServerCumulativeCard />}
    </View>
    {read.error ? <StateView kind="error" title="Chưa tải được điểm học kỳ" message={read.error.message} actionLabel="Thử lại" onAction={reload} />
      : !read.value ? <StateView kind="loading" title="Đang tải điểm học kỳ" message="Đang đọc kết quả các môn đã lưu trong tài khoản." />
        : <>
          <T accessibilityRole="header" style={S.title}>Bảng điểm học kỳ</T>
          {!read.value.courses.length
            ? <StateView title="Học kỳ chưa có môn học" message="Thêm môn vào học kỳ này để theo dõi kết quả." actionLabel="Thêm môn học" onAction={manage} />
            : <>
              <Row style={{ backgroundColor: C.card, borderRadius: 16, paddingHorizontal: 13, borderWidth: 1, borderColor: C.line }}>
                <Icon name="search-outline" size={18} />
                <TextInput accessibilityLabel="Tìm môn trong bảng điểm" placeholder="Tìm tên hoặc mã môn" value={query} onChangeText={setQuery} placeholderTextColor={C.muted}
                  style={{ flex: 1, minWidth: 0, minHeight: 46, paddingVertical: 9, color: C.ink, fontFamily: F.regular }} />
              </Row>
              <Segments values={filters} value={filter} onChange={setFilter} />
              {filtered.length > 0
                ? <View style={{ gap: 8 }}>{filtered.map(course => <CourseGradeRow key={course.id} course={course} onOpen={() => openCourse(course.id)} />)}</View>
                : <StateView title="Không có môn phù hợp" message="Thử đổi bộ lọc hoặc từ khóa tìm kiếm." actionLabel="Xóa bộ lọc" onAction={() => { setQuery(''); setFilter('Tất cả'); }} />}
            </>}
        </>}
    {!fixedSemesterId && onCompare && <Button label="So sánh GPA giữa các học kỳ" secondary icon="analytics-outline" onPress={onCompare} />}
    {pickerOpen && <StatisticsSemesterSheet semesters={semesters} selectedId={semester.id}
      description="Chọn học kỳ để xem GPA và bảng điểm các môn của kỳ đó."
      onSelect={id => { setAcademicSemesterId(id); setPickerOpen(false); }}
      onManage={manage} onClose={() => setPickerOpen(false)} />}
    {dialog}
  </>;
}

function SemesterGpaCard({ summary, error }: { summary?: ServerSemesterGrades['summary']; error: boolean }) {
  return <Card style={[S.grow, { backgroundColor: C.soft, padding: 12, gap: 5 }]}>
    <T style={{ fontFamily: F.bold }}>GPA học kỳ</T>
    {summary ? <>
      <T testID="server-semester-gpa" style={{ fontFamily: F.extra, fontSize: 28, color: C.primary }}>
        {gradeNumber(summary.gpa, 2).replace('.', ',')}<T style={S.small}> / 4</T>
      </T>
      <T style={S.small}>{summary.calculatedCredits} tín chỉ tính GPA</T>
      {summary.state !== 'COMPLETE' && <T style={S.small}>{semesterGpaCaption(summary)}</T>}
    </> : <T style={S.small}>{error ? 'Chưa tải được GPA' : 'Đang tải GPA…'}</T>}
  </Card>;
}

function CourseGradeRow({ course, onOpen }: { course: ServerCourseGrade; onOpen: () => void }) {
  const result = serverGradeView(course.result);
  const presentation = gradePresentation(result);
  const value = gradeNumber(result.total, 1).replace('.', ',');
  const scoreColor = presentation.attention || result.total === null ? presentation.color : C.primary;
  const status = result.failed ? (course.result.status === 'EXAM_BLOCKED' ? 'Không đủ điều kiện thi' : 'Không đạt')
    : presentation.lowPass ? 'Đạt · Điểm thấp' : result.passed ? 'Đạt' : 'Chưa đủ điểm';
  return <Pressable accessibilityRole="button" accessibilityLabel={`Bảng điểm ${course.name}`}
    accessibilityHint={`${course.code}, ${course.credits} tín chỉ, ${result.total === null ? status : value + ' trên 10, ' + status}`}
    onPress={onOpen} style={({ pressed }) => [S.card, { padding: 12, opacity: pressed ? 0.72 : 1 }]}>
    <Row style={{ gap: 7 }}>
      <View style={[S.grow, { gap: 4 }]}>
        <T style={{ fontFamily: F.bold, fontSize: 15 }}>{course.name}</T>
        <T style={S.small}>{course.code} · {course.credits} tín chỉ</T>
      </View>
      <View style={{ maxWidth: '45%', flexShrink: 1, alignItems: 'flex-end', gap: 4 }}>
        <T style={{ fontFamily: F.extra, fontSize: 23, color: scoreColor }}>{value}<T style={S.small}> / 10</T></T>
        <View style={{ alignItems: 'flex-end' }}><Badge label={status} bg={presentation.background} color={presentation.color} /></View>
      </View>
      <Icon name="chevron-forward" size={15} />
    </Row>
  </Pressable>;
}
