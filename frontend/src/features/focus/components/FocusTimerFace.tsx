import React, { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';
import { focusTone } from './FocusSetup';

const radius = 109;
const circumference = 2 * Math.PI * radius;

export default function FocusTimerFace({ milliseconds, duration, label, mode = 0, stale = false, testID, children }: {
  milliseconds: number; duration: number; label: string; mode?: number; stale?: boolean; testID?: string; children?: ReactNode;
}) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0'), remainder = String(seconds % 60).padStart(2, '0');
  const progress = Math.max(0, Math.min(1, milliseconds / (duration * 1000)));
  const { accent, track, fill } = focusTone(mode);
  const ring = stale ? C.muted : accent;

  return <View style={styles.container}>
    <View style={styles.face}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} viewBox="0 0 240 240">
        <Circle cx={120} cy={120} r={radius} stroke={progress === 1 ? ring : track} strokeWidth={7} fill={fill} />
        {progress > 0 && progress < 1 && <Circle cx={120} cy={120} r={radius} stroke={ring} strokeWidth={7} fill="none"
          strokeDasharray={[circumference, circumference]} strokeDashoffset={(1 - progress) * circumference}
          strokeLinecap="round" rotation={-90} originX={120} originY={120} />}
      </Svg>
      <View style={styles.readout}>
        <T accessibilityLiveRegion="polite" style={[styles.status, { color: ring }]}>{label}</T>
        <T testID={testID} accessibilityLiveRegion="none" accessibilityLabel={`Đồng hồ ${minutes} phút ${remainder} giây`}
          numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={styles.time}>{minutes}:{remainder}</T>
        {children}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  face: { width: '100%', maxWidth: 278, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  readout: { width: '67%', gap: 1, alignItems: 'center' },
  status: { textAlign: 'center', fontFamily: F.bold, fontSize: 11 },
  time: { width: '100%', textAlign: 'center', fontFamily: F.extra, fontSize: 56, lineHeight: 76, letterSpacing: -2, fontVariant: ['tabular-nums'], color: C.ink },
});
