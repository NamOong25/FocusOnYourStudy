import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState } from 'react-native';

export type Tab = 'home' | 'schedule' | 'focus' | 'stats' | 'ai';
export type TaskStatus = 'Chưa làm' | 'Đang làm' | 'Hoàn thành';
export type Task = { id: string; title: string; course: string; deadline: string; priority: 'Cao' | 'Trung bình'; status: TaskStatus; notes: string };
export type ClassItem = { id: string; title: string; weekday: number; start: string; end: string; room: string; teacher: string };
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
  { id: 't1', title: 'Đồ án cuối kỳ Web App', course: courses[1]!, deadline: dateKey(today), priority: 'Cao', status: 'Đang làm', notes: 'Hoàn thiện giao diện trang chủ và luồng đăng nhập. Kiểm tra lại bản trình bày trước khi nộp.' },
  { id: 't2', title: 'Báo cáo bài tập lớn Cơ sở dữ liệu', course: courses[2]!, deadline: dateKey(addDays(today, 1)), priority: 'Cao', status: 'Chưa làm', notes: 'Thiết kế ERD, chuẩn hóa các bảng và viết truy vấn SQL. Làm cùng nhóm 4.' },
  { id: 't3', title: 'Xây dựng Socket TCP', course: courses[3]!, deadline: dateKey(addDays(today, 3)), priority: 'Trung bình', status: 'Đang làm', notes: 'Hiện thực hệ thống Server/Client đa luồng, hỗ trợ gửi nhận gói tin JSON.' },
  { id: 't4', title: 'Ôn tập chương Cây nhị phân', course: courses[0]!, deadline: dateKey(addDays(today, 5)), priority: 'Trung bình', status: 'Hoàn thành', notes: 'Đã hoàn thành 10 bài luyện tập.' },
];
const initialClasses: ClassItem[] = [
  { id: 'c1', title: courses[1]!, weekday: today.getDay(), start: '08:00', end: '10:30', room: 'A2.301', teacher: 'TS. Lê Văn Tuấn' },
  { id: 'c2', title: courses[0]!, weekday: today.getDay(), start: '13:30', end: '16:00', room: 'Lab 4', teacher: 'ThS. Trần Mai' },
  { id: 'c3', title: courses[2]!, weekday: (today.getDay() + 1) % 7, start: '07:30', end: '10:00', room: 'B1.204', teacher: 'ThS. Hoàng Linh' },
  { id: 'c4', title: courses[3]!, weekday: (today.getDay() + 3) % 7, start: '09:00', end: '11:30', room: 'C3.104', teacher: 'TS. Phạm Đức Minh' },
];
export type Exam = { id: string; course: string; date: string; time: string; room: string; type: string; reminder: boolean };
const initialExams: Exam[] = [
  { id: 'e1', course: courses[4]!, date: dateKey(addDays(today, 6)), time: '08:30', room: 'B202', type: 'Giữa kỳ • Tự luận', reminder: true },
  { id: 'e2', course: courses[1]!, date: dateKey(addDays(today, 11)), time: '14:00', room: 'Phòng máy 3', type: 'Cuối kỳ • Thực hành', reminder: false },
];
const durations = [25 * 60, 5 * 60, 15 * 60];
function usePrototype() {
  const [tasks, setTasks] = useState(initialTasks);
  const [classes, setClasses] = useState(initialClasses);
  const [exams, setExams] = useState(initialExams);
  const [tab, setTab] = useState<Tab>('home');
  const [focusCourse, setFocusCourse] = useState(courses[0]!);
  const [mode, setModeState] = useState(0);
  const [seconds, setSeconds] = useState(durations[0]!);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [completed, setCompleted] = useState(3);
  const [history, setHistory] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [studyPlan, setStudyPlan] = useState<string[]>([]);
  // Time derives from a timestamp, including after the app/tab returns to foreground.
  useEffect(() => {
    const tick = () => {
      if (!endsAt) return;
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSeconds(remaining);
      if (remaining === 0) {
        setEndsAt(null);
        if (mode === 0) { setCompleted(v => v + 1); setHistory(v => [`${focusCourse} • 25 phút`, ...v]); }
        setToast(mode === 0 ? 'Hoàn thành một phiên. Nghỉ một chút nhé!' : 'Hết giờ nghỉ. Sẵn sàng học tiếp!');
      }
    };
    tick(); const id = setInterval(tick, 500); const listener = AppState.addEventListener('change', s => { if (s === 'active') tick(); });
    return () => { clearInterval(id); listener.remove(); };
  }, [endsAt, mode, focusCourse]);
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id); }, [toast]);
  const setMode = (n: number) => { setModeState(n); setEndsAt(null); setSeconds(durations[n]!); };
  const toggleTimer = () => { if (endsAt) { setSeconds(Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))); setEndsAt(null); } else { const duration = seconds || durations[mode]!; setSeconds(duration); setEndsAt(Date.now() + duration * 1000); } };
  const resetTimer = () => { setEndsAt(null); setSeconds(durations[mode]!); };
  const saveTask = (task: Task) => setTasks(v => v.some(t => t.id === task.id) ? v.map(t => t.id === task.id ? task : t) : [...v, task]);
  const saveClass = (item: ClassItem) => setClasses(v => v.some(c => c.id === item.id) ? v.map(c => c.id === item.id ? item : c) : [...v, item]);
  return { tasks, setTasks, classes, setClasses, exams, setExams, tab, setTab, focusCourse, setFocusCourse, mode, setMode, seconds, running: endsAt !== null, toggleTimer, resetTimer, completed, history, toast, setToast, saveTask, saveClass, studyPlan, setStudyPlan, timerProgress: 1 - seconds / durations[mode]! };
}
const Context = createContext<ReturnType<typeof usePrototype> | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) { const state = usePrototype(); return <Context.Provider value={state}>{children}</Context.Provider>; }
export function useApp() { const value = useContext(Context); if (!value) throw new Error('Missing PrototypeProvider'); return value; }
