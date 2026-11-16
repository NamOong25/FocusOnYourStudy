import React, { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Card, Field, Icon, Row, T, type IconName } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { reminderLabel } from '../../schedule/calendar';

const quickMinutes = [15, 60, 1440];
const fullMinutes = [0, 5, 15, 30, 60, 180, 1440];
const minuteLabel = (minutes: number) => minutes === 0 ? 'Đúng giờ thi'
  : minutes % 1440 === 0 || minutes % 60 === 0 ? reminderLabel(minutes) : `${minutes} phút`;

export function ExamFormatPicker<TFormat extends string>({ value, options, onChange, disabled }: {
  value: TFormat; options: readonly TFormat[]; onChange: (format: TFormat) => void; disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.group}>
    <T style={styles.label}>Hình thức thi</T>
    <Pressable accessibilityRole="button" accessibilityLabel={`Hình thức thi, ${value}`}
      accessibilityState={{ expanded, disabled }} disabled={disabled} onPress={() => setExpanded(open => !open)}
      style={[styles.field, expanded && { borderColor: C.primary }]}>
      <T style={[styles.label, S.grow]}>{value}</T>
      <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16} />
    </Pressable>
    {expanded && <Card style={styles.options}>
      {options.map(option => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: option === value, disabled }}
        disabled={disabled} onPress={() => { onChange(option); setExpanded(false); }}
        style={[styles.option, option === value && { backgroundColor: C.soft }]}>
        <T style={[styles.label, S.grow]}>{option}</T>
        {option === value && <Icon name="checkmark" size={16} />}
      </Pressable>)}
    </Card>}
  </View>;
}

export function ExamExtraFields({ reminder, minutes, notes, onReminderChange, onNotesChange, disabled }: {
  reminder: boolean; minutes: number[]; notes: string; onReminderChange: (enabled: boolean, minutes: number[]) => void;
  onNotesChange: (notes: string) => void; disabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const selectedMinutes = reminder ? minutes : [];
  const summary = !reminder ? 'Không nhắc' : minutes.length > 2 ? `${minutes.length} mốc`
    : minutes.map(minuteLabel).join(' · ');
  const toggle = (minute: number) => {
    setError('');
    const checked = selectedMinutes.includes(minute);
    if (!checked && selectedMinutes.length >= 10) { setError('Chọn tối đa 10 mốc nhắc.'); return; }
    const next = checked ? selectedMinutes.filter(value => value !== minute)
      : [...selectedMinutes, minute].sort((a, b) => b - a);
    onReminderChange(next.length > 0, next);
  };
  const add = () => {
    const minute = Number(custom);
    if (!/^\d{1,5}$/.test(custom) || minute > 10080) { setError('Nhập số phút nguyên từ 0 đến 10080.'); return; }
    if (selectedMinutes.includes(minute)) { setError('Mốc nhắc này đã được chọn.'); return; }
    if (selectedMinutes.length >= 10) { setError('Chọn tối đa 10 mốc nhắc.'); return; }
    toggle(minute);
    setCustom('');
  };
  const shownMinutes = customizing ? [...new Set([...fullMinutes, ...minutes])].sort((a, b) => a - b) : quickMinutes;
  return <View style={{ gap: 8 }}>
    <ExamDisclosure label="Nhắc trước" summary={summary} icon="notifications-outline" disabled={disabled} expanded={expanded} onToggle={() => setExpanded(open => !open)}>
      <Row style={{ flexWrap: 'wrap', gap: 6 }}>
        <ReminderChip label="Không nhắc" checked={!reminder} disabled={disabled} onPress={() => { setError(''); onReminderChange(false, []); }} />
        {shownMinutes.map(minute => <ReminderChip key={minute} label={minuteLabel(minute)} checked={selectedMinutes.includes(minute)}
          disabled={disabled} onPress={() => toggle(minute)} />)}
      </Row>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: customizing, disabled }} disabled={disabled}
        onPress={() => setCustomizing(open => !open)} style={styles.customToggle}>
        <T style={styles.link}>{customizing ? 'Thu gọn mốc nhắc' : 'Tùy chỉnh mốc nhắc'}</T>
      </Pressable>
      {customizing && <>
        <Field label="Thêm mốc nhắc (phút)" value={custom} numeric maxLength={5} disabled={disabled}
          onChange={value => { setCustom(value); setError(''); }} />
        <Button label="Thêm mốc nhắc" secondary disabled={disabled} onPress={add} />
      </>}
      {!!error && <T accessibilityRole="alert" style={{ color: C.red }}>{error}</T>}
    </ExamDisclosure>
    <ExamNotes value={notes} onChange={onNotesChange} disabled={disabled} />
  </View>;
}

function ExamNotes({ value, onChange, disabled }: { value: string; onChange: (notes: string) => void; disabled?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <ExamDisclosure label="Ghi chú" summary={value.trim() ? 'Đã có ghi chú' : undefined} icon="document-text-outline"
    disabled={disabled} expanded={expanded} onToggle={() => setExpanded(open => !open)}>
    <Field label="Ghi chú kỳ thi" value={value} multiline maxLength={5000} disabled={disabled} onChange={onChange} />
  </ExamDisclosure>;
}

function ExamDisclosure({ label, summary, icon, disabled, expanded, onToggle, children }: {
  label: string; summary?: string; icon: IconName; disabled?: boolean; expanded: boolean; onToggle: () => void; children: ReactNode;
}) {
  return <Card style={styles.disclosure}>
    <Pressable accessibilityRole="button" accessibilityLabel={summary ? `${label}, ${summary}` : label}
      accessibilityState={{ expanded, disabled }} disabled={disabled} onPress={onToggle} style={styles.disclosureTrigger}>
      <Icon name={icon} size={18} />
      <T style={[styles.label, S.grow]}>{label}</T>
      {!!summary && <T style={[S.small, { flexShrink: 1, textAlign: 'right' }]}>{summary}</T>}
      <Icon name={expanded ? 'chevron-up' : 'chevron-forward'} size={15} />
    </Pressable>
    {expanded && <View style={styles.content}>{children}</View>}
  </Card>;
}

function ReminderChip({ label, checked, disabled, onPress }: {
  label: string; checked: boolean; disabled?: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress}
    style={[styles.chip, checked && { backgroundColor: C.primary, borderColor: C.primary }]}>
    <T style={[styles.label, checked && { color: '#fff' }]}>{label}</T>
  </Pressable>;
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontFamily: F.semi, fontSize: 12 },
  field: { ...S.row, backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, borderRadius: 14, minHeight: 50, padding: 12 },
  options: { padding: 4, gap: 3 },
  option: { ...S.row, borderRadius: 10, minHeight: 44, paddingHorizontal: 10 },
  disclosure: { padding: 0, borderRadius: 14, backgroundColor: C.canvas },
  disclosureTrigger: { ...S.row, minHeight: 48, paddingHorizontal: 12 },
  content: { paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  customToggle: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  link: { color: C.primary, fontFamily: F.semi, fontSize: 12 },
  chip: { minHeight: 44, paddingHorizontal: 9, justifyContent: 'center', borderWidth: 1, borderColor: C.line, backgroundColor: C.card, borderRadius: 12 },
});
