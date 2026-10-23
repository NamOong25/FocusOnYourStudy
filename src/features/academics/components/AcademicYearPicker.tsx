import React from 'react';
import { View } from 'react-native';
import { IconButton, Row, T } from '../../../shared/components';
import { useActionState } from '../../../shared/feedback/ActionScope';
import { C, F } from '../../../shared/theme';

export function AcademicYearPicker({ value, onChange, disabled = false }: { value: number; onChange: (year: number) => void; disabled?: boolean }) {
  const action = useActionState();
  return <View style={{ gap: 9 }}>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Năm học</T>
    <Row between style={{ borderRadius: 17, padding: 6, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line }}>
      <IconButton name="chevron-back" label="Năm học trước" disabled={disabled || !!action?.busy || value <= 1900} onPress={() => onChange(value - 1)} />
      <T accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 16, textAlign: 'center', flex: 1 }}>{value} – {value + 1}</T>
      <IconButton name="chevron-forward" label="Năm học tiếp theo" disabled={disabled || !!action?.busy || value >= 2099} onPress={() => onChange(value + 1)} />
    </Row>
  </View>;
}
