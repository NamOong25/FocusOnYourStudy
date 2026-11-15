import React from 'react';
import { Switch, View } from 'react-native';
import { Card, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';

export function CourseGpaSwitch({ value, onChange, disabled }: {
  value: boolean; onChange: (value: boolean) => void; disabled?: boolean;
}) {
  return <Card style={{ backgroundColor: '#F1EEFF', borderColor: '#DCD4FB', padding: 14 }}>
    <Row between>
      <View style={[S.grow, { gap: 4 }]}>
        <T style={{ fontFamily: F.bold }}>Tính vào GPA</T>
        <T style={S.small}>{value
          ? 'Điểm và tín chỉ của môn được tính vào GPA học kỳ và GPA tích lũy.'
          : 'Vẫn lưu và hiển thị điểm môn. Điểm và tín chỉ không tính vào GPA.'}</T>
      </View>
      <Switch accessibilityLabel="Tính vào GPA" value={value} onValueChange={onChange} disabled={disabled}
        trackColor={{ false: C.muted, true: C.primary }} thumbColor={C.card} />
    </Row>
  </Card>;
}
