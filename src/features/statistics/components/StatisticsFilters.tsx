import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Badge, Button, Icon, Row, Sheet, T } from '../../../shared/components';
import { DateField } from '../../../shared/components/DateTimePicker';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import type { Semester } from '../../academics/academic';
import { validateStatisticsRange, type StatisticsRange } from '../statistics';

export function StatisticsSemesterSelector({ semester, onPress }: { semester: Semester; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Chọn học kỳ thống kê" onPress={onPress} style={[S.card, { paddingVertical: 17 }]}>
    <Row style={{ gap: 12 }}><View style={{ width: 40, height: 44, borderRadius: 13, backgroundColor: C.soft, justifyContent: 'center', alignItems: 'center' }}><Icon name="calendar-outline" size={24} /></View><View style={[S.grow, { gap: 4 }]}><T style={{ fontFamily: F.bold, fontSize: 16 }}>{semester.name}</T><T style={S.small}>Năm học {semester.academicYear}</T></View><Icon name="chevron-down" size={18} /></Row>
  </Pressable>;
}
export function StatisticsSemesterSheet({ semesters, selectedId, onSelect, onManage, onClose }: { semesters: Semester[]; selectedId: string; onSelect: (id: string) => void; onManage: () => void; onClose: () => void }) {
  return <Sheet title="Học kỳ thống kê" onClose={onClose}>
    <T style={S.small}>Thời gian học, phân bổ môn và bài tập hiển thị theo học kỳ bạn chọn.</T>
    {[...semesters].sort((a, b) => b.academicYear.localeCompare(a.academicYear) || a.term - b.term).map(semester => <Pressable key={semester.id} accessibilityRole="radio" accessibilityLabel={`Thống kê: ${semester.name}, ${semester.academicYear}`} accessibilityState={{ checked: selectedId === semester.id }} onPress={() => onSelect(semester.id)} style={{ padding: 15, minHeight: 80, borderRadius: 18, borderWidth: 1, borderColor: selectedId === semester.id ? C.primary : C.line, backgroundColor: selectedId === semester.id ? C.soft : C.canvas }}>
      <Row><Icon name={selectedId === semester.id ? 'radio-button-on' : 'radio-button-off'} /><View style={[S.grow, { gap: 5 }]}><T style={{ fontFamily: F.bold, fontSize: 15 }}>{semester.name}</T><T style={S.small}>{semester.academicYear}</T></View></Row><View style={{ marginTop: 10 }}><Badge label={semester.status} /></View>
    </Pressable>)}
    <Button label="Quản lý học kỳ và môn" secondary onPress={onManage} />
  </Sheet>;
}
export function StatisticsDateRangeSheet({ range, onApply, onClose }: { range: StatisticsRange; onApply: (range: StatisticsRange) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(range), [error, setError] = useState('');
  return <Sheet title="Khoảng ngày thống kê" onClose={onClose}>
    <T style={S.small}>Tính cả ngày bắt đầu và kết thúc. Khoảng dài được gộp thành tối đa 7 cột để dễ xem trên điện thoại.</T>
    <DateField label="Từ ngày thống kê" value={draft.from} onChange={from => { setDraft(value => ({ ...value, from })); setError(''); }} />
    <DateField label="Đến ngày thống kê" value={draft.to} onChange={to => { setDraft(value => ({ ...value, to })); setError(''); }} />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red, fontSize: 12, lineHeight: 20 }}>{error}</T>}
    <Button label="Áp dụng khoảng ngày" icon="checkmark" onPress={() => { const message = validateStatisticsRange(draft); if (message) setError(message); else onApply(draft); }} />
    <Button label="Hủy chọn khoảng ngày" secondary onPress={onClose} />
  </Sheet>;
}
export function StatisticsRangeCaption({ range }: { range: StatisticsRange }) {
  return <T style={[S.small, { textAlign: 'center' }]}>{dateLabel(range.from)}/{range.from.slice(0, 4)} – {dateLabel(range.to)}/{range.to.slice(0, 4)}</T>;
}
