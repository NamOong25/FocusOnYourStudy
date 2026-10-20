import React from 'react';
import { Pressable } from 'react-native';
import { C, F } from '../theme';
import { Row } from './Row';
import { T } from './Typography';

export function Segments({ values, value, onChange }: {
    values: readonly string[];
    value: string;
    onChange: (s: string) => void;
}) { return <Row style={{ backgroundColor: C.track, padding: 4, borderRadius: 28, gap: 2 }}>{values.map(v => <Pressable key={v} accessibilityRole="tab" accessibilityState={{ selected: v === value }} aria-selected={v === value} onPress={() => onChange(v)} style={{ flex: 1, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 24, backgroundColor: v === value ? C.primary : 'transparent', paddingHorizontal: 4 }}><T style={{ color: v === value ? '#fff' : C.muted, fontFamily: v === value ? F.bold : F.medium, fontSize: 11, textAlign: 'center' }}>{v}</T></Pressable>)}</Row>; }
