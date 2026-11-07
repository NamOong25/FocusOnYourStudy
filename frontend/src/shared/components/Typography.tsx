import React from 'react';
import { StyleSheet, Text as NativeText, type TextProps } from 'react-native';
import { S } from '../theme';

export function T({ style, ...props }: TextProps) {
    const textStyle = StyleSheet.flatten(style);
    const fontSize = textStyle?.fontSize ?? S.body.fontSize;
    // Leave room for accents when a larger font uses the default line height.
    const lineHeight = textStyle?.lineHeight ?? Math.max(S.body.lineHeight, Math.ceil(fontSize * 1.4));
    return <NativeText {...props} style={[S.body, textStyle, { lineHeight }]} />;
}
