import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Row, T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';
import { dateKey } from '../../../shared/utils/dates';

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export default function HomeWeekStrip({ days, today, selected, onSelect }: {
  days: Date[]; today: string; selected: string; onSelect: (date: string) => void;
}) {
  return <Row style={styles.strip}>
    {days.map((day, index) => {
      const date = dateKey(day), active = selected === date;
      return <Pressable key={date} accessibilityRole="button" accessibilityState={{ selected: active }}
        accessibilityLabel={`${date === today ? 'Hôm nay, ' : ''}${day.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
        onPress={() => onSelect(date)} style={styles.day}>
        <T style={[styles.weekday, date === today && { color: C.primary }]}>{weekdays[index]}</T>
        <T style={[styles.number, active && styles.active]}>{day.getDate()}</T>
      </Pressable>;
    })}
  </Row>;
}

const styles = StyleSheet.create({
  strip: { backgroundColor: '#fff', borderColor: C.line, borderWidth: 1, borderRadius: 17, padding: 5, gap: 0 },
  day: { flex: 1, minWidth: 0, minHeight: 55, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontFamily: F.semi, fontSize: 11, lineHeight: 17, color: C.muted },
  number: { fontFamily: F.bold, fontSize: 15, lineHeight: 22, borderRadius: 13, textAlign: 'center', paddingHorizontal: 8, paddingVertical: 3 },
  active: { backgroundColor: C.primary, color: '#fff' },
});
