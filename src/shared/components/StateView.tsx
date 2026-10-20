import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { C, F, S } from '../theme';
import { Button } from './Button';
import { Card } from './Card';
import { IconTile } from './IconTile';
import { T } from './Typography';

type Props = { kind?: 'empty' | 'loading' | 'error'; title: string; message: string; actionLabel?: string; onAction?: () => void; secondaryLabel?: string; onSecondary?: () => void };
export function StateView({ kind = 'empty', title, message, actionLabel, onAction, secondaryLabel, onSecondary }: Props) {
  return <Card style={{ alignItems: 'center', padding: 24, gap: 14 }}>
    {kind === 'loading' ? <ActivityIndicator size="large" color={C.primary} /> : <IconTile name={kind === 'error' ? 'cloud-offline-outline' : 'leaf-outline'} size={62} bg={kind === 'error' ? C.redSoft : C.soft} color={kind === 'error' ? C.red : C.primary} />}
    <T accessibilityRole={kind === 'error' ? 'alert' : 'header'} accessibilityLiveRegion="polite" style={{ fontFamily: F.bold, fontSize: 19, lineHeight: 28, textAlign: 'center' }}>{title}</T>
    <T style={[S.small, { textAlign: 'center' }]}>{message}</T>
    <View style={{ alignSelf: 'stretch', gap: 9 }}>
      {actionLabel && onAction && <Button label={actionLabel} onPress={onAction} />}
      {secondaryLabel && onSecondary && <Button label={secondaryLabel} secondary onPress={onSecondary} />}
    </View>
  </Card>;
}
