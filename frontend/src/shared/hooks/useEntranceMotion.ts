import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform } from 'react-native';

export function useEntranceMotion(duration: number) {
  const [progress] = useState(() => new Animated.Value(
    Platform.OS === 'web' && globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 1 : 0,
  ));

  useEffect(() => {
    let active = true;
    let interrupted = false;
    let animation: Animated.CompositeAnimation | undefined;
    const finish = () => {
      interrupted = true;
      animation?.stop();
      progress.setValue(1);
    };
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => {
      if (reduced) finish();
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!active || interrupted) return;
      if (reduced) { finish(); return; }
      animation = Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' });
      animation.start();
    }, () => { if (active) finish(); });
    return () => {
      active = false;
      animation?.stop();
      subscription?.remove();
    };
  }, [duration, progress]);

  return progress;
}

export function entranceStyle(progress: Animated.Value, start: number, end: number, distance = 8, initialOpacity = 0.28) {
  const step = progress.interpolate({
    inputRange: [start, end], outputRange: [0, 1], extrapolate: 'clamp', easing: Easing.out(Easing.cubic),
  });
  return {
    opacity: step.interpolate({ inputRange: [0, 1], outputRange: [initialOpacity, 1] }),
    transform: [{ translateY: step.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  };
}
