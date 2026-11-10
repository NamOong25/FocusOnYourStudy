import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Icon, Row, Section, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateKey, dateLabel } from '../../../shared/utils/dates';
import { courseColors, type CourseColor } from '../../academics/academic';
import { dayNames } from '../calendar';

export type TimetableEntry = {
  id: string; date: string; start: string; end: string; title: string; code?: string; room: string; color?: CourseColor;
  status?: 'Đã nghỉ' | 'Đã điều chỉnh'; exam?: boolean; onOpen: () => void;
};

const timeWidth = 47;
const minColumnWidth = 59;

const entryTone = (entry: TimetableEntry) => entry.status === 'Đã nghỉ' ? { bg: C.redSoft, ink: C.red }
  : entry.status === 'Đã điều chỉnh' || entry.exam ? { bg: C.amberSoft, ink: C.amber } : courseColors[entry.color ?? 'lavender'];
const entryLabel = (entry: TimetableEntry) => `${entry.exam ? 'Xem kỳ thi' : 'Xem buổi học'} ${entry.title}, ${dateLabel(entry.date)}, ${entry.start} đến ${entry.end}${entry.status ? `, ${entry.status}` : ''}`;

export function ScheduleWeekGrid({ days, selected, entries, disabled, onDay }: {
  days: Date[]; selected: string; entries: TimetableEntry[]; disabled?: boolean; onDay: (day: Date) => void;
}) {
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const [width, setWidth] = useState(0);
  const columnWidth = Math.max(minColumnWidth, (width - timeWidth - 2) / days.length);
  const columns = days.map(dateKey);
  const selectedColumn = columns.indexOf(selected);
  const slots = useMemo(() => {
    const byTime = new Map<string, Map<string, TimetableEntry[]>>();
    for (const entry of entries) {
      if (!byTime.has(entry.start)) byTime.set(entry.start, new Map());
      const dates = byTime.get(entry.start)!;
      if (!dates.has(entry.date)) dates.set(entry.date, []);
      dates.get(entry.date)!.push(entry);
    }
    return [...byTime].sort(([a], [b]) => a.localeCompare(b));
  }, [entries]);

  useEffect(() => {
    if (width > 0) scroll.current?.scrollTo({ x: Math.max(0, timeWidth + (selectedColumn + 1) * columnWidth + 2 - width), animated: false });
  }, [width, selectedColumn, columnWidth]);

  return <View style={{ gap: 6 }}>
    <View testID="timetable-week" style={styles.gridFrame} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator style={{ flexGrow: 0 }}>
        <View>
          <Row style={styles.gridRow}>
            <View style={[styles.hour, { width: timeWidth }]}><T style={styles.gridCaption}>Giờ</T></View>
            {days.map((day, index) => {
              const key = columns[index]!, active = key === selected;
              return <Pressable key={key} onPress={() => onDay(day)} accessibilityRole="button" accessibilityLabel={`Xem lịch ngày ${dateLabel(key)}`}
                accessibilityState={{ selected: active }} style={[styles.columnHeader, { width: columnWidth }, active && styles.activeDay]}>
                <T style={[styles.gridCaption, active && styles.selectedText]}>{dayNames[day.getDay()]}</T>
                <T style={[styles.gridCaption, active && styles.selectedText]}>{dateLabel(key)}</T>
              </Pressable>;
            })}
          </Row>
          {slots.map(([time, dates]) => <Row key={time} style={[styles.gridRow, styles.gridLine]}>
            <View style={[styles.hour, { width: timeWidth }]}><T style={styles.gridCaption}>{time}</T></View>
            {columns.map(date => <View key={date} style={[styles.cell, { width: columnWidth }, date === selected && styles.selectedColumn]}>
              {dates.get(date)?.map(entry => {
                const tone = entryTone(entry);
                return <Pressable key={entry.id} disabled={disabled} accessibilityRole="button" accessibilityLabel={entryLabel(entry)} onPress={entry.onOpen}
                  style={({ pressed }) => [styles.event, { backgroundColor: tone.bg }, pressed && { opacity: 0.7 }]}>
                  <T numberOfLines={entry.code ? 1 : 2} style={[styles.eventTitle, { color: tone.ink }]}>{entry.code || entry.title}</T>
                  {!!entry.status && <T style={[styles.eventStatus, { color: tone.ink }]}>{entry.status === 'Đã nghỉ' ? 'Nghỉ' : 'Đã đổi'}</T>}
                </Pressable>;
              })}
            </View>)}
          </Row>)}
        </View>
      </ScrollView>
    </View>
    {width > 0 && timeWidth + minColumnWidth * days.length + 2 > width && <T style={S.small}>Vuốt ngang để xem hết tuần.</T>}
    {!slots.length && <T style={S.small}>Tuần này chưa có buổi học.</T>}
  </View>;
}

