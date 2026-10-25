import React, { useState } from 'react';
import { Badge, Button, Card, Row, Segments, Sheet, StateView, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { FlowScope, useNavigationScope } from '../../navigation/Navigation';
import { useApp } from '../../store/model';
import useCurrentTime from '../../shared/hooks/useCurrentTime';
import { examQueryKey } from './api/examsApi';
import { useServerExamList } from './api/useServerExams';
import { filterExams, type ExamPeriod } from './examView';
import ServerExamCard from './components/ServerExamCard';
import ServerExamDialog from './components/ServerExamDialog';
import ExamApiForm from './components/ExamApiForm';
import { useExamWrites } from './api/ExamWritesProvider';

export default function ServerExams() {
  const { semesters, academicSemesterId, setAcademicSemesterId, courseCatalog, courseConnection, semesterConnection, setScheduleMode } = useApp();
  const { active } = useNavigationScope(), now = useCurrentTime();
  const { state: writes } = useExamWrites();
  const [creating, setCreating] = useState(false);
  const [period, setPeriod] = useState<ExamPeriod>('Sắp tới'), [courseId, setCourseId] = useState('');
  const [chooser, setChooser] = useState<'semester' | 'course' | null>(null), [opened, setOpened] = useState<{ id: string; key: string } | null>(null);
  const semester = semesters.find(s => s.id === academicSemesterId), courses = courseCatalog.filter(c => c.semesterId === semester?.id);
  const course = courses.find(c => c.id === courseId), query = semester ? { semesterId: semester.id, ...(course ? { courseId: course.id } : {}) } : null;
  const key = query ? examQueryKey(query) : '', source = useServerExamList(query, active), rows = source.value ?? [];
  const missingCourse = rows.some(row => !courses.some(c => c.id === row.courseId)), visible = filterExams(rows, period, now.getTime());
  const reload = () => { void Promise.allSettled([source.reload(), courseConnection?.reload(), semesterConnection?.reload()]); };
  // Keep the shared catalogue current when returning from another screen or tab.
  React.useEffect(() => { if (active) void Promise.allSettled([courseConnection?.reload(), semesterConnection?.reload()]); }, [active]);
  return <FlowScope onClose={() => { if (!writes.busy && !writes.checking) { setChooser(null); setOpened(null); setCreating(false); } }}>
    <Row between style={{ flexWrap: 'wrap', rowGap: 8 }}><T style={{ fontFamily: F.extra, fontSize: 23 }}>Lịch thi của bạn</T><Badge label="Lịch thi trong tài khoản" icon="cloud-done-outline" /></Row>
    <T style={S.small}>Chuẩn bị từng chút để bước vào kỳ thi vững vàng hơn.</T>
    <Button label={semester ? `${semester.name} · ${semester.academicYear}` : 'Chọn học kỳ xem lịch thi'} secondary icon="calendar-outline" disabled={!semesters.length} onPress={() => setChooser('semester')} />
    {writes.pending && <Button label="Kiểm tra lần ghi lịch thi trước" secondary disabled={writes.busy || writes.checking} onPress={() => setCreating(true)} />}
    {!semester ? <StateView title="Chưa có học kỳ để xem lịch thi" message="Tạo học kỳ và thêm môn học để bắt đầu quản lý lịch thi." actionLabel="Đến Môn & học kỳ" onAction={() => setScheduleMode('Môn & học kỳ')} /> : <>
      <Button label={course ? `${course.code} · ${course.name}` : 'Tất cả môn trong học kỳ'} secondary icon="school-outline" disabled={!courses.length} onPress={() => setChooser('course')} />
      <Segments values={['Sắp tới', 'Đã qua', 'Tất cả']} value={period} onChange={value => setPeriod(value as ExamPeriod)} />
      {!writes.pending && <Button label="Thêm lịch thi mới" icon="add" disabled={!courses.length || writes.busy || writes.checking} onPress={() => setCreating(true)} />}
      <Button label="Tải lại lịch thi" secondary icon="refresh-outline" loading={source.loading} onPress={reload} />
      {!source.loaded ? <StateView kind={source.error ? 'error' : 'loading'} title={source.error ? 'Chưa tải được lịch thi' : 'Đang tải lịch thi'} message={source.error?.message ?? 'Đang lấy lịch thi đã lưu cho học kỳ và môn đang chọn.'} actionLabel={source.error ? 'Thử tải lại lịch thi' : undefined} onAction={reload} /> : <>
        {source.error && <Card style={{ backgroundColor: C.redSoft, gap: 8 }}><T accessibilityRole="alert" style={{ color: C.red }}>{source.error.message}</T><T style={S.small}>Đang giữ bản đã tải gần nhất của đúng học kỳ và môn này. Tải lại để kiểm tra lịch mới nhất.</T></Card>}
        {source.loading && <T accessibilityLiveRegion="polite" style={S.small}>Đang cập nhật lịch thi…</T>}
        {missingCourse ? <StateView kind="error" title="Chưa cập nhật đủ môn của lịch thi" message="Thông tin môn học có thể vừa thay đổi. Tải lại môn và lịch thi trước khi xem tiếp." actionLabel="Cập nhật môn và lịch thi" onAction={reload} /> : <>
          {visible.map(exam => <ServerExamCard key={exam.id} exam={exam} course={courses.find(c => c.id === exam.courseId)!} now={now.getTime()} onOpen={() => setOpened({ id: exam.id, key })} />)}
          {!visible.length && !source.error && !source.loading && <StateView title={rows.length ? 'Chưa có kỳ thi ở mục này' : course ? 'Môn này chưa có lịch thi' : 'Học kỳ này chưa có lịch thi'} message={rows.length ? 'Bạn có thể chọn Tất cả để xem những kỳ thi đã lưu ở thời điểm khác.' : 'Chọn Thêm lịch thi mới để lưu lịch vào tài khoản.'} actionLabel={rows.length ? 'Xem tất cả lịch thi' : undefined} onAction={() => setPeriod('Tất cả')} />}
        </>}
      </>}
      <T style={S.small}>Ngày và giờ theo múi giờ ghi trên từng kỳ thi. Các thay đổi được lưu vào tài khoản; hệ thống kiểm tra trùng với lịch học, tự học và kỳ thi khác.</T>
    </>}
    {chooser === 'semester' && <Sheet title="Học kỳ xem lịch thi" onClose={() => setChooser(null)}>{semesters.map(s => <Button key={s.id} secondary={s.id !== semester?.id} label={`${s.name} · ${s.academicYear}`} onPress={() => { setAcademicSemesterId(s.id); setCourseId(''); setOpened(null); setChooser(null); }} />)}</Sheet>}
    {chooser === 'course' && <Sheet title="Môn học xem lịch thi" onClose={() => setChooser(null)}><Button label="Tất cả môn trong học kỳ" secondary={!!course} onPress={() => { setCourseId(''); setOpened(null); setChooser(null); }} />{courses.map(c => <Button key={c.id} secondary={c.id !== course?.id} label={`${c.code} · ${c.name}`} onPress={() => { setCourseId(c.id); setOpened(null); setChooser(null); }} />)}</Sheet>}
    {opened?.key === key && <ServerExamDialog key={`${key}:${opened.id}`} id={opened.id} onClose={() => { setOpened(null); reload(); }} onRefreshList={reload} />}
    {creating && <ExamApiForm initialCourseId={course?.id ?? courses[0]?.id} onClose={() => setCreating(false)} onSaved={exam => {
      setCreating(false); setCourseId(''); setPeriod('Tất cả');
      const savedCourse = courseCatalog.find(c => c.id === exam.courseId);
      if (savedCourse) { setAcademicSemesterId(savedCourse.semesterId); setOpened({ id: exam.id, key: examQueryKey({ semesterId: savedCourse.semesterId }) }); }
      reload();
    }} />}
  </FlowScope>;
}
