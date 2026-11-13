import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { IconTile, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useApp } from '../../../store/model';
import { usePomodoroProgress } from '../../focus/api/PomodoroProgressProvider';

export default function ServerDashboardPomodoro() {
  const { state, data, reload } = usePomodoroProgress();
  const { setTab } = useApp();
  const daily = data?.daily;
  return <Pressable accessibilityRole="button" accessibilityHint={state.error ? 'Tải lại số liệu tập trung' : 'Mở màn hình Tập trung'}
    onPress={() => state.error ? void reload().catch(() => {}) : setTab('focus')}
    style={({ pressed }) => [styles.tile, pressed && { opacity: 0.7 }]}>
    <IconTile name="timer-outline" size={32} />
    <View style={S.grow}>
      <T style={styles.label}>Tập trung hôm nay</T>
      {state.error ? <T accessibilityRole="alert" style={S.small}>Chạm để thử lại</T>
        : daily ? <T style={styles.value}>
          <T testID="server-home-focus-minutes" style={styles.value}>{Math.floor(daily.studySeconds / 60)} phút</T>
          <T testID="server-home-focus-count" style={styles.value}>{` · ${daily.completedSessions}/${daily.goal.dailySessions} phiên`}</T>
        </T> : <T style={S.small} accessibilityLiveRegion="polite">Đang tải…</T>}
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  tile: { ...S.row, ...S.grow, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, gap: 8, padding: 10, borderRadius: 16, minHeight: 66 },
  label: { fontFamily: F.bold, fontSize: 13, lineHeight: 19 },
  value: { fontFamily: F.bold, fontSize: 12, lineHeight: 18, color: C.primary },
});
