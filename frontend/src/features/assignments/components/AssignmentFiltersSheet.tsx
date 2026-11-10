import React, { useState } from 'react';
import { View } from 'react-native';
import type { Course, Semester } from '../../academics/academic';
import { Button, Segments, Sheet, T } from '../../../shared/components';
import { F, S } from '../../../shared/theme';
import type { TaskStatus } from '../assignments';

const statuses = ['Tất cả', 'Chưa làm', 'Đang làm', 'Hoàn thành'] as const;
type StatusFilter = TaskStatus | 'Tất cả';

type Props = {
  semesters: Semester[];
  semesterId: string;
  courses: Course[];
  courseId: string;
  status: StatusFilter;
  resultCount?: number;
  hasFilters: boolean;
  onSemester: (id: string) => void;
  onCourse: (id: string) => void;
  onStatus: (value: StatusFilter) => void;
  onReset: () => void;
  onClose: () => void;
};

export default function AssignmentFiltersSheet({
  semesters, semesterId, courses, courseId, status, resultCount, hasFilters,
  onSemester, onCourse, onStatus, onReset, onClose,
}: Props) {
  const [picker, setPicker] = useState<'semester' | 'course' | null>(null);
  const semester = semesters.find(item => item.id === semesterId);
  const course = courses.find(item => item.id === courseId);
  const visibleCourses = courses.filter(item => !semesterId || item.semesterId === semesterId);
  const chooseSemester = (id: string) => { onSemester(id); setPicker(null); };
  const chooseCourse = (id: string) => { onCourse(id); setPicker(null); };

  return <Sheet title={picker === 'semester' ? 'Chọn học kỳ bài tập' : picker === 'course' ? 'Lọc theo môn học' : 'Bộ lọc bài tập'}
    onClose={onClose} onBack={picker ? () => setPicker(null) : undefined} scrollKey={picker ?? 'filters'}>
    {picker === 'semester' ? <>
      <Button label="Tất cả học kỳ" secondary={!!semesterId} onPress={() => chooseSemester('')} />
      {semesters.map(item => <Button key={item.id} label={`${item.name} · ${item.academicYear}`}
        secondary={semesterId !== item.id} onPress={() => chooseSemester(item.id)} />)}
    </> : picker === 'course' ? <>
      <Button label="Tất cả môn" secondary={!!courseId} onPress={() => chooseCourse('')} />
      {visibleCourses.map(item => {
        const term = semesters.find(candidate => candidate.id === item.semesterId);
        return <View key={item.id} style={{ gap: 4 }}>
          <Button label={`${item.name} · ${item.code}`} secondary={courseId !== item.id} onPress={() => chooseCourse(item.id)} />
          {!semesterId && term && <T style={[S.small, { textAlign: 'center' }]}>{term.name} · {term.academicYear}</T>}
        </View>;
      })}
      {!visibleCourses.length && <T style={S.small}>Chưa có môn học trong phạm vi này.</T>}
    </> : <>
      <View style={{ gap: 7 }}>
        <T style={{ fontFamily: F.semi }}>Học kỳ</T>
        <Button label={semester ? `${semester.name} · ${semester.academicYear}` : semesterId ? 'Kỳ đã xóa' : 'Tất cả học kỳ'}
          icon="calendar-outline" secondary onPress={() => setPicker('semester')} />
      </View>
      <View style={{ gap: 7 }}>
        <T style={{ fontFamily: F.semi }}>Môn học</T>
        <Button label={course?.name ?? (courseId ? 'Môn đã xóa' : 'Tất cả môn')}
          icon="school-outline" secondary onPress={() => setPicker('course')} />
      </View>
      <View style={{ gap: 7 }}>
        <T style={{ fontFamily: F.semi }}>Trạng thái</T>
        <Segments values={statuses} value={status} onChange={value => onStatus(value as StatusFilter)} />
      </View>
      <Button label={resultCount === undefined ? 'Xem danh sách' : `Xem ${resultCount} bài tập`} onPress={onClose} />
      {hasFilters && <Button label="Xóa tìm kiếm và bộ lọc" secondary onPress={onReset} />}
    </>}
  </Sheet>;
}
