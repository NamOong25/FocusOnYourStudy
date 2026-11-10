import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button, Card, Row, T } from '../../shared/components';
import { BrandLogo } from '../../shared/components/BrandLogo';
import { C, F, S } from '../../shared/theme';
import { useBackAction } from '../../navigation/Navigation';
import { useAuth } from '../account/auth/AuthProvider';
import { useApiAction } from '../account/auth/useApiAction';
import AuthForm from '../account/components/AuthForm';
import PasswordResetRequestForm from '../account/components/PasswordResetRequestForm';

type Page = 'login' | 'register' | 'forgot';

export default function WelcomeScreen() {
  const auth = useAuth(), action = useApiAction(), inset = useSafeAreaInsets();
  const [page, setPage] = useState<Page>('login');
  const [email, setEmail] = useState(auth.passwordChange?.email ?? auth.email);
  const [message, setMessage] = useState('');
  const open = (next: Page) => { setMessage(''); setPage(next); };
  useBackAction(page !== 'login', () => open('login'));

  return <View style={styles.page}>
    <StatusBar style="dark" />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.screen, { paddingTop: inset.top }]}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingBottom: 24 + inset.bottom }]}>
        <Row style={{ gap: 9 }}><BrandLogo /><T style={styles.brand}>FocusYourStudy</T></Row>
        {!!auth.notice && <Card style={{ backgroundColor: auth.logoutPending ? C.amberSoft : C.soft }}>
          <T accessibilityLiveRegion="polite" style={S.small}>{auth.notice}</T>
        </Card>}
        {auth.logoutPending && <Button label="Hoàn tất đăng xuất" secondary loading={action.busy} onPress={() => { void action.run(() => auth.logout()); }} />}
        {auth.canRestore && <Button label="Khôi phục đăng nhập" secondary onPress={() => { void auth.restore(); }} />}
        {!!action.error && <T accessibilityRole="alert" style={{ color: C.red }}>{action.error.message}</T>}
        {page === 'forgot' ? <PasswordResetRequestForm initialEmail={email} onLogin={() => open('login')} />
          : <AuthForm key={page} mode={page} initialEmail={email} message={message} onMode={open}
            onForgot={value => { setEmail(value); open('forgot'); }}
            onRegistered={value => { setEmail(value); open('login'); setMessage('Tạo tài khoản thành công. Đăng nhập để tiếp tục.'); }} />}
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: '#EDEDF8' },
  screen: { flex: 1, width: '100%', maxWidth: 520, backgroundColor: '#FBF8F5' },
  content: { flexGrow: 1, justifyContent: 'center', gap: 15, padding: 23 },
  brand: { fontFamily: F.extra, fontSize: 17, lineHeight: 23, color: C.primary },
});
