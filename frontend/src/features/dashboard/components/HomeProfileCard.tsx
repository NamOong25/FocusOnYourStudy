import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { initials } from '../../account/account';
import { useAuth } from '../../account/auth/AuthProvider';
import { Icon, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';

export default function HomeProfileCard({ onOpen }: { onOpen: () => void }) {
  const { profile, profileError } = useAuth();
  const current = profileError ? null : profile;
  const name = current?.fullName.trim();
  const studies = [current?.school.trim(), current?.major.trim()].filter(Boolean).join(' · ');

  return <Pressable accessibilityRole="button" accessibilityLabel={name ? `Mở hồ sơ. ${name}${studies ? `. ${studies}` : ''}` : 'Mở hồ sơ'}
    onPress={onOpen} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
    <View style={styles.avatar} accessible={false}>
      {name ? <T style={styles.initials} maxFontSizeMultiplier={1.3}>{initials(name)}</T>
        : <Icon name="person-outline" size={22} color="#fff" />}
    </View>
    <View style={S.grow}>
      {!!name && <T style={styles.greeting}>Chào bạn,</T>}
      <T style={styles.name}>{name || 'Hồ sơ của bạn'}</T>
      {!!studies && <T style={styles.studies}>{studies}</T>}
    </View>
    <Icon name="chevron-forward" size={17} color={C.primary} />
  </Pressable>;
}

const styles = StyleSheet.create({
  card: { ...S.row, gap: 12, minHeight: 88, borderRadius: 18, padding: 14, backgroundColor: C.soft },
  pressed: { opacity: 0.72 },
  avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#fff', fontFamily: F.extra, fontSize: 17 },
  greeting: { fontFamily: F.medium, fontSize: 12, color: '#52426E' },
  name: { fontFamily: F.extra, fontSize: 18, letterSpacing: -0.3 },
  studies: { fontSize: 12, color: '#52426E', marginTop: 2 },
});
