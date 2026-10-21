import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { formatGpa } from '../../grades/grades';
import type { SemesterGpaReport } from '../../grades/gpaComparison';

export function GpaSemesterCard({ report, slot, onOpen }: { report: SemesterGpaReport; slot: 'A' | 'B'; onOpen: () => void }) {
  const color = slot === 'A' ? C.primary : C.green;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Xem bảng điểm so sánh: ${report.semester.name}, ${report.semester.academicYear}`} onPress={onOpen} style={[S.card, S.grow, { padding: 14, gap: 12 }]}>
    <Badge label={`HỌC KỲ ${slot}`} color={color} bg={slot === 'A' ? C.soft : C.greenSoft} />
    <View style={{ gap: 4 }}><T style={{ fontFamily: F.bold, fontSize: 15 }}>{report.semester.name}</T><T style={{ fontSize: 10, lineHeight: 17, color: C.muted }}>{report.semester.academicYear}</T></View>
    <View style={{ gap: 5 }}><T style={{ fontFamily: F.extra, fontSize: 31, lineHeight: 43, color }}>{formatGpa(report.summary.gpa)}<T style={{ fontSize: 11, color: C.muted }}> /4</T></T><T style={{ fontSize: 11, lineHeight: 17, color: report.summary.gpa === null || report.provisional ? C.amber : C.green }}>{report.status}</T></View>
    <View style={{ gap: 8 }}><T style={S.small}>{report.summary.earnedCredits} tín chỉ GPA đạt</T><T style={S.small}>{report.summary.scoredCredits} tín chỉ tính GPA</T><T style={S.small}>{report.gpaCourseCount ? `${report.summary.completeCourses}/${report.gpaCourseCount} môn đủ kết quả GPA` : 'Chưa có môn tính GPA'}</T></View>
    <Row style={{ marginTop: 'auto', paddingTop: 5 }}><T style={[S.grow, { fontFamily: F.semi, fontSize: 11, color }]}>Xem bảng điểm</T><Icon name="arrow-forward" color={color} size={16} /></Row>
  </Pressable>;
}
