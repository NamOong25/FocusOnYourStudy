import React from 'react';
import { View } from 'react-native';
import { Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';

export default function FocusGoalProgress({ completed, goal, testID }: { completed: number; goal: number; testID?: string }) {
  return <View style={{ gap: 9 }}>
    <Row between>
      <T style={[S.grow, { fontFamily: F.bold, fontSize: 15 }]}>Mục tiêu hôm nay</T>
      <T testID={testID} style={{ fontFamily: F.bold, color: C.primary }}>{completed}/{goal} phiên</T>
    </Row>
    <View accessibilityRole="progressbar" accessibilityLabel="Tiến độ mục tiêu ngày"
      accessibilityValue={{ min: 0, max: goal, now: Math.min(completed, goal), text: `${completed} trên ${goal} phiên` }}
      style={{ flexDirection: 'row', gap: 5 }}>
      {Array.from({ length: goal }, (_, index) => <View key={index} style={{ flex: 1, height: 7, borderRadius: 6,
        backgroundColor: index < completed ? C.primary : '#E7E1ED' }} />)}
    </View>
  </View>;
}
