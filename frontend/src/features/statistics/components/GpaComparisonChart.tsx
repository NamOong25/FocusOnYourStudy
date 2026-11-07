import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { compareSemesterGpa, type SemesterGpaReport } from '../../grades/gpaComparison';
import { formatGpa } from '../../grades/grades';

export function GpaDifferenceCard({ base, target }: { base: SemesterGpaReport; target: SemesterGpaReport }) {
  const comparison = compareSemesterGpa(base, target);
  const color = !comparison ? C.muted : comparison.direction === 'decrease' ? C.red : comparison.direction === 'increase' ? C.green : C.primary;
  return <Card style={{ backgroundColor: !comparison ? C.canvas : comparison.direction === 'decrease' ? C.redSoft : comparison.direction === 'increase' ? C.greenSoft : C.soft, gap: 10 }}>
    <Row style={{ gap: 9 }}><Icon name={!comparison ? 'information-circle-outline' : comparison.direction === 'increase' ? 'trending-up-outline' : comparison.direction === 'decrease' ? 'trending-down-outline' : 'remove-outline'} color={color} /><T style={[S.grow, { fontFamily: F.bold, fontSize: 15, color }]}>{comparison?.provisional ? 'Chênh lệch tạm tính' : 'Chênh lệch GPA'}</T><T style={{ fontSize: 11, color }}>B − A</T></Row>
    <T accessibilityLiveRegion="polite" style={{ fontFamily: F.extra, fontSize: comparison ? 29 : 17, lineHeight: comparison ? 41 : 27, color }}>{!comparison ? 'Chưa đủ dữ liệu để so sánh' : comparison.amount === 0 ? <>Không đổi<T style={{ fontSize: 15, color }}> · 0.00 điểm GPA</T></> : <>{comparison.amount > 0 ? 'Tăng' : 'Giảm'} {Math.abs(comparison.amount).toFixed(2)}<T style={{ fontSize: 15, color }}> điểm GPA</T></>}</T>
    <T style={S.small}>{comparison ? `GPA học kỳ B trừ GPA học kỳ A, theo hai giá trị hiển thị đến 2 chữ số.${comparison.provisional ? ' Kết quả có thể đổi khi bổ sung điểm.' : ''}` : 'Cần có GPA ở cả hai học kỳ. Điểm chưa nhập không được xem là điểm 0.'}</T>
  </Card>;
}
export function GpaComparisonChart({ base, target, onOpen }: { base: SemesterGpaReport; target: SemesterGpaReport; onOpen: (id: string) => void }) {
  return <Card style={{ gap: 18 }}>
    <T accessibilityRole="header" style={{ fontFamily: F.bold, fontSize: 17 }}>GPA trên thang 4</T>
    {[base, target].map((report, index) => <Pressable key={report.semester.id} accessibilityRole="button" accessibilityLabel={`Biểu đồ GPA: ${report.semester.name}, ${report.semester.academicYear}`} onPress={() => onOpen(report.semester.id)} style={{ gap: 8, paddingVertical: 5 }}>
      <Row between><View style={[S.grow, { gap: 3 }]}><T style={{ fontFamily: F.semi, fontSize: 13 }}>{index === 0 ? 'A' : 'B'} · {report.semester.name}</T><T style={S.small}>{report.semester.academicYear}</T></View><T style={{ fontFamily: F.extra, fontSize: 19, color: index === 0 ? C.primary : C.green }}>{formatGpa(report.summary.gpa)}</T></Row>
      {report.summary.gpa === null ? <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: C.line, borderRadius: 12, padding: 11 }}><T style={S.small}>Chưa đủ dữ liệu · Chưa vẽ thanh GPA</T></View> : <View style={{ height: 10, borderRadius: 7, overflow: 'hidden', backgroundColor: C.track }}><View style={{ height: '100%', width: `${Math.max(0, Math.min(100, report.summary.gpa / 4 * 100))}%`, backgroundColor: index === 0 ? C.primary : C.green, borderRadius: 7 }} /></View>}
    </Pressable>)}
    <Row between><T style={S.small}>0</T><T style={S.small}>2</T><T style={S.small}>4</T></Row>
    <T style={S.small}>GPA 0.00 là kết quả có thật khi các môn tính GPA đều không đạt. Kỳ chưa có dữ liệu được hiển thị riêng.</T>
  </Card>;
}
