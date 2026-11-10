import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Card, Row, Sheet, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import GradeStatus from '../../grades/GradeStatus';
import type { ServerCourseGrade } from '../../grades/api/gradesReadApi';
import { gradePresentation } from '../../grades/gradePresentation';
import { gradeNumber, serverGradeView } from '../../grades/serverGradeView';

const scale = [10, 8, 6, 4, 2, 0];
const plotHeight = 130;
const labelSpace = 28;
const baseline = labelSpace + plotHeight;
const columnWidth = 54;
const legend = [
  { label: 'Đạt', color: C.primary },
  { label: 'Cần chú ý', color: C.orange },
  { label: 'Không đạt', color: C.red },
  { label: 'Chưa có điểm', color: C.muted },
];

function courseLabel(name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ').normalize('NFC');
  if (Array.from(normalized).length <= 8) return normalized;
  const words = normalized.match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}]*/gu) ?? [];
  const label = words.length > 1 ? words.map(word => Array.from(word)[0]).join('').toLocaleUpperCase('vi') : normalized;
  const letters = Array.from(label);
  return letters.length <= 8 ? label : letters.slice(0, 7).join('') + '…';
}

function chartColor(result: ReturnType<typeof serverGradeView>) {
  if (result.total === null && !result.failed) return C.muted;
  const style = gradePresentation(result);
  return style.attention ? style.color : C.primary;
}

const scoreLabel = (total: number | null) => gradeNumber(total, 1).replace('.', ',');
const tickPosition = (value: number) => baseline - value / 10 * plotHeight;

export default function SemesterGradeChart({ courses }: { courses: ServerCourseGrade[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = courses.find(course => course.id === selectedId);
  const detail = selected ? serverGradeView(selected.result) : null;

  return <Card style={{ padding: 15, gap: 12 }}>
    <Row between>
      <T accessibilityRole="header" style={[S.grow, { fontFamily: F.bold, fontSize: 16 }]}>Điểm tổng kết theo môn</T>
      <T style={S.small}>Thang 10</T>
    </Row>
    <Row style={{ alignItems: 'flex-start', gap: 6 }}>
      <View aria-hidden style={{ width: 22, height: baseline }}>
        {scale.map(tick => <T key={tick} style={{ position: 'absolute', top: tickPosition(tick) - 8, right: 0, fontSize: 10, lineHeight: 16, color: C.muted }}>{tick}</T>)}
      </View>
      <ScrollView horizontal style={S.grow} contentContainerStyle={{ flexGrow: 1 }}
        accessibilityLabel="Biểu đồ điểm tổng kết theo môn">
        <Row style={{ flex: 1, minWidth: courses.length * columnWidth, gap: 0, alignItems: 'flex-start' }}>
          {scale.map(tick => <View key={tick} pointerEvents="none" style={{ position: 'absolute', top: tickPosition(tick), left: 0, right: 0, borderTopWidth: 1, borderColor: C.line }} />)}
          {courses.map(course => {
            const result = serverGradeView(course.result);
            const value = scoreLabel(result.total);
            const color = chartColor(result);
            const scoreDescription = result.total === null ? 'Chưa có điểm tổng kết' : value + ' trên 10';
            return <Pressable key={course.id} accessibilityRole="button" accessibilityLabel={course.name + ', ' + scoreDescription + ', ' + gradePresentation(result).label}
              onPress={() => setSelectedId(course.id)} style={({ pressed }) => ({ flex: 1, minWidth: columnWidth, opacity: pressed ? 0.72 : 1 })}>
              <View style={{ height: baseline, justifyContent: 'flex-end', alignItems: 'center', gap: 3 }}>
                <T numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 18, color }}>{value}</T>
                {result.total !== null && <View style={{ height: Math.max(2, result.total / 10 * plotHeight), width: '68%', maxWidth: 38, backgroundColor: color, borderTopLeftRadius: 6, borderTopRightRadius: 6 }} />}
              </View>
              <T numberOfLines={1} style={{ textAlign: 'center', fontFamily: F.semi, color: C.muted, fontSize: 10, lineHeight: 17, marginTop: 6, paddingHorizontal: 2 }}>{courseLabel(course.name)}</T>
            </Pressable>;
          })}
        </Row>
      </ScrollView>
    </Row>
    <T style={S.small}>Vuốt ngang nếu còn môn. Chạm cột để xem chi tiết.</T>
    <Row style={{ flexWrap: 'wrap', gap: 9 }}>
      {legend.map(item => <Row key={item.label} style={{ gap: 5 }}>
        <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: item.color }} />
        <T style={[S.small, { fontSize: 10 }]}>{item.label}</T>
      </Row>)}
    </Row>
    {selected && detail && <Sheet title="Điểm tổng kết môn học" onClose={() => setSelectedId(null)}>
      <T style={{ fontFamily: F.extra, fontSize: 21 }}>{selected.name}</T>
      <T style={S.small}>{selected.code} · {selected.credits} tín chỉ</T>
      <T style={{ fontFamily: F.extra, fontSize: 27, color: chartColor(detail) }}>{scoreLabel(detail.total)}<T style={S.small}> / 10</T></T>
      <GradeStatus result={detail} detail />
    </Sheet>}
  </Card>;
}
