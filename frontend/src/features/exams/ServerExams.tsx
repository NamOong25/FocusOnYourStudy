import React, { useState } from 'react';
import { View } from 'react-native';
import { Button, Card, Row, Segments, Sheet, StateView, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { FlowScope, useNavigationScope } from '../../navigation/Navigation';
import { useApp } from '../../store/model';
import useCurrentTime from '../../shared/hooks/useCurrentTime';
import { examQueryKey } from './api/examsApi';
import { useServerExamList } from './api/useServerExams';
import { projectExamOverview } from './examOverview';
import { examClock, filterExams, type ExamPeriod } from './examView';
import ExamListCard from './components/ExamListCard';
import ServerExamDialog from './components/ServerExamDialog';
import ExamApiForm from './components/ExamApiForm';
import { useExamWrites } from './api/ExamWritesProvider';
import { zonedDay } from '../study/studyTime';
import { parseDay } from '../../shared/utils/dates';
import type { TimetableEntry } from '../schedule/components/ScheduleTimetable';
import ExamTimetable, { ExamViewPicker, type ExamView } from './components/ExamTimetable';

export default function ServerExams() {
  const { semesters, academicSemesterId, setAcademicSemesterId, courseCatalog, courseConnection, semesterConnection, setScheduleMode } = useApp();
  const { active } = useNavigationScope(), now = useCurrentTime();
  const { state: writes } = useExamWrites();
  const [creating, setCreating] = useState(false);
  const [period, setPeriod] = useState<ExamPeriod>('Sắp tới'), [courseId, setCourseId] = useState('');
  const [view, setView] = useState<ExamView>('Theo tuần');
  const [selected, setSelected] = useState(() => new Date());
  const [chooser, setChooser] = useState<'filters' | 'semester' | 'course' | null>(null), [opened, setOpened] = useState<{ id: string; key: string } | null>(null);
  const semester = semesters.find(s => s.id === academicSemesterId), courses = courseCatalog.filter(c => c.semesterId === semester?.id);
  const course = courses.find(c => c.id === courseId), query = semester ? { semesterId: semester.id, ...(course ? { courseId: course.id } : {}) } : null;
  const key = query ? examQueryKey(query) : '', source = useServerExamList(query, active);
  const overview = query ? projectExamOverview(source, courses, query, now.getTime()) : null;
  const visible = filterExams(overview?.rows ?? [], period, now.getTime());
  const nearest = period === 'Sắp tới' ? overview?.next?.id : undefined;
  const entries = (overview?.rows ?? []).map((exam): TimetableEntry => ({
    id: exam.id, date: zonedDay(Date.parse(exam.startsAt), exam.timeZone),
    start: examClock(exam.startsAt, exam.timeZone), end: examClock(exam.endsAt, exam.timeZone),
    title: courses.find(c => c.id === exam.courseId)?.name ?? 'Kỳ thi',
    room: exam.room, exam: true, onOpen: () => setOpened({ id: exam.id, key }),
  }));
  const create = () => setCreating(true);
  const reload = () => { void Promise.allSettled([source.reload(), courseConnection?.reload(), semesterConnection?.reload()]); };
  // Keep the shared catalogue current when returning from another screen or tab.
  React.useEffect(() => { if (active) void Promise.allSettled([courseConnection?.reload(), semesterConnection?.reload()]); }, [active]);
  return <FlowScope onClose={() => { if (!writes.busy && !writes.checking) { setChooser(null); setOpened(null); setCreating(false); } }}>
    <View style={{ gap: 10 }}>
      <Row between>
        <T accessibilityRole="header" style={[S.grow, { fontFamily: F.extra, fontSize: 22, lineHeight: 29, letterSpacing: -0.5 }]}>Lịch thi</T>
        {!writes.pending && <Button label="+ Lịch thi" disabled={!courses.length || writes.busy || writes.checking}
          onPress={create} style={{ minHeight: 44, paddingHorizontal: 13, paddingVertical: 8 }} />}
      </Row>
      {semesters.length > 0 && <Row between>
        <View style={S.grow}>
          <T style={{ fontFamily: F.semi, fontSize: 12 }}>{semester ? `${semester.name} · ${semester.academicYear}` : 'Chọn học kỳ xem lịch thi'}</T>
          {semester && <T style={S.small} numberOfLines={2}>{course?.name ?? 'Tất cả môn'}</T>}
        </View>
        <Button label="Bộ lọc" secondary icon="options-outline" onPress={() => setChooser('filters')}
          style={{ minHeight: 44, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14 }} />
      </Row>}
      {semester && <ExamViewPicker view={view} onView={setView} />}
      {semester && view === 'Danh sách' && <Segments values={['Sắp tới', 'Đã qua', 'Tất cả']} value={period} onChange={value => setPeriod(value as ExamPeriod)} />}
    </View>
    {writes.pending && <Button label="Kiểm tra lần ghi lịch thi trước" secondary disabled={writes.busy || writes.checking} onPress={create} />}
    {!semester ? <StateView title="Chưa có học kỳ để xem lịch thi" message="Tạo học kỳ và thêm môn học để bắt đầu quản lý lịch thi." actionLabel="Đến Môn & học kỳ" onAction={() => setScheduleMode('Môn & học kỳ')} /> : <>
      {!source.loaded ? <StateView kind={source.error ? 'error' : 'loading'} title={source.error ? 'Chưa tải được lịch thi' : 'Đang tải lịch thi'} message={source.error?.message ?? 'Đang lấy lịch thi đã lưu cho học kỳ và môn đang chọn.'} actionLabel={source.error ? 'Thử tải lại lịch thi' : undefined} onAction={reload} /> : <>
        {source.error && <Card style={{ backgroundColor: C.redSoft, gap: 8 }}>
          <T accessibilityRole="alert" style={{ color: C.red }}>{source.error.message}</T>
          <T style={S.small}>Đang hiển thị lịch thi đã tải gần nhất.</T>
          <Button label="Thử tải lại lịch thi" secondary loading={source.loading} onPress={reload} />
        </Card>}
        {overview?.catalogueMismatch ? <StateView kind="error" title="Chưa cập nhật đủ môn của lịch thi" message="Thông tin môn học có thể vừa thay đổi. Tải lại môn và lịch thi trước khi xem tiếp." actionLabel="Cập nhật môn và lịch thi" onAction={reload} /> : view !== 'Danh sách'
          ? <ExamTimetable entries={entries} selected={selected} view={view} onSelect={setSelected} onView={setView} />
          : <>
          {!!visible.length && <T style={{ fontFamily: F.bold, fontSize: 13 }} accessibilityLiveRegion="polite">{visible.length} kỳ thi</T>}
          {visible.map(exam => <ExamListCard key={exam.id} exam={exam} course={courses.find(c => c.id === exam.courseId)!}
            now={now.getTime()} featured={exam.id === nearest} onOpen={() => setOpened({ id: exam.id, key })} />)}
          {!visible.length && source.loading && <T accessibilityLiveRegion="polite" style={S.small}>Đang cập nhật lịch thi…</T>}
          {!visible.length && overview?.ready && <StateView title={overview.rows.length ? 'Chưa có kỳ thi ở mục này' : course ? 'Môn này chưa có lịch thi' : 'Học kỳ này chưa có lịch thi'}
            message={overview.rows.length ? 'Chọn Tất cả để xem những kỳ thi đã lưu ở thời điểm khác.' : courses.length ? 'Thêm lịch thi khi có thông báo từ giảng viên.' : 'Thêm môn học vào học kỳ này để tạo lịch thi.'}
            actionLabel={overview.rows.length ? 'Xem tất cả lịch thi' : !courses.length ? 'Đến Môn & học kỳ' : undefined}
            onAction={() => overview.rows.length ? setPeriod('Tất cả') : setScheduleMode('Môn & học kỳ')} />}
        </>}
      </>}
    </>}
    {chooser && <Sheet title={chooser === 'semester' ? 'Học kỳ xem lịch thi' : chooser === 'course' ? 'Môn học xem lịch thi' : 'Bộ lọc lịch thi'}
      onClose={() => setChooser(null)} onBack={chooser === 'filters' ? undefined : () => setChooser('filters')} scrollKey={chooser}>
      {chooser === 'semester' ? semesters.map(item => <Button key={item.id} secondary={item.id !== semester?.id}
        label={`${item.name} · ${item.academicYear}`} onPress={() => {
          if (item.id !== semester?.id) { setAcademicSemesterId(item.id); setCourseId(''); setOpened(null); }
          setChooser('filters');
        }} />) : chooser === 'course' ? <>
        <Button label="Tất cả môn trong học kỳ" secondary={!!course} onPress={() => { setCourseId(''); setOpened(null); setChooser('filters'); }} />
        {courses.map(item => <Button key={item.id} secondary={item.id !== course?.id}
          label={`${item.code} · ${item.name}`} onPress={() => { setCourseId(item.id); setOpened(null); setChooser('filters'); }} />)}
      </> : <>
        <View style={{ gap: 7 }}>
          <T style={{ fontFamily: F.semi }}>Học kỳ</T>
          <Button label={semester ? `${semester.name} · ${semester.academicYear}` : 'Chọn học kỳ'}
            secondary icon="calendar-outline" onPress={() => setChooser('semester')} />
        </View>
        <View style={{ gap: 7 }}>
          <T style={{ fontFamily: F.semi }}>Môn học</T>
          <Button label={course?.name ?? 'Tất cả môn trong học kỳ'} secondary icon="school-outline"
            disabled={!courses.length} onPress={() => setChooser('course')} />
        </View>
        <Button label="Xem lịch thi" onPress={() => setChooser(null)} />
      </>}
    </Sheet>}
    {opened?.key === key && <ServerExamDialog key={`${key}:${opened.id}`} id={opened.id} onClose={() => { setOpened(null); reload(); }} onRefreshList={reload} />}
    {creating && <ExamApiForm initialCourseId={course?.id ?? courses[0]?.id} onClose={() => setCreating(false)} onSaved={exam => {
      setCreating(false); setCourseId(''); setPeriod('Tất cả');
      setSelected(parseDay(zonedDay(Date.parse(exam.startsAt), exam.timeZone)));
      const savedCourse = courseCatalog.find(c => c.id === exam.courseId);
      if (savedCourse) { setAcademicSemesterId(savedCourse.semesterId); setOpened({ id: exam.id, key: examQueryKey({ semesterId: savedCourse.semesterId }) }); }
      reload();
    }} />}
  </FlowScope>;
}
