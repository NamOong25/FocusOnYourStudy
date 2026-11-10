import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, IconTile, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { formatGpa } from '../../grades/grades';
import type { dashboardData } from '../dashboard';

type GpaDisplay = { value: string; caption: string } | 'error';

export default function DashboardSummary({ data, onGrades, gpa }: {
  data: ReturnType<typeof dashboardData>; onGrades: () => void; gpa?: GpaDisplay;
}) {
  const display = gpa ?? { value: formatGpa(data.summary.gpa), caption: `${data.summary.scoredCredits} tín chỉ tính GPA · Điểm đã nhập` };
  return <Pressable accessibilityRole="button" accessibilityLabel="Dashboard: xem điểm học kỳ" onPress={onGrades}
    style={({ pressed }) => [styles.summary, pressed && { opacity: 0.7 }]}>
    <IconTile name="school-outline" size={35} bg="#fff" />
    <View style={S.grow}>
      <T style={styles.label}>GPA học kỳ</T>
      {display !== 'error' && <T style={styles.caption}>{display.caption}</T>}
    </View>
    {display === 'error' ? <T accessibilityRole="alert" style={{ color: C.red, fontSize: 12 }}>Chưa tải được điểm</T>
      : <T testID="dashboard-gpa" style={styles.value}>{display.value.replace('.', ',')}{/\d/.test(display.value) ? ' / 4' : ''}</T>}
    <Icon name="chevron-forward" size={16} />
  </Pressable>;
}

const styles = StyleSheet.create({
  summary: { ...S.row, backgroundColor: '#F0E9FC', padding: 12, borderRadius: 16, minHeight: 60 },
  label: { fontFamily: F.bold, fontSize: 13, lineHeight: 19 },
  value: { fontFamily: F.extra, fontSize: 19, lineHeight: 27, color: C.primary },
  caption: { fontSize: 10, lineHeight: 16, color: C.muted },
});
