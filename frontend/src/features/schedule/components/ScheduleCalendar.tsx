import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Card, Icon, IconButton, Link, Row, Segments, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { addDays, dateKey, dateLabel } from '../../../shared/utils/dates';
import { dayNames } from '../calendar';
import { scheduleWindow, type CalendarView } from '../scheduleView';

const modes = { Tuần: 'Theo tuần', Ngày: 'Theo ngày', Tháng: 'Theo tháng' } as const;
const labels = { 'Theo tuần': 'Tuần', 'Theo ngày': 'Ngày', 'Theo tháng': 'Tháng' } as const;
const valid = (date: string) => date >= '1900-01-01' && date <= '2099-12-31';

export default function ScheduleCalendar({ selected, view, onSelect, onView, hasEvent, eventColor = C.primary, showViewPicker = true }: {
  selected: Date; view: CalendarView; onSelect: (date: Date) => void; onView: (view: CalendarView) => void;
  hasEvent: (date: string) => boolean; eventColor?: string; showViewPicker?: boolean;
}) {
  const { grid, from, to } = scheduleWindow(selected, view), now = new Date();
  const day = dateKey(selected), today = dateKey(now);
  const offset = (direction: number) => view === 'Theo tháng'
    ? new Date(selected.getFullYear(), selected.getMonth() + direction, 1)
    : addDays(selected, direction * (view === 'Theo tuần' ? 7 : 1));
  const previous = offset(-1), next = offset(1);
  const period = view === 'Theo tuần' ? `${dateLabel(from)} – ${dateLabel(to)}`
    : view === 'Theo tháng' ? `Tháng ${selected.getMonth() + 1}, ${selected.getFullYear()}`
      : selected.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });

  return <View style={{ gap: 9 }}>
    <Row between style={styles.periodRow}>
      <IconButton name="chevron-back" bg="#fff" label="Khoảng trước" disabled={!valid(dateKey(previous))} onPress={() => onSelect(previous)} />
      {view === 'Theo tháng' ? <T style={styles.period}>{period}</T>
        : <Pressable accessibilityRole="button" accessibilityLabel={`Chọn ngày qua lịch tháng, ${period}`} onPress={() => onView('Theo tháng')} style={styles.periodButton}>
          <Icon name="calendar-outline" size={17} /><T style={styles.period}>{period}</T><Icon name="chevron-down" size={14} />
        </Pressable>}
      <IconButton name="chevron-forward" bg="#fff" label="Khoảng sau" disabled={!valid(dateKey(next))} onPress={() => onSelect(next)} />
    </Row>
    {showViewPicker && <Segments values={Object.keys(modes)} value={labels[view]} onChange={value => onView(modes[value as keyof typeof modes])} />}
    {view !== 'Theo tuần' && <Card style={styles.calendar}>
      {view === 'Theo tháng' && <Row style={{ gap: 0 }}>{grid.slice(0, 7).map(date => <T key={dateKey(date)} style={styles.weekday}>{dayNames[date.getDay()]}</T>)}</Row>}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {grid.map(date => {
          const key = dateKey(date), active = key === day, selectable = valid(key);
          return <Pressable key={key} disabled={!selectable} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString('vi-VN')}
            accessibilityState={{ selected: active, disabled: !selectable }} onPress={() => onSelect(date)} style={[styles.day, !selectable && { opacity: 0.3 }]}>
            {view === 'Theo ngày' && <T style={[styles.dayName, key === today && { color: C.primary }]}>{dayNames[date.getDay()]}</T>}
            <T style={[styles.dayNumber, key === today && { color: C.primary }, view === 'Theo tháng' && date.getMonth() !== selected.getMonth() && { color: C.muted }, active && styles.active]}>{date.getDate()}</T>
            <View style={[styles.dot, selectable && hasEvent(key) && { backgroundColor: eventColor }]} />
          </Pressable>;
        })}
      </View>
    </Card>}
    {day !== today && <View style={{ alignItems: 'flex-end' }}><Link label="Về hôm nay" onPress={() => onSelect(now)} /></View>}
  </View>;
}

const styles = StyleSheet.create({
  periodRow: { borderWidth: 1, borderColor: C.line, borderRadius: 15, backgroundColor: '#fff', gap: 2, paddingHorizontal: 3 },
  periodButton: { ...S.row, justifyContent: 'center', flex: 1, minHeight: 46, paddingHorizontal: 2 },
  period: { textAlign: 'center', flexShrink: 1, fontFamily: F.bold, fontSize: 13, lineHeight: 19 },
  calendar: { gap: 3, padding: 5, borderRadius: 15 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: F.semi, fontSize: 11, lineHeight: 19, color: C.muted },
  day: { width: `${100 / 7}%`, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 1 },
  dayName: { fontFamily: F.semi, fontSize: 10, lineHeight: 15, color: C.muted },
  dayNumber: { fontFamily: F.bold, fontSize: 13, lineHeight: 19, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 24, textAlign: 'center' },
  active: { backgroundColor: C.primary, color: '#fff' },
  dot: { width: 4, height: 4, borderRadius: 3, backgroundColor: 'transparent' },
});
