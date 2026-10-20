import React from 'react';
import { Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { C, F } from '../theme';
import { Icon, type IconName } from './Icon';
import { T } from './Typography';

export function Button({ label, onPress, icon, secondary = false, danger = false, style, disabled }: {
    label: string;
    onPress: () => void;
    icon?: IconName;
    secondary?: boolean;
    danger?: boolean;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
}) {
    const color = secondary ? C.primary : '#fff';
    return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [{ minHeight: 48, borderRadius: 28, paddingHorizontal: 19, paddingVertical: 12, backgroundColor: danger ? C.red : secondary ? C.soft : C.primary, opacity: disabled ? 0.4 : pressed ? 0.75 : 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, style]}>{icon && <Icon name={icon} color={color} size={18}/>}<T style={{ color, fontFamily: F.bold, fontSize: 13, textAlign: 'center' }}>{label}</T></Pressable>;
}
