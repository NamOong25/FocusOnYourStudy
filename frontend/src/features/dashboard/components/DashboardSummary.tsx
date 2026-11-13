import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconTile, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { formatGpa } from '../../grades/grades';
import type { dashboardData } from '../dashboard';

type GpaDisplay = { value: string } | 'error';

export default function DashboardSummary({ data, onGrades, gpa }: {
  data: ReturnType<typeof dashboardData>; onGrades: () => void; gpa?: GpaDisplay;
}) {
  const display = gpa ?? { value: formatGpa(data.summary.gpa) };
  return <Pressable accessibilityRole="button" accessibilityLabel="Dashboard: xem điểm học kỳ" onPress={onGrades}
    style={({ pressed }) => [styles.summary, pressed && { opacity: 0.7 }]}>
    <IconTile name="school-outline" size={32} />
    <View style={S.grow}>
      <T style={styles.label}>GPA học kỳ</T>
      {display === 'error' ? <T accessibilityRole="alert" style={{ color: C.red, fontSize: 12 }}>Chưa tải được</T>
        : <T testID="dashboard-gpa" style={styles.value}>{display.value.replace('.', ',')}{/\d/.test(display.value) ? '/4' : ''}</T>}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  summary: { ...S.row, ...S.grow, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, gap: 8, padding: 10, borderRadius: 16, minHeight: 66 },
  label: { fontFamily: F.bold, fontSize: 13, lineHeight: 19 },
  value: { fontFamily: F.extra, fontSize: 19, lineHeight: 27, color: C.primary },
});
