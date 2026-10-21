import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import { formatStudyTime, type StatisticsData } from '../statistics';

const fullDate = (day: string) => `${dateLabel(day)}/${day.slice(0, 4)}`;
export function StudyTimeChart({ data, onStart, startLabel }: { data: StatisticsData; onStart: () => void; startLabel: string }) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const selected = data.buckets.find(bucket => bucket.from === selectedDay) ?? data.buckets[data.buckets.length - 1];
  const max = Math.max(25, Math.ceil(Math.max(...data.buckets.map(bucket => bucket.seconds / 60), 0) / 25) * 25);
  return <Card style={{ gap: 16 }}>
    <Row between><T accessibilityRole="header" style={[S.grow, { fontFamily: F.bold, fontSize: 16, lineHeight: 24 }]}>{data.groupedDays ? 'Thời gian học theo giai đoạn' : 'Thời gian học mỗi ngày'}</T><T style={S.small}>Phút</T></Row>
    {!data.entries.length ? <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10 }}>
      <Icon name="bar-chart-outline" color={C.lavender} size={35} /><T style={{ fontFamily: F.bold, fontSize: 14, textAlign: 'center' }}>Chưa có phiên học trong khoảng này</T><T style={[S.small, { textAlign: 'center' }]}>Hoàn tất phiên tập trung hoặc chọn khoảng ngày khác để xem biểu đồ.</T><Button label={startLabel} secondary onPress={onStart} />
    </View> : <>
      <Row style={{ alignItems: 'flex-start', gap: 7 }}>
        <View style={{ width: 30, height: 144 }}>{[max, max / 2, 0].map((value, index) => <T key={value} style={{ position: 'absolute', top: 18 + index * 60, right: 0, fontSize: 9, lineHeight: 12, color: C.muted }}>{Number.isInteger(value) ? value : value.toFixed(1)}</T>)}</View>
        <View style={S.grow}>
          <View style={{ height: 144, borderBottomWidth: 1, borderColor: C.line }}>
            {[24, 84, 144].map(top => <View key={top} style={{ position: 'absolute', top, left: 0, right: 0, borderTopWidth: 1, borderColor: C.line, borderStyle: 'dashed' }} />)}
            <Row style={{ height: '100%', alignItems: 'flex-end', gap: 5 }}>{data.buckets.map(bucket => <Pressable key={bucket.from} accessibilityRole="button" accessibilityLabel={`${bucket.from === bucket.to ? 'Ngày ' + fullDate(bucket.from) : fullDate(bucket.from) + ' đến ' + fullDate(bucket.to)}: ${formatStudyTime(bucket.seconds)}, ${bucket.sessions} phiên`} accessibilityState={{ selected: selected?.from === bucket.from }} onPress={() => setSelectedDay(bucket.from)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              <T numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 9, lineHeight: 12, color: selected?.from === bucket.from ? C.primary : C.muted, fontFamily: F.bold }}>{Math.floor(bucket.seconds / 60)}</T>
              <View style={{ height: bucket.seconds / 60 / max * 120, width: '78%', maxWidth: 35, borderTopLeftRadius: 7, borderTopRightRadius: 7, backgroundColor: selected?.from === bucket.from ? C.primary : C.lavender }} />
            </Pressable>)}</Row>
          </View>
          <Row style={{ alignItems: 'flex-start', gap: 5, marginTop: 8 }}>{data.buckets.map(bucket => <View key={bucket.from} style={{ flex: 1, minWidth: 0 }}><T numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'center', fontSize: data.groupedDays ? 8 : 10, color: selected?.from === bucket.from ? C.primary : C.muted }}>{data.groupedDays ? dateLabel(bucket.from) : bucket.from.slice(8)}</T>{bucket.from !== bucket.to && <T numberOfLines={1} adjustsFontSizeToFit style={{ textAlign: 'center', fontSize: 8, color: C.muted }}>{dateLabel(bucket.to)}</T>}</View>)}</Row>
        </View>
      </Row>
      {selected && <View accessibilityLiveRegion="polite" style={{ padding: 12, borderRadius: 14, backgroundColor: C.canvas, gap: 4 }}><T style={{ fontFamily: F.semi, fontSize: 12 }}>{fullDate(selected.from)}{selected.from !== selected.to ? ` – ${fullDate(selected.to)}` : ''}</T><T style={{ color: C.primary, fontSize: 12 }}>{formatStudyTime(selected.seconds)} · {selected.sessions} phiên hoàn tất</T></View>}
      <T style={S.small}>{data.groupedDays ? 'Mỗi cột cộng các ngày trong khoảng ghi bên dưới. ' : ''}Chạm cột để xem chi tiết. Chỉ tính phiên tập trung đã hoàn tất.</T>
    </>}
  </Card>;
}
