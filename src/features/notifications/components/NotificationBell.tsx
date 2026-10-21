import React from 'react';
import { Pressable, View } from 'react-native';
import { Icon, T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';

export default function NotificationBell({ unread, onPress }: { unread: number; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Thông báo" accessibilityHint={unread ? `${unread} mục chưa đọc` : 'Không có mục chưa đọc'} onPress={onPress} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.canvas, opacity: pressed ? 0.65 : 1 })}>
    <Icon name="notifications-outline" color={C.ink} />
    {unread > 0 && <View accessible={false} style={{ position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: C.canvas }}><T testID="notification-unread-count" style={{ fontFamily: F.bold, color: '#fff', fontSize: 9, lineHeight: 14 }}>{unread > 99 ? '99+' : unread}</T></View>}
  </Pressable>;
}
