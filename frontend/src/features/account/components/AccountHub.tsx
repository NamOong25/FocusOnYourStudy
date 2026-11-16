import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon, IconButton, type IconName, Row, T } from '../../../shared/components';
import { BrandLogo } from '../../../shared/components/BrandLogo';
import { C, F, S } from '../../../shared/theme';
import { initials } from '../account';
import { useAuth } from '../auth/AuthProvider';
import AccountProfile from './AccountProfile';

type Props = {
  onClose: () => void;
  onEdit: () => void;
  onLogin: () => void;
  onAppearance: () => void;
  onReminders: () => void;
  onPassword: () => void;
  onExport: () => void;
  onAccounts: () => void;
  onLogout: () => void;
  children?: ReactNode;
};

export default function AccountHub({ onClose, onEdit, onLogin, onAppearance, onReminders, onPassword, onExport, onAccounts, onLogout, children }: Props) {
  const auth = useAuth();
  const inset = useSafeAreaInsets();
  const profile = auth.profileError ? null : auth.profile;
  const studies = profile ? [profile.school.trim(), profile.major.trim()].filter(Boolean).join(' · ') : '';

  return <>
    <LinearGradient colors={['#362477', '#5430B4', '#6945CB']} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 1 }}
      style={[styles.hero, { paddingTop: 14 + inset.top }]}>
      <View pointerEvents="none" style={styles.decoration}>
        <View style={styles.orbit} />
        <View style={[styles.dot, { top: 74, left: 29 }]} />
        <View style={[styles.dot, { top: 113, left: 102, width: 4, height: 4 }]} />
      </View>
      <Row between>
        <Row style={S.grow}><BrandLogo /><T accessibilityRole="header" style={styles.heroTitle}>Hồ sơ</T></Row>
        <IconButton name="close" label="Đóng tài khoản" color="#fff" bg="#FFFFFF20" onPress={onClose} />
      </Row>
      {profile && <>
        <Row style={styles.identity}>
          <View style={styles.avatar} accessible={false}><T style={styles.initials}>{initials(profile.fullName)}</T></View>
          <View style={[S.grow, { gap: 2 }]}>
            <T testID="account-full-name" style={styles.name}>{profile.fullName}</T>
            <T style={styles.email} selectable>{profile.email}</T>
            {!!studies && <T style={styles.studies}>{studies}</T>}
          </View>
        </Row>
        <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa hồ sơ" onPress={onEdit}
          style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
          <Icon name="create-outline" size={17} color="#fff" /><T style={styles.editText}>Chỉnh sửa hồ sơ</T>
        </Pressable>
      </>}
    </LinearGradient>
    <View style={[styles.content, { paddingBottom: 24 + inset.bottom }]}>
      {children}
      {!profile && <AccountProfile onLogin={onLogin} onEdit={onEdit} />}
      <SettingsGroup title="Cài đặt">
        <SettingsRow label="Giao diện & ngôn ngữ" icon="desktop-outline" onPress={onAppearance} />
        <SettingsRow label="Tùy chọn nhắc học" icon="notifications-outline" onPress={onReminders} divided />
      </SettingsGroup>
      <SettingsGroup title="Tài khoản">
        {!!auth.profile && <SettingsRow label="Đổi mật khẩu" icon="lock-closed-outline" onPress={onPassword} />}
        <SettingsRow label="Xuất dữ liệu" icon="download-outline" onPress={onExport} divided={!!auth.profile} />
        <SettingsRow label="Tài khoản khác" icon="person-outline" onPress={onAccounts} divided />
      </SettingsGroup>
      <Pressable accessibilityRole="button" accessibilityLabel="Đăng xuất" onPress={onLogout}
        style={({ pressed }) => [styles.logout, pressed && styles.pressed]}>
        <Icon name="log-out-outline" size={20} color="#AE2537" /><T style={styles.logoutText}>Đăng xuất</T>
      </Pressable>
    </View>
  </>;
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return <View style={{ gap: 8 }}>
    <T accessibilityRole="header" style={styles.groupTitle}>{title}</T>
    <View style={styles.group}>{children}</View>
  </View>;
}

function SettingsRow({ label, icon, onPress, divided }: { label: string; icon: IconName; onPress: () => void; divided?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.setting, divided && styles.divider, pressed && styles.settingPressed]}>
    <View style={styles.settingIcon}><Icon name={icon} size={19} color={C.primary} /></View>
    <T style={[S.grow, styles.settingText]}>{label}</T>
    <Icon name="chevron-forward" size={17} color={C.primary} />
  </Pressable>;
}

const styles = StyleSheet.create({
  hero: { overflow: 'hidden', paddingHorizontal: 22, paddingBottom: 36, gap: 16 },
  heroTitle: { color: '#fff', fontFamily: F.extra, fontSize: 21, lineHeight: 29 },
  decoration: { position: 'absolute', width: 218, height: 218, top: -48, right: -42,
    borderRadius: 114, backgroundColor: '#FFFFFF13' },
  orbit: { position: 'absolute', top: 22, left: 22, width: 174, height: 174, borderRadius: 92,
    borderWidth: 1, borderColor: '#E8DBFF56' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 6, backgroundColor: '#FFD684' },
  identity: { gap: 12, alignItems: 'center' },
  avatar: { width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E8DCFF' },
  initials: { color: '#4325A2', fontFamily: F.extra, fontSize: 24, lineHeight: 33 },
  name: { color: '#fff', fontFamily: F.extra, fontSize: 24, lineHeight: 32, letterSpacing: -0.45 },
  email: { color: '#F7F2FF', fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  studies: { color: '#E9DEFF', fontSize: 12, lineHeight: 19 },
  edit: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 11, borderWidth: 1, borderColor: '#F6EDFF', gap: 7 },
  editText: { color: '#fff', fontFamily: F.bold, fontSize: 13, lineHeight: 20 },
  content: { marginTop: -19, paddingHorizontal: 20, paddingTop: 19, gap: 16, flexGrow: 1,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#FFFCF7' },
  groupTitle: { fontFamily: F.extra, color: '#24193B', fontSize: 20, lineHeight: 28 },
  group: { paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E2D9EF', backgroundColor: '#FFFEFD' },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingVertical: 7 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2D9EF' },
  settingPressed: { opacity: 0.66 },
  settingIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: '#F0E8FC', alignItems: 'center', justifyContent: 'center' },
  settingText: { color: '#24193B', fontFamily: F.bold, fontSize: 14, lineHeight: 21 },
  logout: { minHeight: 49, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FBE7EA' },
  logoutText: { color: '#AE2537', fontFamily: F.bold, fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.73 },
});
