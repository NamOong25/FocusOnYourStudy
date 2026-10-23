import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, T } from '../../../shared/components';
import { useActionState } from '../../../shared/feedback/ActionScope';
import { C, F, S } from '../../../shared/theme';
import { semesterOptions, type SemesterTerm } from '../academic';

export function SemesterPicker({ value, onChange, disabled = false }: { value: SemesterTerm; onChange: (term: SemesterTerm) => void; disabled?: boolean }) {
  const action = useActionState();
  return <View style={{ gap: 9 }}>
    <T style={{ fontFamily: F.semi, fontSize: 12 }}>Học kỳ</T>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {semesterOptions.map(option => {
        const selected = option.value === value;
        return <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={`${option.label} — ${option.value === 3 ? 'Tùy chọn' : 'Kỳ chính'}`}
          accessibilityState={{ checked: selected, disabled: disabled || !!action?.busy }}
          aria-checked={selected}
          disabled={disabled || !!action?.busy}
          onPress={() => onChange(option.value)}
          style={{ flex: 1, minWidth: 0, minHeight: 109, borderRadius: 17, borderWidth: 1, borderColor: selected ? C.primary : C.line, backgroundColor: selected ? C.soft : C.canvas, padding: 10, gap: 6 }}
        >
          <Icon name={selected ? 'radio-button-on' : 'radio-button-off'} size={19} color={selected ? C.primary : C.muted} />
          <T style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 19, color: selected ? C.primary : C.ink }}>{option.label}</T>
          <T style={{ fontSize: 10, lineHeight: 16, color: C.muted }}>{option.value === 3 ? 'Tùy chọn' : 'Kỳ chính'}</T>
        </Pressable>;
      })}
    </View>
    <T style={S.small}>Mỗi năm có 2 kỳ chính. Chỉ thêm học kỳ 3 (hè) khi bạn đăng ký học; kỳ hè không bắt buộc.</T>
  </View>;
}
