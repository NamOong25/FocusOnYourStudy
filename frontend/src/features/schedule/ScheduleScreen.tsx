import React, { useLayoutEffect, useState } from 'react';
import { Button, Sheet, StateView } from '../../shared/components';
import { FlowScope, useNavigationScope } from '../../navigation/Navigation';
import { dateKey, parseDay } from '../../shared/utils/dates';
import { ExamDialog } from '../exams/Exams';
import { useApp } from '../../store/model';
import { useAuth } from '../account/auth/AuthProvider';
import type { ClassItem } from './calendar';
import ServerSchedule from './ServerSchedule';
import ScheduleHeader from './components/ScheduleHeader';
import ScheduleCalendar from './components/ScheduleCalendar';
import { ScheduleDayList, ScheduleWeekGrid, type TimetableEntry } from './components/ScheduleTimetable';
import { scheduleWindow, type CalendarView } from './scheduleView';

type Props = { onClass: (item: ClassItem, date?: string) => void; onNewClass: () => void };

export default function Schedule(props: Props) {
  const auth = useAuth();
  return auth.hasSession ? <ServerSchedule /> : <PreviewSchedule {...props} />;
}

function PreviewSchedule({ onClass, onNewClass }: Props) {
  const { getClassesOn, exams, semesters, academicSemesterId, setAcademicSemesterId, courseCatalog, setScheduleMode, scheduleDestination, consumeScheduleDestination } = useApp();
  const { active } = useNavigationScope();
  const [examId, setExamId] = useState<string | null>(null), [choose, setChoose] = useState(false);
  const [view, setView] = useState<CalendarView>('Theo tuần'), [selected, setSelected] = useState(() => new Date());
  const semester = semesters.find(item => item.id === academicSemesterId) ?? semesters[0];
  const courses = new Map(courseCatalog.filter(course => course.semesterId === semester?.id).map(course => [course.id, course]));
  const { days, grid } = scheduleWindow(selected, view), day = dateKey(selected);

  useLayoutEffect(() => {
    if (!active || !scheduleDestination) return;
    setSelected(parseDay(scheduleDestination.date)); setView('Theo ngày'); setExamId(null); setChoose(false);
    consumeScheduleDestination(scheduleDestination.key);
  }, [active, scheduleDestination, consumeScheduleDestination]);

  const entries = grid.flatMap(date => {
    const key = dateKey(date);
    const classes = getClassesOn(key).filter(item => courses.has(item.courseId)).map((item): TimetableEntry => ({
      id: `class-${item.id}:${key}`, date: key, start: item.start, end: item.end, title: item.title, code: courses.get(item.courseId)?.code,
      room: item.room, color: courses.get(item.courseId)?.color, status: item.cancelled ? 'Đã nghỉ' : item.changed ? 'Đã điều chỉnh' : undefined,
      onOpen: () => onClass(item, key),
    }));
    const assessments = exams.filter(exam => exam.date === key && courses.has(exam.courseId)).map((exam): TimetableEntry => ({
      id: `exam-${exam.id}`, date: key, start: exam.time, end: exam.end, title: exam.course, code: courses.get(exam.courseId)?.code,
      room: exam.room, exam: true, onOpen: () => setExamId(exam.id),
    }));
    return [...classes, ...assessments].sort((a, b) => a.start.localeCompare(b.start));
  });

  return <FlowScope onClose={() => { setExamId(null); setChoose(false); }}>
    <ScheduleHeader semester={semester} onChoose={() => setChoose(true)} />
    {!semester ? <StateView title="Chưa có học kỳ để xem lịch" message="Tạo học kỳ và thêm môn học để bắt đầu lên lịch." actionLabel="Đến Môn & học kỳ" onAction={() => setScheduleMode('Môn & học kỳ')} /> : <>
      <ScheduleCalendar selected={selected} view={view} onSelect={setSelected} onView={setView} hasEvent={date => entries.some(entry => entry.date === date)} />
      {view === 'Theo tuần'
        ? <ScheduleWeekGrid days={days} selected={day} entries={entries} onDay={date => { setSelected(date); setView('Theo ngày'); }} />
        : <ScheduleDayList date={day} entries={entries.filter(entry => entry.date === day)} />}
      <Button label="Thêm lịch học" icon="add" onPress={onNewClass} />
    </>}
    {choose && <Sheet title="Học kỳ xem lịch" onClose={() => setChoose(false)}>
      {semesters.map(item => <Button key={item.id} label={`${item.name} · ${item.academicYear}`} secondary={item.id !== semester?.id}
        onPress={() => { setAcademicSemesterId(item.id); setChoose(false); }} />)}
    </Sheet>}
    {examId && <ExamDialog id={examId} onClose={() => setExamId(null)} />}
  </FlowScope>;
}
