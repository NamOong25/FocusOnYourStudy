import { useFeedback } from '../shared/feedback/FeedbackProvider';
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { Course, Semester, initialCourses, initialSemesters } from '../features/academics/academic';
import { StudySession, TaskExtras, initialTaskExtras } from '../features/study/learning';
import { ClassItem, ClassException, Exam, classOccurrences, isClassDate } from '../features/schedule/calendar';
import { addDays, dateKey, today } from '../shared/utils/dates';
import { CourseGrades, GradeBook, GradeRules, defaultRules, initialGradeBook, autoLinkAttempts } from '../features/grades/grades';
import { AccountPreferences, StudentProfile, initialPreferences, initialProfile } from '../features/account/account';
import { AiProposal, proposalSessions, validateProposal } from '../features/assistant/aiPlanner';
import { AppRoute, ScheduleMode, Tab, homeRoute, previousRoute, pushRoute } from '../navigation/navigationState';
export { addDays, dateKey, dateLabel, dueLabel, isValidDate, parseDay, today } from '../shared/utils/dates';

export type { Tab } from '../navigation/navigationState';
export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Hoàn thành';
export type Task = { id: string; title: string; courseId: string; course: string; deadline: string; priority: 'Cao' | 'Trung bình'; status: TaskStatus; notes: string };
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
const durations = [25 * 60, 5 * 60, 15 * 60];
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
  const [semesters, setSemesters] = useState(empty ? [] : initialSemesters);
  const [courseCatalog, setCourseCatalog] = useState(empty ? [] : initialCourses);
  const [storedGradeBook, setGradeBook] = useState<GradeBook>(empty ? {} : initialGradeBook);
  const gradeBook = React.useMemo(() => autoLinkAttempts(courseCatalog, storedGradeBook, semesters), [courseCatalog, storedGradeBook, semesters]);
  const [gradeRules, setGradeRules] = useState<GradeRules>(defaultRules);
  const saveGrades = (id: string, record: CourseGrades) => setGradeBook(v => ({ ...v, [id]: record }));
  const [tasks, setTasks] = useState(empty ? [] : initialTasks);
  const [classes, setClasses] = useState(empty ? [] : initialClasses);
  const [classExceptions, setClassExceptions] = useState<ClassException[]>([]);
  const [exams, setExams] = useState(empty ? [] : initialExams);
  const [routeTrail, setRouteTrail] = useState<AppRoute[]>([homeRoute]);
  const route = routeTrail[routeTrail.length - 1]!; const tab = route.tab; const scheduleMode = route.scheduleMode;
  const setTab = (next: Tab) => setRouteTrail(v => next === 'home' ? [{ ...v[v.length - 1]!, tab: 'home' }] : pushRoute(v, { ...v[v.length - 1]!, tab: next }));
  const setScheduleMode = (next: ScheduleMode) => setRouteTrail(v => pushRoute(v, { tab: 'schedule', scheduleMode: next }));
  const goBackRoute = () => setRouteTrail(previousRoute);
  const [focusCourseId, setFocusCourseId] = useState(empty ? '' : 'course-dsa');
  useEffect(() => { if (!courseCatalog.some(c => c.id === focusCourseId) && courseCatalog[0]) setFocusCourseId(courseCatalog[0].id); }, [courseCatalog, focusCourseId]);
  const focusCourse = courseCatalog.find(c => c.id === focusCourseId)?.name ?? 'Chọn môn học';
  const [mode, setModeState] = useState(0);
  const [seconds, setSeconds] = useState(durations[0]!);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [completed, setCompleted] = useState(empty ? 0 : 3);
  const [history, setHistory] = useState<string[]>([]);

  const [aiSessionIds, setAiSessionIds] = useState<string[]>([]);
  const appliedAiProposals = useRef(new Set<string>());
  const [studySessions, setStudySessions] = useState(empty ? [] : initialStudySessions);
  const [taskExtras, setTaskExtras] = useState<Record<string, TaskExtras>>(empty ? {} : initialTaskExtras);
  const [focusTaskId, setFocusTaskId] = useState<string | undefined>();
  const [focusSessionId, setFocusSessionId] = useState<string | undefined>();
  const lastCompletedEnd = useRef<number | null>(null);
  // Time derives from a timestamp, including after the app/tab returns to foreground.
  useEffect(() => {
    const tick = () => {
      if (!endsAt) return;
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0 && lastCompletedEnd.current !== endsAt) {
        lastCompletedEnd.current = endsAt;
        setEndsAt(null);
        if (mode === 0) {
          setCompleted(v => v + 1);
          const focusedTitle = studySessions.find(s => s.id === focusSessionId)?.title ?? tasks.find(t => t.id === focusTaskId)?.title;
          setHistory(v => [`${focusedTitle ? focusedTitle + ' · ' : ''}${focusCourse} • 25 phút`, ...v]);
          if (focusSessionId) setStudySessions(v => v.map(s => s.id === focusSessionId ? { ...s, focusedSeconds: s.focusedSeconds + 1500, status: s.focusedSeconds + 1500 >= s.duration * 60 ? 'Hoàn thành' : 'Đang học' } : s));
        }
        setToast(mode === 0 ? 'Hoàn thành một phiên. Nghỉ một chút nhé!' : 'Hết giờ nghỉ. Sẵn sàng học tiếp!');
      }
    };
    tick(); const id = setInterval(tick, 500); const listener = AppState.addEventListener('change', s => { if (s === 'active') tick(); });
    return () => { clearInterval(id); listener.remove(); };
  }, [endsAt, mode, focusCourse, focusSessionId, focusTaskId, studySessions, tasks]);
  const setMode = (n: number) => { setModeState(n); setEndsAt(null); setSeconds(durations[n]!); };
  const toggleTimer = () => { if (endsAt) { setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))); setEndsAt(null); } else { const duration = seconds || durations[mode]!; setSeconds(duration); lastCompletedEnd.current = null; setEndsAt(Date.now() + duration * 1000); if (mode === 0 && focusSessionId) setStudySessions(v => v.map(s => s.id === focusSessionId && s.status !== 'Hoàn thành' ? { ...s, status: 'Đang học' } : s)); } };
  const resetTimer = () => { setEndsAt(null); setSeconds(durations[mode]!); };
  const saveTask = (task: Task) => setTasks(v => v.some(t => t.id === task.id) ? v.map(t => t.id === task.id ? task : t) : [...v, task]);
  const deleteTask = (id: string) => {
    setTasks(v => v.filter(t => t.id !== id));
    setStudySessions(v => v.map(s => s.taskId === id ? { ...s, taskId: undefined } : s));
    setTaskExtras(v => { const next = { ...v }; delete next[id]; return next; });
    if (focusTaskId === id) setFocusTaskId(undefined);
  };
  const updateTaskExtras = (id: string, extras: TaskExtras) => setTaskExtras(v => ({ ...v, [id]: extras }));
  const saveStudySession = (session: StudySession) => {
    setStudySessions(v => v.some(s => s.id === session.id) ? v.map(s => s.id === session.id ? session : s) : [...v, session]);
    if (focusSessionId === session.id && (session.status === 'Hoàn thành' || session.courseId !== focusCourseId || session.taskId !== focusTaskId)) {
      setEndsAt(null); setSeconds(durations[mode]!); setFocusCourseId(session.courseId); setFocusTaskId(session.taskId);
    }
  };
  const applyAiProposal = (proposal: AiProposal) => {
    if (appliedAiProposals.current.has(proposal.id)) return { ok: false, message: 'Đề xuất này đã được duyệt.' };
    const issues = validateProposal(proposal, { courseCatalog, tasks, classes, classExceptions, exams, studySessions });
    if (issues.length) return { ok: false, message: issues[0]!.message };
    const sessions = proposalSessions(proposal); const ids = new Set(sessions.map(s => s.id));
    appliedAiProposals.current.add(proposal.id);
    setStudySessions(v => [...v.filter(s => !ids.has(s.id)), ...sessions]);
    setAiSessionIds(v => [...new Set([...v, ...ids])]);
    return { ok: true, message: '' };
  };
  const deleteStudySession = (id: string) => {
    setStudySessions(v => v.filter(s => s.id !== id));
    if (focusSessionId === id) { setFocusSessionId(undefined); setFocusTaskId(undefined); setEndsAt(null); setSeconds(durations[mode]!); }
  };
  const completeStudySession = (id: string) => {
    setStudySessions(v => v.map(s => s.id === id ? { ...s, status: s.status === 'Hoàn thành' ? 'Đã lên lịch' : 'Hoàn thành' } : s));
    if (focusSessionId === id) { setEndsAt(null); setSeconds(durations[mode]!); }
  };
  const prepareFocus = ({ courseId, taskId, sessionId }: { courseId: string; taskId?: string; sessionId?: string }) => {
    setFocusCourseId(courseId); setFocusTaskId(taskId); setFocusSessionId(sessionId);
    setEndsAt(null); setModeState(0); setSeconds(durations[0]!); setTab('focus');
  };
  const saveClass = (item: ClassItem) => {
    setClasses(v => v.some(c => c.id === item.id) ? v.map(c => c.id === item.id ? item : c) : [...v, item]);
    setClassExceptions(v => v.filter(e => e.seriesId !== item.id || isClassDate(item, e.date)));
  };
  const deleteClass = (id: string) => { setClasses(v => v.filter(c => c.id !== id)); setClassExceptions(v => v.filter(e => e.seriesId !== id)); };
  const saveClassException = (item: ClassException) => setClassExceptions(v => [...v.filter(e => !(e.seriesId === item.seriesId && e.date === item.date)), item]);
  const restoreClassOccurrence = (seriesId: string, date: string) => setClassExceptions(v => v.filter(e => !(e.seriesId === seriesId && e.date === date)));
  const getClassesOn = (date: string) => classOccurrences(date, classes, classExceptions);
  const saveExam = (item: Exam) => setExams(v => (v.some(e => e.id === item.id) ? v.map(e => e.id === item.id ? item : e) : [...v, item]).sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)));
  const deleteExam = (id: string) => setExams(v => v.filter(e => e.id !== id));
  const saveSemester = (semester: Semester) => setSemesters(v => v.some(s => s.id === semester.id) ? v.map(s => s.id === semester.id ? semester : s) : [...v, semester]);
  const saveCourse = (course: Course) => {
    const previous = courseCatalog.find(c => c.id === course.id);
    setCourseCatalog(v => previous ? v.map(c => c.id === course.id ? course : c) : [...v, course]);
    // IDs keep links intact when a name/code changes or the same subject occurs in another semester.
    setTasks(v => v.map(t => t.courseId === course.id ? { ...t, course: course.name } : t));
    setClasses(v => v.map(c => c.courseId === course.id ? { ...c, title: course.name, teacher: previous && c.teacher === previous.teacher ? course.teacher : c.teacher } : c));
    setExams(v => v.map(e => e.courseId === course.id ? { ...e, course: course.name } : e));
  };
  const deleteCourse = (id: string) => {
    if (gradeBook[id]?.parts.some(p => p.score !== null) || gradeBook[id]?.previousCourseId || Object.values(gradeBook).some(g => g.previousCourseId === id)) return false;
    if (tasks.some(t => t.courseId === id) || classes.some(c => c.courseId === id) || exams.some(e => e.courseId === id) || studySessions.some(s => s.courseId === id)) return false;
    setCourseCatalog(v => v.filter(c => c.id !== id));
    setGradeBook(v => { const next = { ...v }; delete next[id]; return next; });
    if (focusCourseId === id) { setEndsAt(null); setSeconds(durations[mode]!); setFocusCourseId(courseCatalog.find(c => c.id !== id)?.id ?? ''); }
    return true;
  };
  return { isEmptyWorkspace: empty, route, routeTrail, scheduleMode, setScheduleMode, goBackRoute, profile, saveProfile, accountPreferences, setAccountPreferences, previewSignedIn, setPreviewSignedIn, gradeBook, gradeRules, setGradeRules, saveGrades, semesters, saveSemester, courseCatalog, saveCourse, deleteCourse, tasks, setTasks, deleteTask, taskExtras, updateTaskExtras, studySessions, setStudySessions, saveStudySession, deleteStudySession, completeStudySession, prepareFocus, focusTaskId, focusSessionId, classes, setClasses, classExceptions, getClassesOn, saveClassException, restoreClassOccurrence, deleteClass, saveExam, deleteExam, exams, setExams, tab, setTab, focusCourse, focusCourseId, setFocusCourseId, mode, setMode, seconds, running: endsAt !== null, toggleTimer, resetTimer, completed, history, toast, setToast, saveTask, saveClass, aiSessionIds, applyAiProposal, timerProgress: 1 - seconds / durations[mode]! };
}
const Context = createContext<ReturnType<typeof usePrototype> | null>(null);
export function PrototypeProvider({ children, empty = false }: { children: ReactNode; empty?: boolean }) { const state = usePrototype(empty); return <Context.Provider value={state}>{children}</Context.Provider>; }
export function useApp() { const value = useContext(Context); if (!value) throw new Error('Missing PrototypeProvider'); return value; }
