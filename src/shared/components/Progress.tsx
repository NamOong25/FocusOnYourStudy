import React from 'react';
import { View } from 'react-native';
import { C } from '../theme';

export function Progress({ value, white = false }: {
    value: number;
    white?: boolean;
}) { return <View style={{ height: 7, borderRadius: 10, overflow: 'hidden', backgroundColor: white ? '#FFFFFF40' : C.track }}><View style={{ width: `${Math.min(100, Math.max(0, value))}%`, height: '100%', borderRadius: 10, backgroundColor: white ? '#fff' : C.purple }}/></View>; }
