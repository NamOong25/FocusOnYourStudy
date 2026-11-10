import React, { type ReactNode } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { StateView } from '../../../shared/components';
import { entranceStyle, useEntranceMotion } from '../../../shared/hooks/useEntranceMotion';
import { C } from '../../../shared/theme';
import { useAuth } from '../auth/AuthProvider';

export default function SessionGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.phase === 'ready') return auth.hasSession ? <SignedInEntrance>{children}</SignedInEntrance> : <>{children}</>;
  const failed = auth.phase === 'unavailable', leaving = auth.phase === 'signing-out';
  return <View style={{ flex: 1, backgroundColor: C.canvas, alignItems: 'center' }}>
    <ScrollView style={{ width: '100%', maxWidth: 520 }} contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
      <StateView kind={failed ? 'error' : 'loading'} title={failed ? 'Chưa kiểm tra được phiên đăng nhập' : leaving ? 'Đang đăng xuất' : 'Đang khôi phục đăng nhập'}
        message={failed ? auth.profileError?.message ?? 'Kiểm tra kết nối rồi thử lại.' : leaving ? 'Đang xác nhận với máy chủ.' : 'Đợi một chút nhé.'}
        actionLabel={failed ? 'Thử khôi phục lại' : undefined} onAction={() => { void auth.restore(); }}
        secondaryLabel={failed ? 'Về màn hình đăng nhập' : undefined} onSecondary={auth.skipRestore} />
    </ScrollView>
  </View>;
}

function SignedInEntrance({ children }: { children: ReactNode }) {
  const progress = useEntranceMotion(230);
  return <Animated.View style={[{ flex: 1, backgroundColor: C.canvas }, entranceStyle(progress, 0, 1, 4, 0.65)]}>{children}</Animated.View>;
}
