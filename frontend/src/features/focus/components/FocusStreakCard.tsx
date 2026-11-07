import React from 'react';
import { View } from 'react-native';
import { Card, Icon, Row, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import type { focusSummary } from '../focus';

const weekdays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
export function FocusStreakCard({ summary }: { summary: ReturnType<typeof focusSummary> }) {
  return <Card style={{ gap: 15 }}>
    <Row style={{ gap: 10 }}><Icon name="flame-outline" color={C.amber} size={25} /><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 17 }}>Chuỗi {summary.streak} ngày học</T><T style={S.small}>{summary.studiedToday ? 'Hôm nay bạn đã giữ nhịp học.' : summary.streak ? 'Học một phiên hôm nay để nối tiếp chuỗi.' : 'Hoàn thành phiên đầu tiên để bắt đầu chuỗi.'}</T></View></Row>
    <Row style={{ gap: 4, alignItems: 'flex-start' }}>
      {summary.days.map(day => <View key={day.key} accessible accessibilityLabel={`${dateLabel(day.key)}: ${day.studied ? 'Đã học' : 'Chưa học'}${day.today ? ', hôm nay' : ''}`} style={{ flex: 1, minWidth: 0, alignItems: 'center', gap: 7 }}>
        <T style={{ fontSize: 10, color: C.muted }}>{weekdays[day.date.getDay()]}</T>
        <View style={{ width: 27, height: 27, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: day.studied ? C.primary : C.track, borderWidth: day.today ? 1.5 : 0, borderColor: C.primary }}>
          {day.studied ? <Icon name="checkmark" size={15} color="#fff" /> : <T style={{ fontSize: 11, color: day.today ? C.primary : C.muted }}>{day.date.getDate()}</T>}
        </View>
        <T style={{ fontSize: 9, color: day.today ? C.primary : C.muted }}>{day.today ? 'Nay' : dateLabel(day.key)}</T>
      </View>)}
    </Row>
    <T style={S.small}>Mỗi ngày hoàn tất ít nhất 1 phiên là giữ chuỗi. Chưa học hôm nay vẫn giữ chuỗi đến hết ngày; bỏ lỡ trọn một ngày sẽ bắt đầu lại.</T>
  </Card>;
}
