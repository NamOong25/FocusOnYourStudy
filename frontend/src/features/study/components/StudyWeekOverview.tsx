import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel, parseDay } from '../../../shared/utils/dates';
import type { StudySession } from '../learning';

export default function StudyWeekOverview({ days, sessions, today, selected, onOpenDay }: {
  days: string[]; sessions: StudySession[]; today: string; selected: string; onOpenDay: (date: string) => void;
}) {
  return <Card style={{ padding: 10, gap: 2 }}>
    <T style={[S.small, { paddingHorizontal: 8, paddingVertical: 5 }]}>Chọn một ngày để xem từng buổi học.</T>
    {days.map((day, index) => {
      const matching = sessions.filter(session => session.date === day);
      const minutes = matching.reduce((total, session) => total + session.duration, 0);
      const current = day === today;
      const label = parseDay(day).toLocaleDateString('vi-VN', { weekday: 'long' });
      const date = dateLabel(day);
      const count = `${matching.length} buổi`;
      return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${label}, ${date}, ${count}`}
        accessibilityHint="Mở lịch tự học theo ngày" onPress={() => onOpenDay(day)}
        style={({ pressed }) => ({ borderRadius: 12, backgroundColor: pressed || day === selected ? C.soft : C.card })}>
        <Row style={{ minHeight: 47, gap: 8, paddingHorizontal: 8, paddingVertical: 5,
          borderTopColor: C.line, borderTopWidth: index ? 1 : 0 }}>
          <View style={{ minWidth: 45, alignItems: 'center', paddingVertical: 5, paddingHorizontal: 3,
            borderRadius: 8, backgroundColor: current ? C.primary : C.canvas }}>
            <T style={{ fontFamily: F.bold, fontSize: 11, lineHeight: 16, color: current ? '#fff' : C.primary }}>{date}</T>
          </View>
          <T style={[S.grow, { fontFamily: F.semi, fontSize: 12 }]}>{current ? 'Hôm nay' : label}</T>
          <T style={{ fontFamily: matching.length ? F.bold : F.regular, fontSize: 11, lineHeight: 17, color: matching.length ? C.ink : C.muted }}>
            {count}{minutes ? ` · ${minutes} phút` : ''}
          </T>
          <Icon name="chevron-forward" size={15} color={C.muted} />
        </Row>
      </Pressable>;
    })}
  </Card>;
}
