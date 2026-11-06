import React from 'react';
import { Pressable, View } from 'react-native';
import { Card, Row, Section, T } from '../../../shared/components';
import { TimeField } from '../../../shared/components/DateTimePicker';
import { C, F, S } from '../../../shared/theme';
import type { FieldErrors } from '../../../shared/api/http';
import { PreferenceToggle } from '../components';
import type { ReminderDraft } from '../preferences/reminderPreferencesData';

type Props = {
  draft: ReminderDraft;
  onChange: <K extends keyof ReminderDraft>(field: K, value: ReminderDraft[K]) => void;
  disabled?: boolean;
  errors?: FieldErrors;
};

export default function ReminderPreferenceFields({ draft, onChange, disabled = false, errors = {} }: Props) {
  return <>
    <Card style={{ gap: 7 }}>
      <PreferenceToggle title="Nhắc bài tập" detail="Bài sắp đến hạn nộp" disabled={disabled}
        value={draft.assignments} onChange={value => onChange('assignments', value)} />
      <PreferenceToggle title="Nhắc lịch học" detail="Trước khi bắt đầu ca học" disabled={disabled}
        value={draft.classes} onChange={value => onChange('classes', value)} />
      <PreferenceToggle title="Nhắc lịch thi" detail="Chuẩn bị trước kỳ thi" disabled={disabled}
        value={draft.exams} onChange={value => onChange('exams', value)} />
    </Card>
    <Section title="Mốc nhắc mặc định" />
    <Row style={{ flexWrap: 'wrap', gap: 8 }}>
      {([5, 15, 30, 60] as const).map(minutes => <Pressable key={minutes} accessibilityRole="radio"
        accessibilityLabel={`Nhắc trước ${minutes} phút`} disabled={disabled}
        accessibilityState={{ checked: draft.reminderMinutes === minutes, disabled }}
        aria-checked={draft.reminderMinutes === minutes} onPress={() => onChange('reminderMinutes', minutes)}
        style={{ minHeight: 45, minWidth: 64, flexGrow: 1, padding: 10, alignItems: 'center', justifyContent: 'center',
          borderRadius: 15, opacity: disabled ? 0.5 : 1, backgroundColor: draft.reminderMinutes === minutes ? C.primary : C.soft }}>
        <T style={{ fontFamily: F.bold, fontSize: 12, color: draft.reminderMinutes === minutes ? '#fff' : C.primary }}>{minutes} phút</T>
      </Pressable>)}
    </Row>
    <Card style={{ gap: 14 }}>
      <PreferenceToggle title="Giờ yên lặng" detail="Khoảng thời gian bạn muốn nghỉ ngơi" disabled={disabled}
        value={draft.quiet} onChange={value => onChange('quiet', value)} />
      {draft.quiet && <>
        <Row style={{ alignItems: 'flex-start' }}>
          <View style={S.grow}><TimeField label="Yên lặng từ" value={draft.quietStart} disabled={disabled}
            onChange={value => onChange('quietStart', value)} /></View>
          <View style={S.grow}><TimeField label="Đến" value={draft.quietEnd} disabled={disabled}
            onChange={value => onChange('quietEnd', value)} /></View>
        </Row>
        <T style={S.small}>Có thể qua đêm, ví dụ 22:00 → 07:00.</T>
      </>}
    </Card>
    {Object.entries(errors).map(([field, message]) => <T key={field} accessibilityRole="alert" style={{ color: C.red, fontSize: 12 }}>{message}</T>)}
  </>;
}
