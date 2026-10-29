import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Icon, Row, Sheet, T } from '../../../shared/components';
import { DateField } from '../../../shared/components/DateTimePicker';
import { C, F, S } from '../../../shared/theme';
import { statisticsWindow, type StatisticsPeriod } from '../api/pomodoroStatisticsApi';

export type StatisticsOption = { id: string; label: string; hint?: string };
export function StatisticsFilterButton({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={{ flexGrow: 1, borderWidth: 1, borderColor: C.line, backgroundColor: C.canvas, borderRadius: 16, padding: 13, gap: 7 }}>
    <T style={S.small}>{label}</T><Row><T style={[S.grow, { fontFamily: F.semi, fontSize: 13, lineHeight: 21 }]}>{value}</T><Icon name="chevron-down" size={16} /></Row>
  </Pressable>;
}
export function StatisticsFilterSheet({ title, allLabel, options, selected, loading, error, onRetry, onSelect, onClose }: {
  title: string; allLabel: string; options: StatisticsOption[]; selected: StatisticsOption | null; loading: boolean; error?: string;
  onRetry: () => void; onSelect: (option: StatisticsOption | null) => void; onClose: () => void;
}) {
  const choices: StatisticsOption[] = [{ id: '', label: allLabel }, ...options];
  if (selected && !choices.some(option => option.id === selected.id)) choices.push(selected);
  return <Sheet title={title} onClose={onClose}>
    {choices.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label + (option.hint ? `, ${option.hint}` : '')} accessibilityState={{ checked: (selected?.id ?? '') === option.id }} aria-checked={(selected?.id ?? '') === option.id} onPress={() => onSelect(option.id ? option : null)} style={{ padding: 15, minHeight: 58, borderRadius: 16, backgroundColor: (selected?.id ?? '') === option.id ? C.soft : C.canvas }}>
      <Row><Icon name={(selected?.id ?? '') === option.id ? 'radio-button-on' : 'radio-button-off'} /><View style={S.grow}><T style={{ fontFamily: F.semi, fontSize: 13, lineHeight: 21 }}>{option.label}</T>{option.hint && <T style={S.small}>{option.hint}</T>}</View></Row>
    </Pressable>)}
    {loading && <T style={S.small}>Đang tải danh sách…</T>}
    {!!error && <><T accessibilityRole="alert" style={{ color: C.red, lineHeight: 21 }}>{error}</T><Button secondary label="Thử lại danh sách" onPress={onRetry} /></>}
    {!loading && !error && options.length === 0 && <T style={S.small}>Chưa có lựa chọn trong danh sách này. Bạn vẫn có thể xem tất cả.</T>}
  </Sheet>;
}
export function StatisticsAnchorSheet({ date, period, onApply, onClose }: { date: string; period: StatisticsPeriod; onApply: (date: string) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(date), [error, setError] = useState('');
  return <Sheet title={period === 'WEEK' ? 'Chọn ngày trong tuần muốn xem' : 'Chọn ngày trong tháng muốn xem'} onClose={onClose}>
    <T style={S.small}>{period === 'WEEK' ? 'Hiển thị từ thứ Hai đến Chủ nhật của tuần chứa ngày bạn chọn.' : 'Hiển thị toàn bộ tháng chứa ngày bạn chọn.'}</T>
    <DateField label="Ngày muốn xem thống kê" value={draft} onChange={value => { setDraft(value); setError(''); }} />
    {!!error && <T accessibilityRole="alert" style={{ color: C.red, lineHeight: 21 }}>{error}</T>}
    <Button label="Xem thống kê ngày đã chọn" onPress={() => { try { statisticsWindow(period, draft); onApply(draft); } catch { setError('Chọn ngày để cả tuần/tháng nằm trong năm 1900–2099.'); } }} />
  </Sheet>;
}
