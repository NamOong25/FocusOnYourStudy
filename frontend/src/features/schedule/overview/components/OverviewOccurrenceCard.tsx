import React from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Card, Icon, Row, T } from '../../../../shared/components';
import { C, F, S } from '../../../../shared/theme';
import { dateLabel } from '../../../../shared/utils/dates';
import type { ServerOccurrence } from '../../api/scheduleApi';
import { occurrenceClock, occurrenceStatus } from '../overview';

export default function OverviewOccurrenceCard({ row, title, now, context, onOpen }: {
  row: ServerOccurrence; title: string; now: Date; context: string; onOpen: (row: ServerOccurrence) => void;
}) {
  const clock = occurrenceClock(row), status = occurrenceStatus(row, now);
  return <Pressable accessibilityRole="button" accessibilityLabel={`${context}: buổi học ${title} ${clock.date} ${clock.start}`} onPress={() => onOpen(row)}>
    <Card style={{ gap: 11, padding: 15 }}>
      <Row style={{ flexWrap: 'wrap', gap: 7 }}><Badge label={status} bg={status === 'Đang học' ? C.greenSoft : C.track} color={status === 'Đang học' ? C.green : C.muted} />{row.changed && <Badge label="Đã điều chỉnh" bg={C.amberSoft} color={C.amber} />}</Row>
      <Row><View style={[S.grow, { gap: 6 }]}><T style={{ fontFamily: F.bold, fontSize: 15, lineHeight: 23 }}>{title}</T><T style={{ fontFamily: F.semi, color: C.primary, fontSize: 12, lineHeight: 20 }}>{dateLabel(clock.date)}/{clock.date.slice(0, 4)} · {clock.start} – {clock.endDate !== clock.date ? `${dateLabel(clock.endDate)} ` : ''}{clock.end}</T></View><Icon name="chevron-forward" size={18} /></Row>
      <T style={S.small}>{row.room ? `Phòng ${row.room}` : 'Chưa có phòng'} · {row.teacher || 'Chưa có giảng viên'}</T>
      {clock.different && <T style={S.small}>Giờ lịch gốc: {dateLabel(row.date)}/{row.date.slice(0, 4)} · {row.startTime} – {row.endTime} · {row.timeZone}</T>}
      {row.changed && !!row.reason && <T style={S.small}>{row.reason}</T>}
    </Card>
  </Pressable>;
}