export function ScheduleDayList({ date, entries, disabled }: { date: string; entries: TimetableEntry[]; disabled?: boolean }) {
  return <View testID="timetable-day" style={{ gap: 8 }}>
    <Section title={date === dateKey(new Date()) ? 'Lịch hôm nay' : `Lịch ngày ${dateLabel(date)}`} />
    {!entries.length && <Card style={styles.empty}><T style={S.small}>Chưa có buổi học trong ngày này.</T></Card>}
    {entries.map(entry => {
      const tone = entryTone(entry);
      return <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={entryLabel(entry)} onPress={entry.onOpen} disabled={disabled}
        style={({ pressed }) => [styles.dayRow, pressed && { opacity: 0.7 }]}>
        <View style={[styles.timeBox, { backgroundColor: tone.bg }]}>
          <T style={[styles.start, { color: tone.ink }]}>{entry.start}</T><T style={styles.end}>{entry.end}</T>
        </View>
        <View style={[S.grow, { gap: 2 }]}>
          <T style={[styles.dayTitle, entry.status === 'Đã nghỉ' && { textDecorationLine: 'line-through' }]}>{entry.exam ? `Thi: ${entry.title}` : entry.title}</T>
          <T style={S.small}>{entry.room ? `Phòng ${entry.room}` : 'Chưa có phòng'}{entry.status ? ` · ${entry.status}` : ''}</T>
        </View>
        <Icon name="chevron-forward" size={16} color={C.muted} />
      </Pressable>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  gridFrame: { borderWidth: 1, borderColor: C.line, borderRadius: 16, backgroundColor: '#fff', overflow: 'hidden' },
  gridRow: { alignItems: 'stretch', gap: 0 },
  gridLine: { borderTopWidth: 1, borderColor: C.line },
  hour: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAF9FD' },
  gridCaption: { textAlign: 'center', fontFamily: F.semi, fontSize: 11, lineHeight: 17 },
  columnHeader: { borderLeftWidth: 1, borderColor: C.line, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  activeDay: { backgroundColor: C.soft },
  selectedText: { color: C.primary, fontFamily: F.bold },
  selectedColumn: { backgroundColor: '#FAF7FF' },
  cell: { gap: 4, minHeight: 53, borderLeftWidth: 1, borderColor: C.line, padding: 3 },
  event: { minHeight: 44, borderRadius: 8, padding: 4, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { width: '100%', textAlign: 'center', fontFamily: F.bold, fontSize: 11, lineHeight: 15 },
  eventStatus: { fontSize: 9, lineHeight: 13 },
  dayRow: { ...S.row, padding: 11, gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: C.line, borderRadius: 15 },
  timeBox: { minWidth: 56, borderRadius: 11, padding: 7, alignItems: 'center' },
  start: { fontFamily: F.bold, fontSize: 13, lineHeight: 19 },
  end: { color: C.muted, fontSize: 10, lineHeight: 15 },
  dayTitle: { fontFamily: F.bold, fontSize: 14, lineHeight: 21 },
  empty: { padding: 13 },
});
