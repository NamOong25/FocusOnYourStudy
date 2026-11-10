import React, { useState } from 'react';
import { Card, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useNavigationScope } from '../../../navigation/Navigation';
import { useApp } from '../../../store/model';
import { useServerSemesterGrades } from '../../grades/api/useServerGrades';
import { useGpaCatalog } from '../../grades/api/useServerGpa';
import { gradeNumber } from '../../grades/serverGradeView';
import { semesterGpaCaption } from '../../grades/serverGpaView';
import { StatisticsSemesterSelector, StatisticsSemesterSheet } from './StatisticsFilters';
import SemesterGradeChart from './SemesterGradeChart';

export default function SemesterGradeOverview() {
  const { academicSemesterId, setAcademicSemesterId, setScheduleMode } = useApp();
  const [semesterPicker, setSemesterPicker] = useState(false);
  const catalog = useGpaCatalog();
  const semester = catalog.semesters.find(item => item.id === academicSemesterId)
    ?? catalog.semesters.find(item => item.status === 'Đang học') ?? catalog.semesters[0];
  const read = useServerSemesterGrades(catalog.ready && semester ? {
    semesterId: semester.id,
    semesterVersion: semester.version ?? -1,
    courses: catalog.courseCatalog.filter(course => course.semesterId === semester.id),
  } : null, useNavigationScope().active);
  const error = catalog.error ?? read.error;
  const summary = read.value?.summary;
  const manage = () => {
    setSemesterPicker(false);
    if (semester) setAcademicSemesterId(semester.id);
    setScheduleMode('Môn & học kỳ');
  };

  return <>
    {semester && <StatisticsSemesterSelector semester={semester} onPress={() => setSemesterPicker(true)} />}
    {error ? <StateView kind="error" title="Chưa tải được điểm học kỳ" message={error.message} actionLabel="Thử lại điểm học kỳ" onAction={() => { void Promise.allSettled([read.reload(), catalog.reloadCatalog()]); }} />
      : !catalog.ready ? <StateView kind="loading" title="Đang tải học kỳ và môn học" message="Đang đọc danh sách đã lưu trong tài khoản." />
        : !semester ? <StateView title="Chưa có học kỳ" message="Tạo học kỳ để xem GPA và điểm tổng kết của từng môn." actionLabel="Quản lý học kỳ và môn" onAction={manage} />
          : !summary ? <StateView kind="loading" title="Đang tải điểm học kỳ" message="Đang đọc kết quả tổng kết của từng môn." />
            : <>
              <Card style={{ backgroundColor: C.soft, padding: 15, gap: 3 }}>
                <T style={{ fontFamily: F.semi }}>GPA học kỳ</T>
                <T style={{ fontFamily: F.extra, fontSize: 30, color: C.primary }}>
                  {gradeNumber(summary.gpa, 2).replace('.', ',')}<T style={S.small}> / 4</T>
                </T>
                {summary.state !== 'COMPLETE' && <T style={S.small}>{semesterGpaCaption(summary)}</T>}
              </Card>
              {read.value && read.value.courses.length > 0
                ? <SemesterGradeChart key={semester.id} courses={read.value.courses} />
                : <StateView title="Học kỳ chưa có môn học" message="Thêm môn học để theo dõi điểm tổng kết." actionLabel="Thêm môn học" onAction={manage} />}
            </>}
    {semesterPicker && semester && <StatisticsSemesterSheet semesters={catalog.semesters} selectedId={semester.id}
      description="GPA và điểm tổng kết hiển thị theo học kỳ bạn chọn."
      onSelect={id => { setAcademicSemesterId(id); setSemesterPicker(false); }} onManage={manage} onClose={() => setSemesterPicker(false)} />}
  </>;
}
