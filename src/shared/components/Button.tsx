import React, { useRef } from 'react';
import { useActionState } from '../feedback/ActionScope';
import { ActivityIndicator, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { C, F } from '../theme';
import { Icon, type IconName } from './Icon';
import { T } from './Typography';

export function Button({ label, onPress, icon, secondary = false, danger = false, style, disabled, actionLabel, loading = false }: {
    label: string;
    onPress: () => void;
    icon?: IconName;
    secondary?: boolean;
    danger?: boolean;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    actionLabel?: string;
    loading?: boolean;
}) {
    const action = useActionState();
    const handler = useRef(onPress); handler.current = onPress;
    const blocked = disabled || loading || action?.busy;
    const busy = loading || (!!actionLabel && !!action?.busy);
    const execute = () => actionLabel && action ? action.run(() => handler.current(), actionLabel) : handler.current();
    const color = secondary ? C.primary : '#fff';
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!blocked, busy }} disabled={blocked} onPress={execute} style={({ pressed }) => [{ minHeight: 48, borderRadius: 28, paddingHorizontal: 19, paddingVertical: 12, backgroundColor: danger ? C.red : secondary ? C.soft : C.primary, opacity: blocked ? 0.4 : pressed ? 0.75 : 1, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, style]}>{busy && <ActivityIndicator color={color} size="small" />}{icon && !busy && <Icon name={icon} color={color} size={18}/>}<T style={{ color, fontFamily: F.bold, fontSize: 13, textAlign: 'center' }}>{label}</T></Pressable>;
}
