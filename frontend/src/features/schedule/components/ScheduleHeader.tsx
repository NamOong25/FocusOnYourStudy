import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Row, T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';
import type { Semester } from '../../academics/academic';

export default function ScheduleHeader({ semester, onChoose }: { semester?: Semester; onChoose: () => void }) {
  return <Row between style={styles.heading}>
    <T accessibilityRole="header" style={styles.title}>Thời khóa biểu</T>
    {semester && <Pressable accessibilityRole="button" accessibilityLabel={`Đổi học kỳ xem lịch, ${semester.name}, ${semester.academicYear}`}
      onPress={onChoose} style={({ pressed }) => [styles.semester, pressed && { opacity: 0.7 }]}>
      <View><T style={styles.name}>{semester.name}</T><T style={styles.year}>{semester.academicYear}</T></View>
      <Icon name="chevron-down" size={14} />
    </Pressable>}
  </Row>;
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', flexWrap: 'wrap', rowGap: 7 },
  title: { fontFamily: F.extra, fontSize: 28, lineHeight: 38, letterSpacing: -1, color: C.ink },
  semester: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 44, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.line, borderRadius: 13, backgroundColor: '#fff' },
  name: { fontFamily: F.bold, fontSize: 12, lineHeight: 18, color: C.primary },
  year: { fontSize: 10, lineHeight: 15, color: C.muted },
});
