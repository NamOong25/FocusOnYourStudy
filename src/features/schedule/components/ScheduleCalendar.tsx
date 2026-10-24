import React from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, IconButton, Row, Segments, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateKey } from '../../../shared/utils/dates';
import { scheduleWindow, type CalendarView } from '../scheduleView';

export default function ScheduleCalendar({ selected, view, onSelect, onView, hasEvent, onNew }: {
  selected: Date; view: CalendarView; onSelect: (date: Date) => void; onView: (view: CalendarView) => void;
  hasEvent: (date: string) => boolean; onNew?: () => void;
}) {
  const { grid } = scheduleWindow(selected, view), now = new Date();
  const go = (direction: number) => {
    const next = view === 'Theo tháng' ? new Date(selected.getFullYear(), selected.getMonth() + direction, 1) : new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + direction * 7);
    if (next.getFullYear() >= 1900 && next.getFullYear() <= 2099) onSelect(next);
  };
  return <>
    <Row><View style={S.grow}><Segments values={['Theo ngày', 'Theo tuần', 'Theo tháng']} value={view} onChange={v => onView(v as CalendarView)} /></View>{onNew && <IconButton name="add" label="Thêm lịch học" onPress={onNew} />}</Row>
    <Card style={{ gap: 13, padding: 16 }}>
      <Row between><T style={{ fontFamily: F.bold, fontSize: 16 }}>Tháng {String(selected.getMonth() + 1).padStart(2, '0')}, {selected.getFullYear()}</T><Row><IconButton name="chevron-back" bg="#fff" label="Khoảng trước" onPress={() => go(-1)} /><IconButton name="chevron-forward" bg="#fff" label="Khoảng sau" onPress={() => go(1)} /></Row></Row>
      <View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => <T key={d} style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, color: C.muted }}>{d}</T>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 6 }}>{grid.map(date => {
        const key = dateKey(date), active = key === dateKey(selected), valid = key >= '1900-01-01' && key <= '2099-12-31';
        return <Pressable key={key} disabled={!valid} accessibilityRole="button" accessibilityLabel={date.toLocaleDateString('vi-VN')} accessibilityState={{ selected: active, disabled: !valid }} onPress={() => onSelect(date)} style={{ width: `${100 / 7}%`, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: valid ? 1 : 0.3 }}><View style={{ alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: active ? C.primary : 'transparent', width: 37, minHeight: 47, borderRadius: 13 }}><T style={{ fontFamily: active ? F.bold : F.medium, fontSize: 14, color: active ? '#fff' : date.getMonth() !== selected.getMonth() ? '#B7B7C4' : C.ink }}>{date.getDate()}</T><View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: valid && hasEvent(key) ? active ? '#fff' : C.lavender : 'transparent' }} /></View></Pressable>;
      })}</View>
      {dateKey(selected) !== dateKey(now) && <Button label="Về hôm nay" secondary onPress={() => onSelect(now)} />}
    </Card>
  </>;
}
