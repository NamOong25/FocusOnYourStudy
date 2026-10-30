import { useFeedback } from '../shared/feedback/FeedbackProvider';
import { useServerSemesters } from '../features/academics/api/useServerSemesters';
import { useServerStudySessions } from '../features/study/api/useServerStudySessions';
import { focusLinkInvalid, withLocalFocus } from '../features/study/studyLinks';
import { useServerAssignments } from '../features/assignments/api/useServerAssignments';
import { reconcileAssignmentLinks } from '../features/assignments/assignmentLinks';
import { useServerCourses } from '../features/academics/api/useServerCourses';
import { reconcileCourseLinks } from '../features/academics/courseLinks';
import React, { createContext, useContext, useEffect, useReducer, useRef, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { Course, Semester, initialCourses, initialSemesters } from '../features/academics/academic';
import { StudySession, TaskExtras, initialTaskExtras } from '../features/study/learning';
import { ClassItem, ClassException, Exam, classOccurrences, isClassDate } from '../features/schedule/calendar';
import { addDays, dateKey, today } from '../shared/utils/dates';
import { CourseGrades, GradeBook, GradeRules, defaultRules, initialGradeBook, autoLinkAttempts, hasGradeData } from '../features/grades/grades';
import { AccountPreferences, StudentProfile, initialPreferences, initialProfile } from '../features/account/account';
import { AiProposal, proposalSessions, validateProposal } from '../features/assistant/aiPlanner';
import { AppRoute, ScheduleMode, Tab, homeRoute, previousRoute, pushRoute } from '../navigation/navigationState';
import type { AssignmentStatisticsLink } from '../features/assignments/assignmentStatisticsLink';
import { createFocusState, creditFocusRecords, focusDurations, focusReducer, sampleFocusRecords } from '../features/focus/focus';
export { addDays, dateKey, dateLabel, dueLabel, isValidDate, parseDay, today } from '../shared/utils/dates';

export type { Tab } from '../navigation/navigationState';
import type {Task} from '../features/assignments/assignments';
export type {Task,TaskStatus} from '../features/assignments/assignments';
export type { ClassItem, ClassException, Exam } from '../features/schedule/calendar';
export const courses = ['Cấu trúc dữ liệu & Giải thuật', 'Lập trình Hướng đối tượng', 'Cơ sở dữ liệu', 'Mạng máy tính', 'Toán rời rạc'];
export function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
export const initialTasks: Task[] = [
  { id: 't1', title: 'Đồ án cuối kỳ Web App', courseId: 'course-oop', course: courses[1]!, deadline: dateKey(today), priority: 'Cao', status: 'Đang làm', notes: 'Hoàn thiện giao diện trang chủ và luồng đăng nhập. Kiểm tra lại bản trình bày trước khi nộp.' },
  { id: 't2', title: 'Báo cáo bài tập lớn Cơ sở dữ liệu', courseId: 'course-db', course: courses[2]!, deadline: dateKey(addDays(today, 1)), priority: 'Cao', status: 'Chưa làm', notes: 'Thiết kế ERD, chuẩn hóa các bảng và viết truy vấn SQL. Làm cùng nhóm 4.' },
  { id: 't3', title: 'Xây dựng Socket TCP', courseId: 'course-network', course: courses[3]!, deadline: dateKey(addDays(today, 3)), priority: 'Trung bình', status: 'Đang làm', notes: 'Hiện thực hệ thống Server/Client đa luồng, hỗ trợ gửi nhận gói tin JSON.' },
  { id: 't4', title: 'Ôn tập chương Cây nhị phân', courseId: 'course-dsa', course: courses[0]!, deadline: dateKey(addDays(today, 5)), priority: 'Trung bình', status: 'Hoàn thành', notes: 'Đã hoàn thành 10 bài luyện tập.' },
];
const initialClasses: ClassItem[] = [

  { id: 'c1', courseId: 'course-oop', title: courses[1]!, weekday: today.getDay(), weekdays: [today.getDay()], startsOn: dateKey(addDays(today, -30)), endsOn: dateKey(addDays(today, 90)), reminderMinutes: 15, start: '08:00', end: '10:30', room: 'A2.301', teacher: 'TS. Lê Văn Tuấn' },
  { id: 'c2', courseId: 'course-dsa', title: courses[0]!, weekday: today.getDay(), weekdays: [today.getDay()], startsOn: dateKey(addDays(today, -30)), endsOn: dateKey(addDays(today, 90)), reminderMinutes: 15, start: '13:30', end: '16:00', room: 'Lab 4', teacher: 'ThS. Trần Mai' },
  { id: 'c3', courseId: 'course-db', title: courses[2]!, weekday: (today.getDay() + 1) % 7, weekdays: [(today.getDay() + 1) % 7], startsOn: dateKey(addDays(today, -30)), endsOn: dateKey(addDays(today, 90)), reminderMinutes: 15, start: '07:30', end: '10:00', room: 'B1.204', teacher: 'ThS. Hoàng Linh' },
  { id: 'c4', courseId: 'course-network', title: courses[3]!, weekday: (today.getDay() + 3) % 7, weekdays: [(today.getDay() + 3) % 7], startsOn: dateKey(addDays(today, -30)), endsOn: dateKey(addDays(today, 90)), reminderMinutes: 15, start: '09:00', end: '11:30', room: 'C3.104', teacher: 'TS. Phạm Đức Minh' },
];
const initialExams: Exam[] = [
  { id: 'e1', courseId: 'course-math', course: courses[4]!, date: dateKey(addDays(today, 6)), time: '08:30', room: 'B202', type: 'Giữa kỳ • Tự luận', end: '10:00', kind: 'Giữa kỳ', format: 'Tự luận', reminder: true, reminderMinutes: [1440, 180], notes: 'Mang theo thẻ sinh viên và máy tính được phép sử dụng.' },
  { id: 'e2', courseId: 'course-oop', course: courses[1]!, date: dateKey(addDays(today, 11)), time: '14:00', room: 'Phòng máy 3', type: 'Cuối kỳ • Thực hành', end: '16:00', kind: 'Cuối kỳ', format: 'Thực hành', reminder: false, reminderMinutes: [1440, 180], notes: 'Kiểm tra tài khoản phòng máy trước ngày thi.' },
];
const initialStudySessions: StudySession[] = [
  { id: 'study-1', title: 'Hoàn thiện bố cục trang chủ', courseId: 'course-oop', taskId: 't1', date: dateKey(today), start: '18:00', duration: 45, notes: 'Bắt đầu từ thẻ tổng quan, sau đó đến danh sách công việc.', status: 'Đã lên lịch', focusedSeconds: 0 },
  { id: 'study-2', title: 'Kiểm tra luồng và bản trình bày', courseId: 'course-oop', taskId: 't1', date: dateKey(today), start: '20:00', duration: 25, notes: 'Dành một phiên để rà soát lần cuối trước khi nộp.', status: 'Đã lên lịch', focusedSeconds: 0 },
  { id: 'study-3', title: 'Đọc lại kiến thức cây nhị phân', courseId: 'course-dsa', date: dateKey(today), start: '21:00', duration: 25, notes: 'Tự ôn tập, không gắn với bài phải nộp.', status: 'Đã lên lịch', focusedSeconds: 0 },
  { id: 'study-4', title: 'Phác thảo ERD cho báo cáo', courseId: 'course-db', taskId: 't2', date: dateKey(addDays(today, 1)), start: '19:00', duration: 45, notes: '', status: 'Đã lên lịch', focusedSeconds: 0 },
];
function usePrototype(empty: boolean) {
  const { notice, showNotice: setToast } = useFeedback();
  const toast = notice?.message ?? "";
  const [profile, saveProfile] = useState<StudentProfile>(initialProfile);
  const [accountPreferences, setAccountPreferences] = useState<AccountPreferences>(initialPreferences);
  const [previewSignedIn, setPreviewSignedIn] = useState(true);
  const [previewSemesters, setSemesters] = useState(empty ? [] : initialSemesters);
  const semesterConnection = useServerSemesters();
  const semesters = semesterConnection?.semesters ?? previewSemesters;
  const [academicSemesterId, setAcademicSemesterId] = useState('sem-5');
  const [assignmentDestination, setAssignmentDestination] = useState<{ key: string; link: AssignmentStatisticsLink } | null>(null);
  const [scheduleRevision, setScheduleRevision] = useState(0);
  const invalidateSchedule = React.useCallback(() => setScheduleRevision(value => value + 1), []);
  const [scheduleDestination, setScheduleDestination] = useState<{ key: string; semesterId: string; date: string } | null>(null);
  const consumeScheduleDestination = React.useCallback((key: string) => setScheduleDestination(value => value?.key === key ? null : value), []);
  useEffect(() => { setAcademicSemesterId(id => semesters.some(s => s.id === id) ? id : semesters.find(s => s.status === 'Đang học')?.id ?? semesters[0]?.id ?? ''); }, [semesters]);
  const [previewCourses, setCourseCatalog] = useState(empty ? [] : initialCourses);
  const courseConnection = useServerCourses();
  const courseCatalog = courseConnection?.courses ?? previewCourses;
  const [storedGradeBook, setGradeBook] = useState<GradeBook>(empty ? {} : initialGradeBook);
  const gradeBook = React.useMemo(() => autoLinkAttempts(courseCatalog, storedGradeBook, semesters), [courseCatalog, storedGradeBook, semesters]);
  const [gradeRules, setGradeRules] = useState<GradeRules>(defaultRules);
  const saveGrades = (id: string, record: CourseGrades) => {
    if(semesterConnection)throw new Error('Điểm tài khoản phải được lưu qua API, không lưu vào dữ liệu thử.');
    setGradeBook(v => ({ ...v, [id]: record }));
  };
  const [previewTasks, setPreviewTasks] = useState(empty ? [] : initialTasks);
  const assignmentSource = useServerAssignments();
  const serverAssignments = assignmentSource?.tasks;
  const tasks = React.useMemo(() => serverAssignments ? serverAssignments.map(task => ({ ...task, course: courseCatalog.find(c => c.id === task.courseId)?.name ?? 'Môn chưa được tải' })) : previewTasks, [serverAssignments, courseCatalog, previewTasks]);
  const [classes, setClasses] = useState(empty ? [] : initialClasses);
  const [classExceptions, setClassExceptions] = useState<ClassException[]>([]);
  const [exams, setExams] = useState(empty ? [] : initialExams);
  const [routeTrail, setRouteTrail] = useState<AppRoute[]>([homeRoute]);
  const route = routeTrail[routeTrail.length - 1]!; const tab = route.tab; const scheduleMode = route.scheduleMode;
  const setTab = (next: Tab) => setRouteTrail(v => next === 'home' ? [{ ...v[v.length - 1]!, tab: 'home' }] : pushRoute(v, { ...v[v.length - 1]!, tab: next }));
  const setScheduleMode = (next: ScheduleMode) => { if (next === 'Bài tập') setAssignmentDestination(null); setRouteTrail(v => pushRoute(v, { tab: 'schedule', scheduleMode: next })); };
  const openAssignmentStatistics = (link: AssignmentStatisticsLink) => { setAssignmentDestination({ key: uid(), link }); setRouteTrail(v => pushRoute(v, { tab: 'schedule', scheduleMode: 'Bài tập' })); };
  const openSavedSchedule = (semesterId: string, date = dateKey(new Date())) => { setAcademicSemesterId(semesterId); setScheduleDestination({ key: uid(), semesterId, date }); setScheduleMode('Thời khóa biểu'); };
  const goBackRoute = () => setRouteTrail(previousRoute);
  const [focusCourseId, setFocusCourseId] = useState(empty ? '' : 'course-dsa');
  useEffect(() => { if (!courseCatalog.some(c => c.id === focusCourseId)) setFocusCourseId(courseCatalog[0]?.id ?? ''); }, [courseCatalog, focusCourseId]);
  const focusCourse = courseCatalog.find(c => c.id === focusCourseId)?.name ?? 'Chọn môn học';
  const [focusState, dispatchFocus] = useReducer(focusReducer, empty, isEmpty => createFocusState(isEmpty ? [] : sampleFocusRecords({ courseId: 'course-dsa', courseName: courses[0]!, semesterId: 'sem-5', taskId: 't4', taskTitle: initialTasks[3]!.title }, new Date())));
  const { timer, records: focusRecords, goal: dailyFocusGoal } = focusState;
  const { mode, endsAt } = timer;
  const seconds = Math.ceil(timer.remainingMs / 1000);
  const setDailyFocusGoal = (goal: number) => dispatchFocus({ type: 'goal', goal });

  const [aiSessionIds, setAiSessionIds] = useState<string[]>([]);
  const appliedAiProposals = useRef(new Set<string>());
  const [previewStudySessions, setPreviewStudySessions] = useState(empty ? [] : initialStudySessions);
  const studyConnection = useServerStudySessions();
  const serverStudies = studyConnection?.sessions;
  const studySessions = React.useMemo(() => serverStudies ? withLocalFocus(serverStudies, focusRecords) : previewStudySessions, [serverStudies, focusRecords, previewStudySessions]);
  // Deleting an assignment detaches persisted plans and increments their versions on the server.
  const assignmentConnection = assignmentSource ? { ...assignmentSource,
    reload: async () => { const [rows] = await Promise.all([assignmentSource.reload(), studyConnection?.reload()]); return rows; },
    remove: async (original: Task) => { await assignmentSource.remove(original); try { await studyConnection?.reload(); } catch { /* confirmed deletion; study banner retains the reload error */ } },
  } : null;
  const [taskExtras, setTaskExtras] = useState<Record<string, TaskExtras>>(empty ? {} : initialTaskExtras);
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>();
  const [focusSessionId, setFocusSessionId] = useState<string | undefined>();
  const creditedFocusIds = useRef(new Set<string>());
  const notifiedCompletion = useRef<string | undefined>(undefined);
  // The reducer owns run identity, timestamps and history. It stays mounted across tabs.
  useEffect(() => {
    if (endsAt === null) return;
    const tick = () => dispatchFocus({ type: 'tick', now: Date.now() });
    tick(); const id = setInterval(tick, 500); const listener = AppState.addEventListener('change', s => { if (s === 'active') tick(); });
    return () => { clearInterval(id); listener.remove(); };
  }, [endsAt]);
  useEffect(() => {
    const pending = focusRecords.filter(record => record.source === 'timer' && !creditedFocusIds.current.has(record.id));
    if (!pending.length) return;
    pending.forEach(record => creditedFocusIds.current.add(record.id));
    if (!studyConnection) setPreviewStudySessions(sessions => creditFocusRecords(sessions, pending));
  }, [focusRecords]);
  useEffect(() => {
    const completion = focusState.lastCompletion;
    if (!completion || notifiedCompletion.current === completion.id) return;
    notifiedCompletion.current = completion.id;
    setToast(completion.mode === 0 ? 'Hoàn thành một phiên. Nghỉ một chút nhé!' : 'Hết giờ nghỉ. Sẵn sàng học tiếp!');
  }, [focusState.lastCompletion, setToast]);
  const setMode = (mode: number) => dispatchFocus({ type: 'mode', mode, now: Date.now() });
  const resetTimer = () => dispatchFocus({ type: 'reset', now: Date.now() });
  const lastServerCourses = useRef<Course[]>([]);
  const serverCourses = courseConnection?.loaded ? courseConnection.courses : null;
  useEffect(() => {
    if (!serverCourses) return;
    const reconciled = reconcileCourseLinks(lastServerCourses.current, serverCourses, { tasks, classes, exams, studySessions, gradeBook: storedGradeBook });
    lastServerCourses.current = serverCourses;
    if (!assignmentConnection) setPreviewTasks(reconciled.tasks);
    setClasses(reconciled.classes); setExams(reconciled.exams); if (!studyConnection) setPreviewStudySessions(reconciled.studySessions); setGradeBook(reconciled.gradeBook);
    setClassExceptions(v => v.filter(e => reconciled.classes.some(c => c.id === e.seriesId)));

    if (reconciled.invalidated.has(focusCourseId)) { resetTimer(); setFocusTaskId(undefined); setFocusSessionId(undefined); }
    if (reconciled.cleared) setToast('Môn đã đổi học kỳ hoặc bị xóa ở nơi khác. Lịch, buổi tự học và điểm thử liên quan trong phiên này đã được đặt lại.');
    // Reconcile only when a confirmed server catalogue changes, never on trial edits.
  }, [serverCourses]);
  useEffect(() => {
    if (!assignmentConnection?.loaded) return;
    const result = reconcileAssignmentLinks(tasks, studySessions);
    if (!studyConnection && result.detached.size) {
      setPreviewStudySessions(result.studySessions);
      setToast('Bài tập đã đổi môn, đổi hạn hoặc bị xóa. Buổi tự học liên quan được giữ và gỡ liên kết.');
    }
    setTaskExtras(previous => {
      const entries = Object.entries(previous).filter(([id]) => tasks.some(task => task.id === id));
      return entries.length === Object.keys(previous).length ? previous : Object.fromEntries(entries);
    });
    if (focusTaskId && (result.detached.has(focusTaskId) || !tasks.some(task => task.id === focusTaskId && task.courseId === focusCourseId))) {
      resetTimer(); setFocusTaskId(undefined); setFocusSessionId(undefined);
    }
  }, [tasks, assignmentConnection?.loaded, studySessions, focusTaskId, focusCourseId]);
  useEffect(() => {
    if (studyConnection?.loaded && focusSessionId && focusLinkInvalid(studySessions, focusSessionId, focusCourseId, focusTaskId)) {
      resetTimer(); setFocusSessionId(undefined); setFocusTaskId(undefined);
    }
  }, [serverStudies, focusSessionId, focusCourseId, focusTaskId, studyConnection?.loaded]);
  const toggleTimer = () => {
    if (!focusCourseId) return;
    dispatchFocus({ type: 'toggle', now: Date.now(), id: uid(), context: {
      courseId: focusCourseId, courseName: focusCourse, semesterId: courseCatalog.find(course => course.id === focusCourseId)?.semesterId, taskId: focusTaskId,
      taskTitle: tasks.find(task => task.id === focusTaskId)?.title,
      studySessionId: focusSessionId, studyTitle: studySessions.find(session => session.id === focusSessionId)?.title,
    } });
    if (!studyConnection && endsAt === null && mode === 0 && focusSessionId) setPreviewStudySessions(v => v.map(s => s.id === focusSessionId && s.status !== 'Hoàn thành' ? { ...s, status: 'Đang học' } : s));
  };
  const saveTask = (task: Task) => {
    if (assignmentConnection) throw new Error('Use assignment API for authenticated accounts');
    setPreviewTasks(v => v.some(t => t.id === task.id) ? v.map(t => t.id === task.id ? task : t) : [...v, task]);
  };
  const deleteTask = (id: string) => {
    if (assignmentConnection) throw new Error('Use assignment API for authenticated accounts');
    setPreviewTasks(v => v.filter(t => t.id !== id));
    setPreviewStudySessions(v => v.map(s => s.taskId === id ? { ...s, taskId: undefined } : s));
    setTaskExtras(v => { const next = { ...v }; delete next[id]; return next; });
    if (focusTaskId === id) setFocusTaskId(undefined);
  };
  const updateTaskExtras = (id: string, extras: TaskExtras) => setTaskExtras(v => ({ ...v, [id]: extras }));
  const saveStudySession = (session: StudySession) => {
    if (studyConnection) throw new Error('Use study API for authenticated accounts');
    setPreviewStudySessions(v => v.some(s => s.id === session.id) ? v.map(s => s.id === session.id ? session : s) : [...v, session]);
    if (focusSessionId === session.id && (session.status === 'Hoàn thành' || session.courseId !== focusCourseId || session.taskId !== focusTaskId)) {
      resetTimer(); setFocusCourseId(session.courseId); setFocusTaskId(session.taskId);
    }
  };
  const applyAiProposal = (proposal: AiProposal) => {
    if (studyConnection) return { ok: false, message: 'Kế hoạch AI đang ở bước xem trước. Tạo buổi trong Tự học để lưu vào tài khoản.' };
    if (appliedAiProposals.current.has(proposal.id)) return { ok: false, message: 'Đề xuất này đã được duyệt.' };
    const issues = validateProposal(proposal, { courseCatalog, tasks, classes, classExceptions, exams, studySessions });
    if (issues.length) return { ok: false, message: issues[0]!.message };
    const sessions = proposalSessions(proposal); const ids = new Set(sessions.map(s => s.id));
    appliedAiProposals.current.add(proposal.id);
    setPreviewStudySessions(v => [...v.filter(s => !ids.has(s.id)), ...sessions]);
    setAiSessionIds(v => [...new Set([...v, ...ids])]);
    return { ok: true, message: '' };
  };
  const deleteStudySession = (id: string) => {
    if (studyConnection) throw new Error('Use study API for authenticated accounts');
    setPreviewStudySessions(v => v.filter(s => s.id !== id));
    if (focusSessionId === id) { setFocusSessionId(undefined); setFocusTaskId(undefined); resetTimer(); }
  };
  const completeStudySession = (id: string) => {
    if (studyConnection) throw new Error('Use study API for authenticated accounts');
    setPreviewStudySessions(v => v.map(s => s.id === id ? { ...s, status: s.status === 'Hoàn thành' ? 'Đã lên lịch' : 'Hoàn thành' } : s));
    if (focusSessionId === id) resetTimer();
  };
  const prepareFocus = ({ courseId, taskId, sessionId }: { courseId: string; taskId?: string; sessionId?: string }) => {
    setFocusCourseId(courseId); setFocusTaskId(taskId); setFocusSessionId(sessionId);
    setMode(0); setTab('focus');
  };
  const saveClass = (item: ClassItem) => {
    setClasses(v => v.some(c => c.id === item.id) ? v.map(c => c.id === item.id ? item : c) : [...v, item]);
    setClassExceptions(v => v.filter(e => e.seriesId !== item.id || isClassDate(item, e.date)));
  };
  const deleteClass = (id: string) => { setClasses(v => v.filter(c => c.id !== id)); setClassExceptions(v => v.filter(e => e.seriesId !== id)); };
  const saveClassException = (item: ClassException) => setClassExceptions(v => [...v.filter(e => !(e.seriesId === item.seriesId && e.date === item.date)), item]);
  const restoreClassOccurrence = (seriesId: string, date: string) => setClassExceptions(v => v.filter(e => !(e.seriesId === seriesId && e.date === date)));
  const getClassesOn = (date: string) => classOccurrences(date, classes, classExceptions);
  const saveExam = (item: Exam) => {
    if (semesterConnection) throw new Error('Use exam API for authenticated accounts');
    setExams(v => (v.some(e => e.id === item.id) ? v.map(e => e.id === item.id ? item : e) : [...v, item]).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
  };
  const deleteExam = (id: string) => {
    if (semesterConnection) throw new Error('Use exam API for authenticated accounts');
    setExams(v => v.filter(e => e.id !== id));
  };
  const saveSemester = (semester: Semester) => {
    if (semesterConnection) throw new Error('Use semester API for authenticated accounts');
    setSemesters(v => v.some(s => s.id === semester.id) ? v.map(s => s.id === semester.id ? semester : s) : [...v, semester]);
  };
  const saveCourse = (course: Course) => {
    if (courseConnection) throw new Error('Use course API for authenticated accounts');
    const previous = courseCatalog.find(c => c.id === course.id);
    setCourseCatalog(v => previous ? v.map(c => c.id === course.id ? course : c) : [...v, course]);
    // IDs keep links intact when a name/code changes or the same subject occurs in another semester.
    setPreviewTasks(v => v.map(t => t.courseId === course.id ? { ...t, course: course.name } : t));
    setClasses(v => v.map(c => c.courseId === course.id ? { ...c, title: course.name, teacher: previous && c.teacher === previous.teacher ? course.teacher : c.teacher } : c));
    setExams(v => v.map(e => e.courseId === course.id ? { ...e, course: course.name } : e));
  };
  const deleteCourse = (id: string) => {
    if (courseConnection) throw new Error('Use course API for authenticated accounts');
    if (hasGradeData(gradeBook[id]) || gradeBook[id]?.previousCourseId || Object.values(gradeBook).some(g => g.previousCourseId === id)) return false;
    if (tasks.some(t => t.courseId === id) || classes.some(c => c.courseId === id) || exams.some(e => e.courseId === id) || studySessions.some(s => s.courseId === id)) return false;
    setCourseCatalog(v => v.filter(c => c.id !== id));
    setGradeBook(v => { const next = { ...v }; delete next[id]; return next; });
    if (focusCourseId === id) { resetTimer(); setFocusCourseId(courseCatalog.find(c => c.id !== id)?.id ?? ''); }
    return true;
  };
  return { assignmentDestination, openAssignmentStatistics, scheduleRevision, invalidateSchedule, scheduleDestination, consumeScheduleDestination, openSavedSchedule, isEmptyWorkspace: empty, route, routeTrail, scheduleMode, setScheduleMode, goBackRoute, profile, saveProfile, accountPreferences, setAccountPreferences, previewSignedIn, setPreviewSignedIn, gradeBook, gradeRules, setGradeRules, saveGrades, academicSemesterId, setAcademicSemesterId, semesters, semesterConnection, saveSemester, courseCatalog, courseConnection, saveCourse, deleteCourse, tasks, assignmentConnection, deleteTask, taskExtras, updateTaskExtras, studySessions, studyConnection, saveStudySession, deleteStudySession, completeStudySession, prepareFocus, focusTaskId, focusSessionId, classes, setClasses, classExceptions, getClassesOn, saveClassException, restoreClassOccurrence, deleteClass, saveExam, deleteExam, exams, setExams, tab, setTab, focusCourse, focusCourseId, setFocusCourseId, mode, setMode, seconds, running: endsAt !== null, toggleTimer, resetTimer, focusRecords, dailyFocusGoal, setDailyFocusGoal, toast, setToast, saveTask, saveClass, aiSessionIds, applyAiProposal, timerProgress: 1 - seconds / focusDurations[mode]! };
}
const Context = createContext<ReturnType<typeof usePrototype> | null>(null);
export function PrototypeProvider({ children, empty = false }: { children: ReactNode; empty?: boolean }) { const state = usePrototype(empty); return <Context.Provider value={state}>{children}</Context.Provider>; }
export function useApp() { const value = useContext(Context); if (!value) throw new Error('Missing PrototypeProvider'); return value; }
