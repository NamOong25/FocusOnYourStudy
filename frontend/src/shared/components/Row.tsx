import React, { type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { S } from '../theme';

export function Row({ children, style, between = false }: {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    between?: boolean;
}) { return <View style={[between ? S.between : S.row, style]}>{children}</View>; }
