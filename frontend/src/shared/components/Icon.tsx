import React from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '../theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export const Icon = ({ name, size = 20, color = C.primary }: {
    name: IconName;
    size?: number;
    color?: string;
}) => <Ionicons name={name} size={size} color={color}/>;
