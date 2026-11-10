import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Button, Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import { formatStudyTime, type StatisticsData } from '../statistics';
import type { StatisticsPeriod } from '../api/pomodoroStatisticsApi';

const fullDate = (day: string) => `${dateLabel(day)}/${day.slice(0, 4)}`;
const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
type ChartData = Pick<StatisticsData, 'buckets' | 'groupedDays'> & ({ entries: StatisticsData['entries'] } | { completedSessions: number });
export function StudyTimeChart({ data, onStart, startLabel, preferredDay, period }: { data: ChartData; onStart: () => void; startLabel: string; preferredDay?: string; period?: StatisticsPeriod }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selected = data.buckets.find(bucket => bucket.from === selectedDay) ?? data.buckets.find(bucket => bucket.from === preferredDay) ?? data.buckets[data.buckets.length - 1];
  const [width, setWidth] = useState(240);
  const count = 'completedSessions' in data ? data.completedSessions : data.entries.length;
  const wide = data.buckets.length > 7;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const firstDay = data.buckets[0]?.from, lastDay = data.buckets[data.buckets.length - 1]?.to;
  useEffect(() => {
    setSelectedDay(null);
    const index = Math.max(0, data.buckets.findIndex(bucket => bucket.from === preferredDay));
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ x: wide ? Math.max(0, index * 38 - width / 2 + 19) : 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [firstDay, lastDay, width, preferredDay, wide]);
  const max = Math.max(25, Math.ceil(Math.max(...data.buckets.map(bucket => bucket.seconds / 60), 0) / 25) * 25);
  const plotHeight = period ? 104 : 120;
  const grid = [24, 24 + plotHeight / 2, 24 + plotHeight];
  return <Card style={period ? { padding: 15, gap: 12 } : { gap: 16 }}>
    <Row between><T accessibilityRole="header" style={[S.grow, { fontFamily: F.bold, fontSize: 16, lineHeight: 24 }]}>{data.groupedDays ? 'Thời gian học theo giai đoạn' : 'Thời gian học mỗi ngày'}</T><T style={S.small}>Phút</T></Row>
    {!count ? <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <Icon name="bar-chart-outline" color={C.lavender} size={35} /><T style={{ fontFamily: F.bold, fontSize: 14, textAlign: 'center' }}>Chưa có phiên học trong khoảng này</T><T style={[S.small, { textAlign: 'center' }]}>Hoàn tất phiên tập trung hoặc chọn khoảng ngày khác để xem biểu đồ.</T><Button label={startLabel} secondary onPress={onStart} />
    </View> : <>
      <Row style={{ alignItems: 'flex-start', gap: 7 }}>
        <View style={{ width: 30, height: grid[2] }}>{[max, max / 2, 0].map((value, index) => <T key={value} style={{ position: 'absolute', top: grid[index]! - 7, right: 0, fontSize: 9, lineHeight: 14, color: C.muted }}>{Number.isInteger(value) ? value : value.toFixed(1)}</T>)}</View>
        <View style={{ flex: 1, minWidth: 0 }} onLayout={e => setWidth(Math.round(e.nativeEvent.layout.width))}>
          <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={wide} accessibilityLabel="Biểu đồ thời gian học, vuốt ngang để xem các ngày">
          <View style={{ width: Math.max(width, wide ? data.buckets.length * 38 : 0), paddingBottom: 8 }}>
          <View style={{ height: grid[2], borderBottomWidth: 1, borderColor: C.line }}>
            {grid.slice(0, -1).map(top => <View key={top} style={{ position: 'absolute', top, left: 0, right: 0, borderTopWidth: 1, borderColor: C.line, borderStyle: period ? 'solid' : 'dashed' }} />)}
            <Row style={{ height: '100%', alignItems: 'flex-end', gap: 5 }}>{data.buckets.map(bucket => <Pressable key={bucket.from} accessibilityRole="button" accessibilityLabel={`${bucket.from === bucket.to ? 'Ngày ' + fullDate(bucket.from) : fullDate(bucket.from) + ' đến ' + fullDate(bucket.to)}: ${formatStudyTime(bucket.seconds)}, ${bucket.sessions} phiên`} accessibilityState={{ selected: selected?.from === bucket.from }} onPress={() => setSelectedDay(bucket.from)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              <T numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 9, lineHeight: 14, color: selected?.from === bucket.from ? C.primary : C.muted, fontFamily: F.bold }}>{Math.floor(bucket.seconds / 60)}</T>
              <View style={{ height: Math.max(period ? 2 : 0, bucket.seconds / 60 / max * plotHeight), width: '78%', maxWidth: 35, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: selected?.from === bucket.from ? C.primary : period && bucket.seconds ? C.purple : C.lavender }} />
            </Pressable>)}</Row>
          </View>
          <Row style={{ alignItems: 'flex-start', gap: 5, marginTop: 8 }}>{data.buckets.map((bucket, index) => <View key={bucket.from} style={{ flex: 1, minWidth: 0 }}><T numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'center', fontSize: data.groupedDays ? 8 : 10, color: selected?.from === bucket.from ? C.primary : C.muted }}>{period === 'WEEK' ? weekdays[index] : data.groupedDays ? dateLabel(bucket.from) : bucket.from.slice(8)}</T>{bucket.from !== bucket.to && <T numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'center', fontSize: 8, color: C.muted }}>{dateLabel(bucket.to)}</T>}</View>)}</Row>
          </View></ScrollView>
        </View>
      </Row>
      {selected && (!period || selectedDay === selected.from) && <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: 14, backgroundColor: C.canvas, gap: 4 }}><T style={{ fontFamily: F.semi, fontSize: 12 }}>{fullDate(selected.from)}{selected.from !== selected.to ? ` – ${fullDate(selected.to)}` : ''}</T><T style={{ color: C.primary, fontSize: 12 }}>{formatStudyTime(selected.seconds)} · {selected.sessions} phiên hoàn tất</T></View>}
      <T style={S.small}>{wide ? 'Vuốt ngang để xem đủ từng ngày trong tháng. ' : ''}{data.groupedDays ? 'Mỗi cột cộng các ngày trong khoảng ghi bên dưới. ' : ''}Chạm cột để xem chi tiết.{!period && ' Chỉ tính phiên tập trung đã hoàn tất.'}</T>
    </>}
  </Card>;
}
