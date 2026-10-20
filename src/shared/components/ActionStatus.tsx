import React from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useActionState } from '../feedback/ActionScope';
import { C, F } from '../theme';
import { Icon } from './Icon';
import { T } from './Typography';

export function ActionStatus() {
  const action = useActionState();
  if (!action || action.state.phase === 'idle') return null;
  const pending = action.busy;
  return <View style={{ padding: 14, gap: 8, backgroundColor: pending ? C.soft : C.redSoft, borderRadius: 18, margin: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      {pending ? <ActivityIndicator color={C.primary} /> : <Icon name="alert-circle-outline" color={C.red} />}
      <T accessibilityRole={pending ? undefined : 'alert'} accessibilityLiveRegion={pending ? 'polite' : 'assertive'} style={{ flex: 1, fontSize: 12, color: pending ? C.primary : C.red }}>
        {pending ? `${action.state.label} · Bản xem trước` : action.state.message}
      </T>
    </View>
    <View style={{ flexDirection: 'row', gap: 16, justifyContent: 'flex-end' }}>
      {!pending && <Pressable accessibilityRole="button" accessibilityLabel="Thử lại thao tác" onPress={action.retry} style={{ minHeight: 44, justifyContent: 'center' }}><T style={{ color: C.red, fontFamily: F.bold, fontSize: 12 }}>Thử lại</T></Pressable>}
      <Pressable accessibilityRole="button" accessibilityLabel={pending ? 'Hủy chờ xử lý' : 'Đóng lỗi thao tác'} onPress={action.cancel} style={{ minHeight: 44, justifyContent: 'center' }}><T style={{ color: pending ? C.primary : C.red, fontFamily: F.semi, fontSize: 12 }}>{pending ? 'Hủy chờ' : 'Để mình sửa lại'}</T></Pressable>
    </View>
  </View>;
}
