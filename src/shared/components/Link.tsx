import React from 'react';
import { Pressable } from 'react-native';
import { C, F } from '../theme';
import { T } from './Typography';

export function Link({ label, onPress }: {
    label: string;
    onPress: () => void;
}) { return <Pressable accessibilityRole="button" onPress={onPress} hitSlop={4} style={{ minHeight: 44, justifyContent: 'center', flexShrink: 0 }}><T style={{ color: C.primary, fontFamily: F.semi, fontSize: 12 }}>{label}</T></Pressable>; }
