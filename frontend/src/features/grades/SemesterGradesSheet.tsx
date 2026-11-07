import { gradePresentation } from './gradePresentation';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, Row, Sheet, T } from '../../shared/components';
import { C, F, S } from '../../shared/theme';
import { useApp } from '../../store/model';
import { courseResult, formatGpa } from './grades';
import { semesterGpaReport } from './gpaComparison';
import { CourseGradeDialog } from './GradesScreen';
import GradeStatus from './GradeStatus';
import { useAuth } from '../account/auth/AuthProvider';
import { ServerSemesterGradesSheet } from './components/ServerGradesScreen';

// The existing course dialog/editor owns all score edits and grading rules.
export default function SemesterGradesSheet({ semesterId, onClose }: { semesterId: string; onClose: () => void }) {
  return useAuth().hasSession?<ServerSemesterGradesSheet semesterId={semesterId} onClose={onClose}/>:<PreviewSemesterGradesSheet semesterId={semesterId} onClose={onClose}/>;
}
function PreviewSemesterGradesSheet({ semesterId, onClose }: { semesterId: string; onClose: () => void }) {
  const { semesters, courseCatalog, gradeBook, gradeRules } = useApp();
  const [openedCourse, setOpenedCourse] = useState<string | null>(null);
  const semester = semesters.find(item => item.id === semesterId);
  if (!semester) return null;
  const report = semesterGpaReport(semester, courseCatalog, gradeBook, gradeRules);
  if (openedCourse && report.courses.some(course => course.id === openedCourse)) return <CourseGradeDialog courseId={openedCourse} onClose={() => setOpenedCourse(null)} />;
  return <Sheet title="Bảng điểm học kỳ" onClose={onClose}>
    <Card style={{ backgroundColor: C.soft, gap: 10 }}>
      <T style={{ fontFamily: F.bold, fontSize: 19 }}>{semester.name}</T><T style={S.small}>Năm học {semester.academicYear}</T>
      <T style={{ fontFamily: F.extra, fontSize: 32, color: C.primary }}>{formatGpa(report.summary.gpa)}<T style={S.small}> /4</T></T><Badge label={report.status} bg="#FFFFFFAA" />
      <T style={S.small}>{report.summary.earnedCredits} tín chỉ GPA đạt · {report.summary.scoredCredits} tín chỉ tính GPA</T>
      <T style={S.small}>{report.gpaCourseCount ? `${report.summary.completeCourses}/${report.gpaCourseCount} môn đủ kết quả GPA` : 'Chưa có môn tính GPA'}</T>
    </Card>
    {report.summary.gpa === null && <T style={S.small}>{report.unavailableReason}</T>}
    {!!report.pending && <T style={S.small}>{report.pending} môn chưa có kết quả tính GPA. Bổ sung điểm hoặc xem điều kiện của từng môn.</T>}
    {!!report.excludedPassFail && <T style={S.small}>{report.excludedPassFail} môn đạt/không đạt được tách khỏi GPA và tín chỉ GPA.</T>}
    {report.courses.map(course => {
      const result = courseResult(gradeBook[course.id], gradeRules);
      const presentation = gradePresentation(result);
      return <Pressable key={course.id} accessibilityRole="button" accessibilityLabel={`Mở điểm so sánh: ${course.name} · ${course.code}`} onPress={() => setOpenedCourse(course.id)}>
        <Card style={{ gap: 12, backgroundColor: presentation.attention ? presentation.background : C.card, borderColor: presentation.attention ? presentation.color : C.line }}><Row between><View style={[S.grow, { gap: 5 }]}><T style={{ fontSize: 10, color: C.primary }}>{course.code} · {course.credits} tín chỉ</T><T style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 23 }}>{course.name}</T></View><T style={{ fontFamily: F.extra, fontSize: 24, color: presentation.attention ? presentation.color : C.primary }}>{result.total === null ? '—' : result.total.toFixed(gradeRules.scale === 'iuh' ? 1 : gradeRules.decimals)}</T></Row><Row between><View style={S.grow}><GradeStatus result={result} /></View><Icon name="chevron-forward" size={17} /></Row></Card>
      </Pressable>;
    })}
    {!report.courses.length && <T style={S.small}>Thêm môn vào học kỳ này để bắt đầu nhập điểm.</T>}
  </Sheet>;
}
