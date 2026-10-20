import React from 'react';
import { Image, Pressable, Switch, TextInput, View } from 'react-native';
import { Icon, IconButton, IconName, Row, T } from './components';
import { StudentProfile, initials } from './account';
import { C, F, S } from './theme';

export function StudentAvatar({ profile, size = 68 }: { profile: StudentProfile; size?: number }) {
  const palette = { violet: [C.soft, C.primary], mint: [C.greenSoft, C.green], peach: ['#FFE6DC', '#AB5035'], photo: [C.soft, C.primary] }[profile.avatar];
  return profile.avatar === 'photo' ? <Image source={require('../assets/avatar.png')} style={{ width: size, height: size, borderRadius: size * 0.34 }} /> : <View style={{ width: size, height: size, borderRadius: size * 0.34, backgroundColor: palette[0], alignItems: 'center', justifyContent: 'center' }}><T style={{ fontFamily: F.extra, fontSize: size * 0.3, color: palette[1] }}>{initials(profile.name)}</T></View>;
}
export function AccountRow({ title, detail, icon, onPress, danger = false }: { title: string; detail: string; icon: IconName; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ paddingVertical: 13, gap: 5, opacity: pressed ? 0.65 : 1 })}><Row style={{ gap: 12 }}><View style={{ width: 42, height: 42, borderRadius: 15, backgroundColor: danger ? C.redSoft : C.soft, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} color={danger ? C.red : C.primary} /></View><View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 14, color: danger ? C.red : C.ink }}>{title}</T><T style={{ fontSize: 11, lineHeight: 18, color: C.muted }}>{detail}</T></View><Icon name="chevron-forward" size={17} color={C.muted} /></Row></Pressable>;
}
export function PreferenceToggle({ title, detail, value, onChange }: { title: string; detail: string; value: boolean; onChange: (v: boolean) => void }) {
  return <Row between style={{ alignItems: 'center', paddingVertical: 8 }}><View style={S.grow}><T style={{ fontFamily: F.semi, fontSize: 13 }}>{title}</T><T style={{ fontSize: 11, lineHeight: 18, color: C.muted }}>{detail}</T></View><Switch accessibilityLabel={title} value={value} onValueChange={onChange} trackColor={{ false: '#D9DEE9', true: C.purple }} thumbColor="#fff" /></Row>;
}
export function AccountField({ label, value, onChange, password = false, shown = false, onToggle, email = false, placeholder }: { label: string; value: string; onChange: (v: string) => void; password?: boolean; shown?: boolean; onToggle?: () => void; email?: boolean; placeholder?: string }) {
  return <View style={{ gap: 7 }}><T style={{ fontFamily: F.semi, fontSize: 12 }}>{label}</T><Row style={{ backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, gap: 4 }}><Icon name={password ? 'lock-closed-outline' : email ? 'mail-outline' : 'person-outline'} color={C.muted} size={18} /><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} secureTextEntry={password && !shown} autoCapitalize={email || password ? 'none' : 'words'} autoCorrect={!email && !password} keyboardType={email ? 'email-address' : 'default'} placeholder={placeholder} placeholderTextColor={C.muted} style={{ flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 8, paddingVertical: 13, fontFamily: F.regular, fontSize: 14, color: C.ink }} />{password && onToggle && <IconButton label={`${shown ? 'Ẩn' : 'Hiện'} ${label.toLocaleLowerCase()}`} name={shown ? 'eye-off-outline' : 'eye-outline'} onPress={onToggle} bg="transparent" color={C.muted} />}</Row></View>;
}
export function FormMessage({ message, success = false }: { message: string; success?: boolean }) {
  return message ? <View style={{ backgroundColor: success ? C.greenSoft : C.redSoft, borderRadius: 16, padding: 13 }}><T accessibilityRole={success ? undefined : 'alert'} accessibilityLiveRegion="polite" style={{ color: success ? C.green : C.red, fontSize: 12, lineHeight: 20 }}>{message}</T></View> : null;
}
