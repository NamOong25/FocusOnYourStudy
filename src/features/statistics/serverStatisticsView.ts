import type { Course } from '../academics/academic';
import type { PomodoroStatistics } from './api/pomodoroStatisticsApi';

export const statisticsSemesterCaption = (term: number, year: number) => `${term === 3 ? 'Học kỳ hè' : `Học kỳ ${term}`} · ${year}–${year + 1}`;
export function serverStatisticsView(data: PomodoroStatistics, catalog?: Pick<Course, 'id'>[]) {
  const live = catalog ? new Set(catalog.map(c => c.id)) : null;
  return {
    completedSessions: data.completedSessions,
    groupedDays: false,
    buckets: data.days.map(day => ({ from: day.date, to: day.date, seconds: day.studySeconds, sessions: day.completedSessions })),
    distribution: data.courses.map(course => ({ id: `${course.courseId}:${course.semesterId}`, name: course.courseName, code: course.courseCode,
      semesterCaption: statisticsSemesterCaption(course.semesterTerm, course.semesterStartYear), seconds: course.studySeconds, sessions: course.completedSessions,
      archived: live !== null && !live.has(course.courseId), percent: data.studySeconds ? course.studySeconds / data.studySeconds * 100 : 0 })),
  };
}
