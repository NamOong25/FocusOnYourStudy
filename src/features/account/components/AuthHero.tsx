import React from 'react';
import { View } from 'react-native';
import { Icon, T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';

export function AuthHero({ title, detail, icon }: { title: string; detail: string; icon: React.ComponentProps<typeof Icon>['name'] }) {
  return <View style={{ gap: 13, paddingVertical: 12 }}><View style={{ width: 68, height: 68, borderRadius: 25, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}><Icon name={icon} size={32} /></View><T style={{ fontFamily: F.extra, fontSize: 29, lineHeight: 39, letterSpacing: -0.7 }}>{title}</T><T style={{ color: C.muted, fontSize: 13, lineHeight: 22 }}>{detail}</T></View>;
}
