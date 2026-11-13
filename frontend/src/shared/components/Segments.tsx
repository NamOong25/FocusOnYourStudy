import { useActionState } from '../feedback/ActionScope';
import React from 'react';
import { Pressable } from 'react-native';
import { C, F } from '../theme';
import { Row } from './Row';
import { T } from './Typography';

export function Segments({ values, value, onChange, disabled = false, selectedColor = C.primary }: {
    values: readonly string[];
    value: string;
    onChange: (s: string) => void;
    disabled?: boolean;
    selectedColor?: string;
}) {
    const action = useActionState();
    const blocked = disabled || !!action?.busy;
    return <Row style={{ backgroundColor: C.track, padding: 4, borderRadius: 28, gap: 2 }}>{values.map(v => <Pressable disabled={blocked} key={v} accessibilityRole="tab" accessibilityState={{ selected: v === value, disabled: blocked }} aria-selected={v === value} onPress={() => onChange(v)} style={{ flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 24, backgroundColor: v === value ? selectedColor : 'transparent', paddingHorizontal: 4 }}><T style={{ color: v === value ? '#fff' : C.muted, fontFamily: v === value ? F.bold : F.medium, fontSize: 11, textAlign: 'center' }}>{v}</T></Pressable>)}</Row>;
}
