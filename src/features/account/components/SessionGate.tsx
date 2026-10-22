import React, { type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { StateView } from '../../../shared/components';
import { C } from '../../../shared/theme';
import { useAuth } from '../auth/AuthProvider';

export default function SessionGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  if (auth.phase === 'ready') return <>{children}</>;
  const failed = auth.phase === 'unavailable', leaving = auth.phase === 'signing-out';
  return <View style={{ flex: 1, backgroundColor: C.canvas, alignItems: 'center' }}>
    <ScrollView style={{ width: '100%', maxWidth: 520 }} contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}>
      <StateView kind={failed ? 'error' : 'loading'} title={failed ? 'Chưa kiểm tra được phiên đăng nhập' : leaving ? 'Đang đăng xuất' : 'Đang khôi phục đăng nhập'}
        message={failed ? auth.profileError?.message ?? 'Kiểm tra kết nối rồi thử lại.' : leaving ? 'Đang xác nhận với máy chủ.' : 'Đợi một chút nhé.'}
        actionLabel={failed ? 'Thử khôi phục lại' : undefined} onAction={() => { void auth.restore(); }}
        secondaryLabel={failed ? 'Tiếp tục xem giao diện' : undefined} onSecondary={auth.skipRestore} />
    </ScrollView>
  </View>;
}
