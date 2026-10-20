import { useActionState } from '../feedback/ActionScope';
import React from 'react';
import { TextInput, View } from 'react-native';
import { C, F } from '../theme';
import { T } from './Typography';

export function Field({ label, accessibilityLabel, value, onChange, placeholder, multiline, numeric }: {
    label: string;
    accessibilityLabel?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    multiline?: boolean;
    numeric?: boolean;
}) {
    const action = useActionState();
    return <View style={{ gap: 7 }}><T style={{ fontFamily: F.semi, fontSize: 12 }}>{label}</T><TextInput editable={!action?.busy} accessibilityLabel={accessibilityLabel ?? label} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.muted} multiline={multiline} keyboardType={numeric ? 'decimal-pad' : 'default'} style={{ backgroundColor: C.canvas, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 14, minHeight: multiline ? 90 : 50, textAlignVertical: multiline ? 'top' : 'center', fontFamily: F.regular, fontSize: 14, color: C.ink }}/></View>;
}
