import React from 'react';
import { Segments } from '../../../shared/components';
import { dateKey } from '../../../shared/utils/dates';
import ScheduleCalendar from '../../schedule/components/ScheduleCalendar';
import { ScheduleDayList, ScheduleWeekGrid, type TimetableEntry } from '../../schedule/components/ScheduleTimetable';
import { scheduleWindow, type CalendarView } from '../../schedule/scheduleView';

const examViews = { Tuần: 'Theo tuần', Ngày: 'Theo ngày', Tháng: 'Theo tháng', 'Danh sách': 'Danh sách' } as const;
export type ExamView = typeof examViews[keyof typeof examViews];
export function ExamViewPicker({ view, onView }: { view: ExamView; onView: (view: ExamView) => void }) {
  const labels = Object.keys(examViews) as (keyof typeof examViews)[];
  return <Segments values={labels} value={labels.find(label => examViews[label] === view)!}
    onChange={label => onView(examViews[label as keyof typeof examViews])} />;
}

export default function ExamTimetable({ entries, selected, view, onSelect, onView }: {
  entries: TimetableEntry[]; selected: Date; view: CalendarView;
  onSelect: (date: Date) => void; onView: (view: CalendarView) => void;
}) {
  const { from, to, days } = scheduleWindow(selected, view);
  const date = dateKey(selected);
  return <>
    <ScheduleCalendar selected={selected} view={view} onSelect={onSelect} onView={onView} showViewPicker={false}
      eventColor="#D9A800" hasEvent={day => entries.some(entry => entry.date === day)} />
    {view === 'Theo tuần'
      ? <ScheduleWeekGrid exams days={days} selected={date} entries={entries.filter(entry => entry.date >= from && entry.date <= to)}
        onDay={day => { onSelect(day); onView('Theo ngày'); }} />
      : <ScheduleDayList exams date={date} entries={entries.filter(entry => entry.date === date)} />}
  </>;
}
