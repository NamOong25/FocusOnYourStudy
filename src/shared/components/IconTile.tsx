import React from 'react';
import { View } from 'react-native';
import { C } from '../theme';
import { Icon, type IconName } from './Icon';

export function IconTile({ name, color = C.primary, bg = C.soft, size = 44 }: {
    name: IconName;
    color?: string;
    bg?: string;
    size?: number;
}) { return <View style={{ width: size, height: size, backgroundColor: bg, borderRadius: size * 0.38, alignItems: 'center', justifyContent: 'center' }}><Icon name={name} color={color} size={size * 0.46}/></View>; }
