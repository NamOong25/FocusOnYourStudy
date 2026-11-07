import React from 'react';
import { Pressable } from 'react-native';
import { C } from '../theme';
import { Icon, type IconName } from './Icon';

export function IconButton({ name, onPress, label, bg = C.soft, color = C.primary, disabled = false }: {
    name: IconName;
    onPress: () => void;
    label: string;
    bg?: string;
    color?: string;
    disabled?: boolean;
}) { return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled }} onPress={onPress} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, opacity: disabled ? 0.35 : pressed ? 0.65 : 1 })}><Icon name={name} color={color}/></Pressable>; }
