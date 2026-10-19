import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { Course, Semester, initialCourses, initialSemesters } from './academic';
import { StudySession, TaskExtras, initialTaskExtras } from './learning';

export type Tab = 'home' | 'schedule' | 'focus' | 'stats' | 'ai';
export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Hoàn thành';
export type Task = { id: string; title: string; courseId: string; course: string; deadline: string; priority: 'Cao' | 'Trung bình'; status: TaskStatus; notes: string };
export type ClassItem = { id: string; courseId: string; title: string; weekday: number; start: string; end: string; room: string; teacher: string };
export const courses = ['Cấu trúc dữ liệu & Giải thuật', 'Lập trình Hướng đối tượng', 'Cơ sở dữ liệu', 'Mạng máy tính', 'Toán rời rạc'];
export const today = new Date();
export function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function addDays(d: Date, n: number) { const next = new Date(d); next.setDate(next.getDate() + n); return next; }
export function parseDay(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y!, m! - 1, d!); }
export function dateLabel(s: string) { return parseDay(s).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }); }
export function dueLabel(s: string) { const diff = Math.round((parseDay(s).getTime() - parseDay(dateKey(new Date())).getTime()) / 86400000); return diff < 0 ? `Trễ ${-diff} ngày` : diff === 0 ? 'Hôm nay' : diff === 1 ? 'Ngày mai' : `Còn ${diff} ngày`; }
export function isValidDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDay(s)) === s; }
export function uid() { return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
export const initialTasks: Task[] = [
  { id: 't1', title: 'Đồ án cuối kỳ Web App', courseId: 'course-oop', course: courses[1]!, deadline: dateKey(today), priority: 'Cao', status: 'Đang làm', notes: 'Hoàn thiện giao diện trang chủ và luồng đăng nhập. Kiểm tra lại bản trình bày trước khi nộp.' },
  { id: 't2', title: 'Báo cáo bài tập lớn Cơ sở dữ liệu', courseId: 'course-db', course: courses[2]!, deadline: dateKey(addDays(today, 1)), priority: 'Cao', status: 'Chưa làm', notes: 'Thiết kế ERD, chuẩn hóa các bảng và viết truy vấn SQL. Làm cùng nhóm 4.' },
  { id: 't3', title: 'Xây dựng Socket TCP', courseId: 'course-network', course: courses[3]!, deadline: dateKey(addDays(today, 3)), priority: 'Trung bình', status: 'Đang làm', notes: 'Hiện thực hệ thống Server/Client đa luồng, hỗ trợ gửi nhận gói tin JSON.' },
  { id: 't4', title: 'Ôn tập chương Cây nhị phân', courseId: 'course-dsa', course: courses[0]!, deadline: dateKey(addDays(today, 5)), priority: 'Trung bình', status: 'Hoàn thành', notes: 'Đã hoàn thành 10 bài luyện tập.' },
];
const initialClasses: ClassItem[] = [
  { id: 'c1', courseId: 'course-oop', title: courses[1]!, weekday: today.getDay(), start: '08:00', end: '10:30', room: 'A2.301', teacher: 'TS. Lê Văn Tuấn' },
  { id: 'c2', courseId: 'course-dsa', title: courses[0]!, weekday: today.getDay(), start: '13:30', end: '16:00', room: 'Lab 4', teacher: 'ThS. Trần Mai' },
  { id: 'c3', courseId: 'course-db', title: courses[2]!, weekday: (today.getDay() + 1) % 7, start: '07:30', end: '10:00', room: 'B1.204', teacher: 'ThS. Hoàng Linh' },
  { id: 'c4', courseId: 'course-network', title: courses[3]!, weekday: (today.getDay() + 3) % 7, start: '09:00', end: '11:30', room: 'C3.104', teacher: 'TS. Phạm Đức Minh' },
];
export type Exam = { id: string; courseId: string; course: string; date: string; time: string; room: string; type: string; reminder: boolean };
const initialExams: Exam[] = [
  { id: 'e1', courseId: 'course-math', course: courses[4]!, date: dateKey(addDays(today, 6)), time: '08:30', room: 'B202', type: 'Giữa kỳ • Tự luận', reminder: true },
  { id: 'e2', courseId: 'course-oop', course: courses[1]!, date: dateKey(addDays(today, 11)), time: '14:00', room: 'Phòng máy 3', type: 'Cuối kỳ • Thực hành', reminder: false },
];
const durations = [25 * 60, 5 * 60, 15 * 60];
const initialStudySessions: StudySession[] = [
  { id: 'study-1', title: 'Hoàn thiện bố cục trang chủ', courseId: 'course-oop', taskId: 't1', date: dateKey(today), start: '18:00', duration: 45, notes: 'Bắt đầu từ thẻ tổng quan, sau đó đến danh sách công việc.', status: 'Đã lên lịch', focusedSeconds: 0 },
  { id: 'study-2', title: 'Kiểm tra luồng và bản trình bày', courseId: 'course-oop', taskId: 't1', date: dateKey(today), start: '20:00', duration: 25, notes: 'Dành một phiên để rà soát lần cuối trước khi nộp.', status: 'Đã lên lịch', focusedSeconds: 0 },
  { id: 'study-3', title: 'Đọc lại kiến thức cây nhị phân', courseId: 'course-dsa', date: dateKey(today), start: '21:00', duration: 25, notes: 'Tự ôn tập, không gắn với bài phải nộp.', status: 'Đã lên lịch', focusedSeconds: 0 },
  { id: 'study-4', title: 'Phác thảo ERD cho báo cáo', courseId: 'course-db', taskId: 't2', date: dateKey(addDays(today, 1)), start: '19:00', duration: 45, notes: '', status: 'Đã lên lịch', focusedSeconds: 0 },
];
function usePrototype() {
  const [semesters, setSemesters] = useState(initialSemesters);
  const [courseCatalog, setCourseCatalog] = useState(initialCourses);
  const [tasks, setTasks] = useState(initialTasks);
  const [classes, setClasses] = useState(initialClasses);
  const [exams, setExams] = useState(initialExams);
  const [tab, setTab] = useState<Tab>('home');
  const [focusCourseId, setFocusCourseId] = useState('course-dsa');
  const focusCourse = courseCatalog.find(c => c.id === focusCourseId)?.name ?? 'Chọn môn học';
  const [mode, setModeState] = useState(0);
  const [seconds, setSeconds] = useState(durations[0]!);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [completed, setCompleted] = useState(3);
  const [history, setHistory] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [studyPlan, setStudyPlan] = useState<string[]>([]);
  const [studySessions, setStudySessions] = useState(initialStudySessions);
  const [taskExtras, setTaskExtras] = useState<Record<string, TaskExtras>>(initialTaskExtras);
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
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id); }, [toast]);
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
  const saveClass = (item: ClassItem) => setClasses(v => v.some(c => c.id === item.id) ? v.map(c => c.id === item.id ? item : c) : [...v, item]);
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
    if (tasks.some(t => t.courseId === id) || classes.some(c => c.courseId === id) || exams.some(e => e.courseId === id) || studySessions.some(s => s.courseId === id)) return false;
    setCourseCatalog(v => v.filter(c => c.id !== id));
    if (focusCourseId === id) { setEndsAt(null); setSeconds(durations[mode]!); setFocusCourseId(courseCatalog.find(c => c.id !== id)?.id ?? ''); }
    return true;
  };
  return { semesters, saveSemester, courseCatalog, saveCourse, deleteCourse, tasks, setTasks, deleteTask, taskExtras, updateTaskExtras, studySessions, setStudySessions, saveStudySession, deleteStudySession, completeStudySession, prepareFocus, focusTaskId, focusSessionId, classes, setClasses, exams, setExams, tab, setTab, focusCourse, focusCourseId, setFocusCourseId, mode, setMode, seconds, running: endsAt !== null, toggleTimer, resetTimer, completed, history, toast, setToast, saveTask, saveClass, studyPlan, setStudyPlan, timerProgress: 1 - seconds / durations[mode]! };
}
const Context = createContext<ReturnType<typeof usePrototype> | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) { const state = usePrototype(); return <Context.Provider value={state}>{children}</Context.Provider>; }
export function useApp() { const value = useContext(Context); if (!value) throw new Error('Missing PrototypeProvider'); return value; }
