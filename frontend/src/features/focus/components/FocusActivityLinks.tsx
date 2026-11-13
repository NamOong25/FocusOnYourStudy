import React from 'react';
import { Button, Row } from '../../../shared/components';

const actionStyle = { flexGrow: 1, flexBasis: 130, paddingHorizontal: 12, borderRadius: 15 };

export default function FocusActivityLinks({ onHistory, onStreak }: {
  onHistory: () => void;
  onStreak: () => void;
}) {
  return <Row style={{ flexWrap: 'wrap', alignItems: 'stretch', gap: 10 }}>
    <Button label="Lịch sử" secondary icon="time-outline" onPress={onHistory} style={actionStyle} />
    <Button label="Chuỗi ngày học" secondary icon="flame-outline" onPress={onStreak} style={actionStyle} />
  </Row>;
}
