import React from 'react';
import { View } from 'react-native';
import { Card, Icon, Row, T } from '../../shared/components';
import { CalendarEvent } from './calendar';
import { dateLabel } from '../../shared/utils/dates';
import { C, F, S } from '../../shared/theme';

export default function ConflictPanel({ conflicts, candidate }: { conflicts: CalendarEvent[]; candidate: string }) {
  if (!conflicts.length) return null;
  return <Card style={{ backgroundColor: C.redSoft, borderColor: '#FFD0CD', gap: 12 }}><Row><Icon name="warning-outline" color={C.red} /><T accessibilityRole="alert" style={{ fontFamily: F.bold, color: C.red, flex: 1 }}>Khung giờ bị trùng lịch</T></Row><T style={{ color: C.red, fontSize: 12 }}>Lịch đang nhập: {candidate}</T>{conflicts.map((e,i) => <View key={`${e.kind}-${e.id}-${i}`} style={{ backgroundColor: '#FFFFFF99', borderRadius: 13, padding: 12, gap: 4 }}><T style={{ fontFamily: F.bold, fontSize: 12 }}>{e.kind} · {e.title}</T><T style={{ fontSize: 11, color: C.muted }}>{dateLabel(e.date)}/{e.date.slice(0,4)} · {e.start} – {e.end}</T></View>)}<T style={{ fontSize: 11, color: C.red }}>Chỉnh ngày hoặc giờ ở form phía trên để các lịch không chồng nhau. Hiển thị tối đa 5 lịch liên quan.</T></Card>;
}
