import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';

const radius = 102;
const circumference = 2 * Math.PI * radius;
const arc = circumference * 0.75;

export default function FocusTimerFace({ milliseconds, duration, label, caption, stale = false, testID }: {
  milliseconds: number; duration: number; label: string; caption?: string; stale?: boolean; testID?: string;
}) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0'), remainder = String(seconds % 60).padStart(2, '0');
  const progress = Math.max(0, Math.min(1, 1 - milliseconds / (duration * 1000)));

  return <View style={styles.container}>
    <View style={styles.face}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 240 240">
        <Circle cx={120} cy={120} r={radius} stroke="#E8DDF5" strokeWidth={6} fill="none"
          strokeDasharray={[arc, circumference]} strokeLinecap="round" rotation={135} originX={120} originY={120} />
        <Circle cx={120} cy={120} r={radius} stroke={stale ? C.muted : C.primary} strokeWidth={6} fill="none"
          strokeDasharray={[Math.max(0.01, progress) * arc, circumference]} strokeLinecap="round" rotation={135} originX={120} originY={120} />
      </Svg>
      <View style={styles.readout}>
        <T accessibilityLiveRegion="polite" style={styles.status}>{label}</T>
        <T testID={testID} accessibilityLiveRegion="none" accessibilityLabel={`Đồng hồ ${minutes} phút ${remainder} giây`} style={styles.time}>{minutes}:{remainder}</T>
      </View>
      <Image source={require('../../../../assets/focus-robot.png')} accessible={false} resizeMode="contain" style={styles.robot} />
    </View>
    {!!caption && <T style={styles.caption}>{caption}</T>}
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 2 },
  face: { width: '100%', maxWidth: 260, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  readout: { width: '72%', gap: 2, alignItems: 'center', marginBottom: '18%' },
  status: { textAlign: 'center', fontFamily: F.bold, fontSize: 10, lineHeight: 15, color: C.primary },
  time: { textAlign: 'center', fontFamily: F.extra, fontSize: 55, lineHeight: 71, letterSpacing: -2, fontVariant: ['tabular-nums'], color: '#211734' },
  robot: { position: 'absolute', bottom: '2%', width: '37%', height: '37%' },
  caption: { ...S.small, textAlign: 'center' },
});
