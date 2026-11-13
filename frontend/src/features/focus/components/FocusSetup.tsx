import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Segments, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';

const modes = ['Tập trung', 'Nghỉ ngắn', 'Nghỉ dài'];
export const focusHeading = { fontFamily: F.extra, fontSize: 32, lineHeight: 42, letterSpacing: -1, color: C.ink };
const tones = [
  { accent: C.primary, track: '#E8DFF6', fill: '#F7F2FF' },
  { accent: '#087353', track: '#D2EAE0', fill: '#EFFAF5' },
  { accent: '#2461A9', track: '#D5E6F9', fill: '#F0F7FF' },
] as const;
export const focusTone = (mode: number) => tones[mode] ?? tones[0];

export default function FocusSetup({ mode, onMode, modeLocked }: {
  mode: number; onMode: (mode: number) => void; modeLocked?: boolean;
}) {
  return <View accessibilityLabel="Chế độ đồng hồ">
    <Segments values={modes} value={modes[mode]!} disabled={modeLocked} selectedColor={focusTone(mode).accent} onChange={value => {
      const selected = modes.indexOf(value);
      if (selected !== mode) onMode(selected);
    }} />
  </View>;
}

export function FocusCourseSelector({ title, detail, onChoose, chooseDisabled, chooseLabel, testID }: {
  title: string; detail?: string; onChoose?: () => void; chooseDisabled?: boolean; chooseLabel?: string;
  testID?: string;
}) {
  const content = <>
    <Icon name="book-outline" size={14} />
    <View style={S.grow}>
      <T testID={testID} numberOfLines={1} style={styles.title}>{title}</T>
      {!!detail && <T numberOfLines={1} style={S.small}>{detail}</T>}
    </View>
    {!!onChoose && <Icon name="chevron-down" size={13} />}
  </>;
  return onChoose ? <Pressable accessibilityRole="button" accessibilityLabel={`${chooseLabel ?? 'Đổi môn học'}, ${title}${detail ? ', ' + detail : ''}`}
    accessibilityState={{ disabled: !!chooseDisabled }} disabled={chooseDisabled} onPress={onChoose}
    style={({ pressed }) => [styles.course, (pressed || chooseDisabled) && { opacity: 0.65 }]}>{content}</Pressable>
    : <View style={styles.course}>{content}</View>;
}

const styles = StyleSheet.create({
  course: { ...S.row, width: '100%', gap: 6, paddingHorizontal: 10, paddingVertical: 4, minHeight: 44, backgroundColor: '#FFFFFFE0', borderRadius: 15 },
  title: { fontFamily: F.bold, fontSize: 12, color: C.primary },
});
