import React, { useState } from 'react';
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, Card, Row, T } from '../../shared/components';
import { BrandLogo } from '../../shared/components/BrandLogo';
import { entranceStyle, useEntranceMotion } from '../../shared/hooks/useEntranceMotion';
import { C, F, S } from '../../shared/theme';
import { useBackAction } from '../../navigation/Navigation';
import { useAuth } from '../account/auth/AuthProvider';
import { useApiAction } from '../account/auth/useApiAction';
import AuthForm from '../account/components/AuthForm';
import PasswordResetRequestForm from '../account/components/PasswordResetRequestForm';

type Page = 'login' | 'register' | 'forgot';
const openingDuration = 620;

export default function WelcomeScreen() {
  const auth = useAuth(), action = useApiAction(), inset = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = width >= 560;
  const opening = useEntranceMotion(openingDuration);
  const [page, setPage] = useState<Page>('login');
  const [email, setEmail] = useState(auth.passwordChange?.email ?? auth.email);
  const [message, setMessage] = useState('');
  const open = (next: Page, nextEmail?: string) => {
    if (nextEmail !== undefined) setEmail(nextEmail);
    setMessage(''); setPage(next);
  };
  useBackAction(page !== 'login', () => open('login'));

  return <View style={styles.page}>
    <StatusBar style={desktop ? 'dark' : 'light'} />
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, desktop && styles.desktopContent]}>
        <View style={[styles.surface, desktop && styles.desktopSurface]}>
          <LinearGradient colors={['#362477', '#5430B4', '#6945CB']} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 1 }}
            style={[styles.hero, { paddingTop: desktop ? 23 : inset.top + 24 }]}>
            <View pointerEvents="none" style={styles.decoration}>
              <View style={styles.outerOrbit} />
              <View style={styles.innerOrbit} />
              <View style={[styles.dot, { top: 77, left: 27 }]} />
              <View style={[styles.dot, { top: 119, left: 99, width: 4, height: 4 }]} />
              <View style={[styles.dot, { top: 41, left: 128, width: 3, height: 3 }]} />
            </View>
            <Animated.View testID="auth-entry-brand" style={entranceStyle(opening, 0, 480 / openingDuration)}>
              <Row style={{ gap: 9 }}><BrandLogo /><T style={styles.brand}>FocusYourStudy</T></Row>
            </Animated.View>
            <Animated.View testID="auth-entry-intro" style={[styles.intro, entranceStyle(opening, 70 / openingDuration, 590 / openingDuration)]}>
              <T style={styles.heroTitle}>Sẵn sàng học tiếp?</T>
              <T style={styles.heroDetail}>Lịch học, bài tập và mục tiêu của bạn ở cùng một chỗ.</T>
            </Animated.View>
          </LinearGradient>
          <Animated.View testID="auth-entry-panel" style={[styles.panel, { paddingBottom: 24 + inset.bottom },
            entranceStyle(opening, 100 / openingDuration, 1)]}>
            {!!auth.notice && <Card style={{ backgroundColor: auth.logoutPending ? C.amberSoft : C.soft }}>
              <T accessibilityLiveRegion="polite" style={S.small}>{auth.notice}</T>
            </Card>}
            {auth.logoutPending && <Button label="Hoàn tất đăng xuất" secondary loading={action.busy} onPress={() => { void action.run(() => auth.logout()); }} />}
            {auth.canRestore && <Button label="Khôi phục đăng nhập" secondary onPress={() => { void auth.restore(); }} />}
            {!!action.error && <T accessibilityRole="alert" style={{ color: C.red }}>{action.error.message}</T>}
            {page === 'forgot' ? <PasswordResetRequestForm entry initialEmail={email} onLogin={value => open('login', value)} />
              : <AuthForm entry key={page} mode={page} initialEmail={email} message={message} onMode={open}
                onForgot={value => open('forgot', value)}
                onRegistered={value => { open('login', value); setMessage('Tạo tài khoản thành công. Đăng nhập để tiếp tục.'); }} />}
          </Animated.View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', backgroundColor: '#EDEDF8' },
  screen: { flex: 1, width: '100%', maxWidth: 440 },
  content: { flexGrow: 1 },
  desktopContent: { justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 10 },
  surface: { flexGrow: 1, backgroundColor: '#FFFCF7' },
  desktopSurface: { flexGrow: 0, borderRadius: 29, overflow: 'hidden', borderWidth: 1, borderColor: '#DED6EC' },
  hero: { overflow: 'hidden', paddingHorizontal: 24, paddingBottom: 39 },
  brand: { fontFamily: F.extra, fontSize: 14, lineHeight: 21, color: '#F9F5FF' },
  intro: { marginTop: 16, gap: 4 },
  heroTitle: { fontFamily: F.extra, color: '#F9F5FF', fontSize: 29, lineHeight: 38, letterSpacing: -0.9 },
  heroDetail: { color: '#EEE5FF', fontSize: 14, lineHeight: 22, maxWidth: 245 },
  decoration: { position: 'absolute', top: -42, right: -38, width: 213, height: 213 },
  outerOrbit: { ...StyleSheet.absoluteFill, borderRadius: 120, backgroundColor: '#E8DBFF1F' },
  innerOrbit: { position: 'absolute', top: 20, left: 20, width: 173, height: 173, borderRadius: 92, borderWidth: 1, borderColor: '#E8DBFF56' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 6, backgroundColor: '#FFD684' },
  panel: { marginTop: -18, paddingHorizontal: 24, paddingTop: 19, gap: 11, backgroundColor: '#FFFCF7',
    borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});
