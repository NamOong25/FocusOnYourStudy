import { StateView } from '../../shared/components';
import { FlowScope } from '../../navigation/Navigation';
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button, Card, Icon, IconButton, IconTile, Progress, Row, Section, Segments, Sheet, T } from '../../shared/components';
import { Course, courseColors } from './academic';
import { CourseForm, SemesterForm } from './forms';
import { ClassForm } from '../schedule/ClassForm';
import { TaskForm } from '../assignments/TaskForm';
import TaskDialog from '../assignments/TaskDialog';
import ClassDialog from '../schedule/ClassDialog';
import { weekdaysLabel } from '../schedule/calendar';
import { ExamDialog } from '../exams/Exams';
import GradePanel from '../grades/GradePanel';
import { GradeEditor } from '../grades/GradeEditor';
import { ClassItem, Task, dateLabel, dueLabel, useApp } from '../../store/model';
import { C, F, S } from '../../shared/theme';

type SheetMode = 'detail' | 'new-course' | 'edit-course' | 'new-semester' | 'edit-semester' | 'task' | 'class' | 'exam' | 'grades' | null;
export default function Academics() {
  const { semesters, courseCatalog, tasks, classes } = useApp();
  const [semesterId, setSemesterId] = useState('sem-5'); const [filter, setFilter] = useState('Tất cả'); const [query, setQuery] = useState('');
  const [detailSection, setDetailSection] = useState('Tổng quan');
  const [sheet, setSheet] = useState<SheetMode>(null); const [courseId, setCourseId] = useState<string | null>(null);
  const [taskItem, setTaskItem] = useState<Task | undefined>(); const [classItem, setClassItem] = useState<ClassItem | undefined>();
  const [examId, setExamId] = useState<string | null>(null);
  if (!semesters.length) return <FlowScope onClose={() => setSheet(null)}><StateView title="Chưa có học kỳ" message="Tạo học kỳ đầu tiên, rồi thêm môn học và tín chỉ của bạn." actionLabel="Tạo học kỳ đầu tiên" onAction={() => setSheet('new-semester')} />{sheet === 'new-semester' && <SemesterForm onClose={() => setSheet(null)} onSaved={id => { setSemesterId(id); setSheet(null); }} />}</FlowScope>;
  const semester = semesters.find(s => s.id === semesterId) ?? semesters[0]!;
  const semesterCourses = courseCatalog.filter(c => c.semesterId === semester.id);
  const credits = semesterCourses.reduce((sum, c) => sum + c.credits, 0);
  const completedCredits = semesterCourses.filter(c => c.status === 'Hoàn thành').reduce((sum,c) => sum + c.credits, 0);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const list = semesterCourses.filter(c => (filter === 'Tất cả' || c.status === filter) && `${c.name} ${c.code} ${c.teacher}`.toLocaleLowerCase().includes(normalizedQuery));
  const openedCourse = courseCatalog.find(c => c.id === courseId);
  const selectSemester = (id: string) => { setSemesterId(id); setFilter('Tất cả'); setQuery(''); };
  const openCourse = (course: Course) => { setCourseId(course.id); setDetailSection('Tổng quan'); setSheet('detail'); };
  return <FlowScope onClose={() => setSheet(null)}>
    <View style={{ gap: 5, marginTop: 5 }}><T style={{ fontFamily: F.bold, fontSize: 10, color: C.primary, letterSpacing: 1.4 }}>HÀNH TRÌNH HỌC TẬP</T><T style={{ fontFamily: F.extra, fontSize: 25, lineHeight: 36, letterSpacing: -0.8 }}>Môn học & học kỳ</T><T style={{ fontSize: 12, color: C.muted }}>Hiểu rõ từng môn. Tiến bộ qua từng học kỳ.</T></View>
    <Section title="Học kỳ của bạn" action="+ Thêm" onAction={() => setSheet('new-semester')} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 3 }}>
      {semesters.map(s => { const active = s.id === semester.id; const count = courseCatalog.filter(c => c.semesterId === s.id).length; return <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`Chọn ${s.name}, ${s.academicYear}`} accessibilityState={{ selected: active }} aria-selected={active} onPress={() => selectSemester(s.id)} style={{ width: 159, minHeight: 108, borderRadius: 21, backgroundColor: active ? C.primary : '#fff', padding: 15, gap: 5, borderWidth: 1, borderColor: active ? C.primary : C.line }}><Row between><Icon name="calendar-outline" size={19} color={active ? '#fff' : C.primary} /><T style={{ color: active ? '#EEE9FF' : C.muted, fontSize: 9 }}>{s.status}</T></Row><T style={{ fontFamily: F.bold, fontSize: 16, color: active ? '#fff' : C.ink }}>{s.name}</T><T style={{ fontSize: 10, color: active ? '#DAD2FF' : C.muted }}>{s.academicYear} · {count} môn</T></Pressable>; })}
    </ScrollView>
    <LinearGradient colors={['#ECE6FF', '#F7F4FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 16, gap: 9 }}>
      <Row between><View style={[S.grow, { gap: 3 }]}><T style={{ fontFamily: F.bold, fontSize: 17, color: C.primary }}>{semesterCourses.length} môn học · {credits} tín chỉ</T><T style={{ fontSize: 11, color: '#685F89' }}>Tín chỉ môn đã hoàn thành: {completedCredits}/{credits}</T></View><IconButton name="create-outline" label="Chỉnh sửa học kỳ" onPress={() => setSheet('edit-semester')} bg="#FFFFFFBB" /></Row>
      <Progress value={credits ? completedCredits / credits * 100 : 0} />
    </LinearGradient>
    <Section title="Môn học trong kỳ" action="+ Thêm môn" onAction={() => setSheet('new-course')} />
    <Row style={{ borderRadius: 17, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, minHeight: 49 }}><Icon name="search-outline" color={C.muted} size={19} /><TextInput accessibilityLabel="Tìm môn học" placeholder="Tên môn, mã môn hoặc giảng viên" placeholderTextColor={C.muted} value={query} onChangeText={setQuery} style={{ flex: 1, minWidth: 0, fontFamily: F.regular, fontSize: 12, color: C.ink, paddingVertical: 13 }} />{!!query && <IconButton name="close" label="Xóa tìm kiếm" onPress={() => setQuery('')} bg="#fff" />}</Row>
    <Segments values={['Tất cả', 'Đang học', 'Hoàn thành', 'Dự kiến']} value={filter} onChange={setFilter} />
    {list.map(course => {
      const colors = courseColors[course.color]; const linkedTasks = tasks.filter(t => t.courseId === course.id); const done = linkedTasks.filter(t => t.status === 'Hoàn thành').length; const classCount = classes.filter(c => c.courseId === course.id).reduce((sum,c) => sum + c.weekdays.length, 0);
      return <Pressable key={course.id} accessibilityRole="button" accessibilityLabel={`Mở môn ${course.name}`} onPress={() => openCourse(course)}><Card style={{ gap: 14 }}>
        <Row><IconTile name="book-outline" color={colors.ink} bg={colors.bg} size={46} /><View style={[S.grow, { gap: 4 }]}><T style={{ color: colors.ink, fontFamily: F.bold, fontSize: 10, letterSpacing: 0.7 }}>{course.code}</T><T style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 25, letterSpacing: -0.3 }}>{course.name}</T></View><Icon name="chevron-forward" color={C.muted} size={17} /></Row>
        <Row between><Row style={[S.grow, { gap: 5 }]}><Icon name="person-outline" color={C.muted} size={14} /><T numberOfLines={1} style={{ color: C.muted, fontSize: 11, flex: 1 }}>{course.teacher || 'Chưa có giảng viên'}</T></Row><Badge label={course.status} bg={course.status === 'Hoàn thành' ? C.greenSoft : colors.bg} color={course.status === 'Hoàn thành' ? C.green : colors.ink} /></Row>
        <Row style={{ gap: 7, flexWrap: 'wrap' }}><Badge label={`${course.credits} tín chỉ`} bg={C.canvas} color={C.muted} icon="ribbon-outline" /><Badge label={`${classCount} ca học`} bg={C.canvas} color={C.muted} icon="calendar-outline" /><Badge label={`${linkedTasks.length} bài tập`} bg={C.canvas} color={C.muted} icon="clipboard-outline" /></Row>
        {!!linkedTasks.length && <View style={{ gap: 7 }}><Row between><T style={{ color: C.muted, fontSize: 10 }}>Bài tập đã hoàn thành</T><T style={{ color: colors.ink, fontSize: 10, fontFamily: F.bold }}>{done}/{linkedTasks.length}</T></Row><Progress value={done / linkedTasks.length * 100} /></View>}
      </Card></Pressable>;
    })}
    {list.length === 0 && <Card style={{ alignItems: 'center', gap: 11, paddingVertical: 29 }}><IconTile name={semesterCourses.length ? 'search-outline' : 'library-outline'} size={58} /><T style={{ fontFamily: F.bold, fontSize: 16, textAlign: 'center' }}>{semesterCourses.length ? 'Chưa tìm thấy môn phù hợp' : 'Học kỳ mới đang chờ bạn'}</T><T style={[S.small, { textAlign: 'center' }]}>{semesterCourses.length ? 'Thử một từ khóa khác hoặc xem tất cả trạng thái.' : 'Thêm môn học đầu tiên để bắt đầu sắp xếp hành trình của mình.'}</T><Button label={semesterCourses.length ? 'Xem tất cả môn' : 'Thêm môn đầu tiên'} icon={semesterCourses.length ? 'refresh-outline' : 'add'} onPress={() => { if (semesterCourses.length) { setFilter('Tất cả'); setQuery(''); } else setSheet('new-course'); }} /></Card>}
    {list.length > 0 && <Button label="Thêm môn học mới" icon="add-circle-outline" onPress={() => setSheet('new-course')} />}
    {(sheet === 'new-semester' || sheet === 'edit-semester') && <SemesterForm item={sheet === 'edit-semester' ? semester : undefined} onClose={() => setSheet(null)} onSaved={id => { if (id !== semester.id) selectSemester(id); setSheet(null); }} />}
    {(sheet === 'new-course' || sheet === 'edit-course') && <CourseForm item={sheet === 'edit-course' ? openedCourse : undefined} semesterId={semester.id} onClose={() => setSheet(sheet === 'edit-course' && openedCourse ? 'detail' : null)} onSaved={(id, targetSemesterId) => { if (targetSemesterId !== semester.id) selectSemester(targetSemesterId); if (sheet === 'new-course') setDetailSection('Tổng quan'); setCourseId(id); setSheet('detail'); }} onDeleted={() => { setCourseId(null); setSheet(null); }} />}
    {sheet === 'detail' && openedCourse && <Sheet title="Chi tiết môn học" scrollKey={`course-${courseId}-${detailSection}`} onClose={() => setSheet(null)}><CourseDetail section={detailSection} setSection={setDetailSection} course={openedCourse} onEdit={() => setSheet('edit-course')} onClose={() => setSheet(null)} onTask={item => { setTaskItem(item); setSheet('task'); }} onClass={item => { setClassItem(item); setSheet('class'); }} onExam={id => { setExamId(id); setSheet('exam'); }} onGrades={() => setSheet('grades')} /></Sheet>}
    {sheet === 'task' && openedCourse && (taskItem ? <TaskDialog key={taskItem.id} taskId={taskItem.id} onClose={() => setSheet('detail')} /> : <TaskForm initialCourseId={openedCourse.id} onClose={() => setSheet('detail')} />)}
    {sheet === 'class' && openedCourse && (classItem ? <ClassDialog id={classItem.id} onClose={() => setSheet('detail')} /> : <ClassForm initialCourseId={openedCourse.id} onClose={() => setSheet('detail')} />)}
    {sheet === 'exam' && examId && <ExamDialog id={examId} onClose={() => setSheet('detail')} />}
    {sheet === 'grades' && openedCourse && <GradeEditor courseId={openedCourse.id} onClose={() => setSheet('detail')} />}
  </FlowScope>;
}

