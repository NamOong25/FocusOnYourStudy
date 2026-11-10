import React from 'react';
import {Pressable} from 'react-native';
import {Row,T} from '../../../shared/components';
import {useActionState} from '../../../shared/feedback/ActionScope';
import {C,F} from '../../../shared/theme';
import {DeadlineFilter,deadlineFilters} from '../assignments';

export default function DeadlineFilters({value,onChange}:{value:DeadlineFilter;onChange:(value:DeadlineFilter)=>void}){
  const action=useActionState();
  return <Row style={{ gap: 5 }}>{deadlineFilters.map(label => {
    const selected = value === label;
    return <Pressable key={label} accessibilityRole="tab" accessibilityLabel={`Lọc hạn nộp: ${label}`}
      aria-selected={selected} accessibilityState={{ selected, disabled: !!action?.busy }} disabled={!!action?.busy}
      onPress={() => onChange(label)}
      style={{ flex: 1, minWidth: 0, minHeight: 44, padding: 4, borderRadius: 12, borderWidth: 1,
        borderColor: selected ? C.primary : C.line, backgroundColor: selected ? C.primary : C.card,
        justifyContent: 'center', alignItems: 'center' }}>
      <T style={{ fontSize: 11, lineHeight: 16, textAlign: 'center', color: selected ? '#fff' : C.muted, fontFamily: selected ? F.bold : F.medium }}>{label}</T>
    </Pressable>;
  })}</Row>;
}
