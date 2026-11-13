import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Segments, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';

const modes = ['Tập trung', 'Nghỉ ngắn', 'Nghỉ dài'];
export const focusHeading = { fontFamily: F.extra, fontSize: 32, lineHeight: 42, letterSpacing: -1, color: C.ink };

export default function FocusSetup({ title, detail, onChoose, chooseDisabled, chooseLabel, mode, onMode, modeLocked, testID }: {
  title: string; detail?: string; onChoose?: () => void; chooseDisabled?: boolean; chooseLabel?: string;
  mode: number; onMode: (mode: number) => void; modeLocked?: boolean; testID?: string;
}) {
  const content = <>
    <Icon name="book-outline" size={22} />
    <View style={S.grow}>
      <T testID={testID} style={styles.title}>{title}</T>
      {!!detail && <T style={S.small}>{detail}</T>}
    </View>
    {!!onChoose && <Icon name="chevron-down" size={16} />}
  </>;
  return <>
    {onChoose ? <Pressable accessibilityRole="button" accessibilityLabel={chooseLabel ?? 'Chọn môn'} disabled={chooseDisabled}
      onPress={onChoose} style={({ pressed }) => [styles.course, pressed && { opacity: 0.7 }]}>{content}</Pressable>
      : <View style={styles.course}>{content}</View>}
    <View accessibilityLabel="Chế độ đồng hồ">
      <Segments values={modes} value={modes[mode]!} disabled={modeLocked} onChange={value => {
        const selected = modes.indexOf(value);
        if (selected !== mode) onMode(selected);
      }} />
    </View>
  </>;
}

const styles = StyleSheet.create({
  course: { ...S.row, gap: 10, paddingHorizontal: 13, paddingVertical: 9, minHeight: 49, backgroundColor: '#F0E9FC', borderRadius: 15 },
  title: { fontFamily: F.bold, fontSize: 15, lineHeight: 22 },
});