function CourseDetail({ section, setSection, course, onEdit, onClose, onTask, onClass, onExam, onGrades }: { section: string; setSection: (s: string) => void; course: Course; onEdit: () => void; onClose: () => void; onTask: (item?: Task) => void; onClass: (item?: ClassItem) => void; onExam: (id: string) => void; onGrades: () => void }) {
  const { tasks, classes, exams, semesters, prepareFocus } = useApp();
  const colors = courseColors[course.color];
  const semester = semesters.find(s => s.id === course.semesterId);
  const linkedTasks = tasks.filter(t => t.courseId === course.id).sort((a,b) => a.deadline.localeCompare(b.deadline));
  const linkedClasses = classes.filter(c => c.courseId === course.id).sort((a,b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start));
  const linkedExams = exams.filter(e => e.courseId === course.id);
  return <>
    <Card style={{ backgroundColor: colors.bg, borderColor: colors.bg, gap: 12 }}><Row between><Badge label={`${course.code} · ${course.credits} tín chỉ`} bg="#FFFFFFAA" color={colors.ink} /><IconButton name="create-outline" label="Chỉnh sửa môn học" onPress={onEdit} bg="#FFFFFFBB" color={colors.ink} /></Row><T style={{ fontFamily: F.extra, fontSize: 23, lineHeight: 33, color: colors.ink, letterSpacing: -0.6 }}>{course.name}</T><Row style={{ flexWrap: 'wrap' }}><Badge label={course.status} bg="#FFFFFFAA" color={colors.ink} /><T style={{ fontSize: 11, color: colors.ink }}>{semester?.name} · {semester?.academicYear}</T></Row></Card>
    <Segments values={['Tổng quan', 'Lịch học', 'Bài tập', 'Điểm số']} value={section} onChange={setSection} />
    {section === 'Tổng quan' && <>
      <Card style={{ gap: 15 }}><Row><IconTile name="person-outline" size={38} bg={C.canvas} /><View style={S.grow}><T style={S.small}>Giảng viên</T><T style={{ fontFamily: F.semi }}>{course.teacher || 'Chưa cập nhật'}</T></View></Row><Row><IconTile name="business-outline" size={38} bg={C.canvas} /><View style={S.grow}><T style={S.small}>Phòng học thường dùng</T><T style={{ fontFamily: F.semi }}>{course.room || 'Chưa cập nhật'}</T></View></Row></Card>
      <T style={{ fontFamily: F.bold, fontSize: 16 }}>Về môn học này</T><T style={{ fontSize: 13, lineHeight: 23, color: C.muted }}>{course.description || 'Bạn có thể thêm nội dung và mục tiêu môn học trong phần chỉnh sửa.'}</T>
      <Row style={{ alignItems: 'stretch' }}><Card style={[S.grow, { backgroundColor: C.canvas, padding: 14, gap: 5 }]}><Icon name="calendar-outline" /><T style={{ fontFamily: F.extra, fontSize: 24 }}>{linkedClasses.reduce((sum,c) => sum + c.weekdays.length, 0)}</T><T style={S.small}>ca học mỗi tuần</T></Card><Card style={[S.grow, { backgroundColor: C.canvas, padding: 14, gap: 5 }]}><Icon name="clipboard-outline" /><T style={{ fontFamily: F.extra, fontSize: 24 }}>{linkedTasks.filter(t => t.status !== 'Hoàn thành').length}</T><T style={S.small}>bài tập cần làm</T></Card></Row>
      {linkedExams.map(exam => <Pressable key={exam.id} accessibilityRole="button" accessibilityLabel={`Xem kỳ thi môn ${exam.course}`} onPress={() => onExam(exam.id)}><Card style={{ backgroundColor: C.amberSoft, gap: 6 }}><Row><Icon name="calendar-outline" color={C.amber} /><T style={{ fontFamily: F.bold, color: C.amber }}>Lịch thi · {dueLabel(exam.date)}</T></Row><T style={{ fontSize: 12 }}>{dateLabel(exam.date)} · {exam.time} · {exam.room}</T><T style={S.small}>{exam.type}</T></Card></Pressable>)}
      <Button label="Tập trung môn này" icon="timer-outline" onPress={() => { prepareFocus({ courseId: course.id }); }} /><T style={{ fontSize: 10, color: C.muted, textAlign: 'center' }}>Chọn môn sẽ đặt lại thời gian của phiên tập trung.</T>
    </>}
    {section === 'Lịch học' && <>
      <Row between><T style={{ fontFamily: F.bold }}>Các ca học trong tuần</T><IconButton name="add" label="Thêm ca học cho môn" onPress={() => onClass()} /></Row>
      {linkedClasses.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Sửa ca ${item.start}`} onPress={() => onClass(item)}><Card style={{ backgroundColor: C.canvas, gap: 12 }}><Row between><Badge label={weekdaysLabel(item.weekdays)} /><Icon name="create-outline" size={17} /></Row><T style={{ fontFamily: F.bold, fontSize: 20 }}>{item.start} – {item.end}</T><T style={S.small}>Phòng {item.room} · {item.teacher}</T></Card></Pressable>)}
      {!linkedClasses.length && <Card style={{ backgroundColor: C.canvas, gap: 10 }}><IconTile name="calendar-outline" /><T style={{ fontFamily: F.bold }}>Chưa có ca học</T><T style={S.small}>Thêm lịch để biết khi nào và ở đâu bạn sẽ học môn này.</T><Button label="Thêm lịch cho môn" secondary onPress={() => onClass()} /></Card>}
    </>}
    {section === 'Bài tập' && <>
      <Row between><T style={{ fontFamily: F.bold }}>Bài tập của môn</T><IconButton name="add" label="Thêm bài tập cho môn" onPress={() => onTask()} /></Row>
      {linkedTasks.map(task => <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Mở bài tập ${task.title}`} onPress={() => onTask(task)}><Card style={{ backgroundColor: C.canvas, gap: 10 }}><Row between><Badge label={task.status} color={task.status === 'Hoàn thành' ? C.green : C.primary} bg={task.status === 'Hoàn thành' ? C.greenSoft : C.soft} /><T style={{ fontSize: 10, color: C.muted }}>{dueLabel(task.deadline)}</T></Row><T style={{ fontFamily: F.bold, fontSize: 15 }}>{task.title}</T><T style={S.small}>Hạn nộp {dateLabel(task.deadline)} · Ưu tiên {task.priority.toLowerCase()}</T></Card></Pressable>)}
      {!linkedTasks.length && <Card style={{ backgroundColor: C.canvas, gap: 10 }}><IconTile name="clipboard-outline" /><T style={{ fontFamily: F.bold }}>Chưa có bài tập cho môn này</T><T style={S.small}>Ghi lại yêu cầu và deadline ngay khi nhận bài nhé.</T><Button label="Tạo bài tập cho môn" secondary onPress={() => onTask()} /></Card>}
    </>}
    {section === 'Điểm số' && <GradePanel courseId={course.id} onEdit={onGrades} />}
  </>;
}
