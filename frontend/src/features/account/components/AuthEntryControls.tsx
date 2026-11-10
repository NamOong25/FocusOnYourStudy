import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Icon, T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';

export function AuthEntryHeading({ title, detail }: { title: string; detail: string }) {
  return <View style={{ gap: 3 }}>
    <T accessibilityRole="header" style={styles.title}>{title}</T>
    <T style={styles.detail}>{detail}</T>
  </View>;
}

export function AuthEntrySubmit({ label, pending, busy, onPress }: {
  label: string; pending: string; busy: boolean; onPress: () => void;
}) {
  const text = busy ? pending : label;
  return <Pressable accessibilityRole="button" accessibilityLabel={text} accessibilityState={{ busy, disabled: busy }}
    disabled={busy} onPress={onPress}
    style={({ pressed }) => [styles.submit, busy && styles.busy, pressed && !busy && styles.pressed]}>
    {busy && <ActivityIndicator size="small" color="#fff" />}
    <T accessibilityLiveRegion="polite" style={styles.submitText}>{text}</T>
    {!busy && <Icon name="arrow-forward" size={17} color="#fff" />}
  </Pressable>;
}

export function AuthEntryLink({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled }}
    disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.link, (pressed || disabled) && styles.dim]}>
    <T style={styles.linkText}>{label}</T>
  </Pressable>;
}

const styles = StyleSheet.create({
  title: { fontFamily: F.extra, color: '#24193B', fontSize: 24, lineHeight: 33, letterSpacing: -0.6 },
  detail: { color: '#625874', fontSize: 13, lineHeight: 20 },
  submit: { minHeight: 49, borderRadius: 13, backgroundColor: '#5238C6', paddingHorizontal: 14, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  submitText: { color: '#fff', fontFamily: F.bold, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  busy: { opacity: 0.84 },
  pressed: { transform: [{ scale: 0.985 }] },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { color: C.primary, fontFamily: F.bold, fontSize: 13, lineHeight: 20 },
  dim: { opacity: 0.55 },
});
