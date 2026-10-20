import React from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { S } from '../theme';

export function T({ style, ...props }: TextProps) { return <NativeText {...props} style={[S.body, style]}/>; }
