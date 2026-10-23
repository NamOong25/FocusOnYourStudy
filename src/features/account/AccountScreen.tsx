import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionScope, InteractionBlock, useActionState } from '../../shared/feedback/ActionScope';
import { useFeedback } from '../../shared/feedback/FeedbackProvider';
import { ActionStatus, Badge, Button, Card, Icon, IconButton, NoticeToast, Row, Section, T } from '../../shared/components';
import { DateTimePanel, DateTimeProvider, useDateTimePicker } from '../../shared/components/DateTimePicker';
import { RememberedScrollView, useBackAction, useNavigationScope } from '../../navigation/Navigation';
import { C, F, S } from '../../shared/theme';
import { useApp } from '../../store/model';
import { useAuth } from './auth/AuthProvider';
import { accountDisplayProfile } from './auth/displayProfile';
import { AccountRow, StudentAvatar } from './components';
import AuthForm from './components/AuthForm';
import AccountProfile from './components/AccountProfile';
import { Appearance, ProfileEditor, ReminderEditor } from './components/PreferenceEditors';
import { AuthHero } from './components/AuthHero';
import LogoutForm from './components/LogoutForm';
import { useApiAction } from './auth/useApiAction';

type Page = 'hub' | 'profile' | 'preview-profile' | 'appearance' | 'reminders' | 'login' | 'register' | 'forgot' | 'logout';
const titles: Record<Page, string> = { hub: 'Hồ sơ & cài đặt', profile: 'Hồ sơ tài khoản', 'preview-profile': 'Chỉnh sửa hồ sơ mẫu',
  appearance: 'Giao diện & ngôn ngữ', reminders: 'Tùy chọn nhắc học', login: 'Đăng nhập', register: 'Tạo tài khoản', forgot: 'Quên mật khẩu', logout: 'Đăng xuất' };

export default function Account({ onClose }: { onClose: () => void }) {
  return <ActionScope><DateTimeProvider><AccountContent onClose={onClose} /></DateTimeProvider></ActionScope>;
}
function AccountContent({ onClose }: { onClose: () => void }) {
  const { profile: previewProfile, saveProfile, accountPreferences, setAccountPreferences } = useApp();
  const auth = useAuth(), inset = useSafeAreaInsets(), picker = useDateTimePicker(), scope = useNavigationScope(), action = useActionState();
  const { showNotice } = useFeedback();
  const sessionAction = useApiAction();
  const [page, setPage] = useState<Page>('hub'), [email, setEmail] = useState(auth.email), [message, setMessage] = useState('');
  const open = (next: Page) => { action?.cancel(); setMessage(''); setPage(next); };
  const back = () => { if (page === 'hub') onClose(); else open(page === 'register' || page === 'forgot' ? 'login' : 'hub'); };
  useBackAction(true, picker.active ? picker.cancel : back, picker.active ? 1000 + scope.depth : undefined);
  const display = auth.hasSession ? accountDisplayProfile(auth.profile) : previewProfile;
  return <Modal visible={scope.active} animationType="slide" onRequestClose={picker.active ? picker.cancel : back}>
    <View style={{ flex: 1, display: scope.active ? 'flex' : 'none', alignItems: 'center', backgroundColor: '#EDEDF8' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, width: '100%', maxWidth: 520, backgroundColor: C.canvas, paddingTop: inset.top }}>
        <Row style={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 13, gap: 10 }}>
          <IconButton name={picker.active || page !== 'hub' ? 'arrow-back' : 'close'} label={picker.active ? 'Hủy chọn ngày giờ' : page === 'hub' ? 'Đóng tài khoản' : 'Quay lại tài khoản'} onPress={picker.active ? picker.cancel : back} bg="#fff" />
          <View style={S.grow}><T style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 25 }}>{picker.active ? `Chọn ${picker.active.label.toLocaleLowerCase()}` : titles[page]}</T><T style={{ fontSize: 10, color: C.muted }}>FOCUSYOURSTUDY</T></View>
          {!picker.active && page !== 'hub' && <IconButton name="close" label="Đóng tài khoản" onPress={onClose} bg="transparent" color={C.muted} />}
        </Row>
        <RememberedScrollView memoryKey={`account-${page}`} active={!picker.active} key={page} style={picker.active ? { display: 'none' } : undefined}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 30 + inset.bottom, gap: 18 }}>
          <InteractionBlock>
            {page === 'hub' && <>
              {!!auth.notice && <Card style={{ backgroundColor: C.soft }}><T accessibilityLiveRegion="polite" style={S.small}>{auth.notice}</T></Card>}
              {!!sessionAction.error && <T accessibilityRole="alert" style={{ color: C.red }}>{sessionAction.error.message}</T>}
              {auth.logoutPending && <><Button label="Hoàn tất đăng xuất" secondary loading={sessionAction.busy} onPress={() => { void sessionAction.run(() => auth.logout()); }} /><T style={S.small}>Phiên trên thiết bị đã đóng. Cần kết nối lại để xác nhận thu hồi với máy chủ.</T></>}
              {auth.canRestore && <Button label="Khôi phục đăng nhập" secondary onPress={() => { void auth.restore(); }} />}
              {auth.hasSession ? <>
                <AccountProfile onLogin={() => { setEmail(auth.email); open('login'); }} />
                <Card style={{ backgroundColor: C.soft, gap: 8 }}><Row><Icon name="leaf-outline" /><T style={{ fontFamily: F.bold }}>Góc học tập đang được hoàn thiện</T></Row><T style={S.small}>Hồ sơ, học kỳ, môn học, bài tập và buổi tự học đã lưu trong tài khoản. Lịch, điểm và Pomodoro vẫn là dữ liệu thử trong lần mở này.</T></Card>
              </> : <Card style={{ gap: 16 }}>
                <Badge label="CÙNG BẮT ĐẦU NHÉ" icon="school-outline" />
                <AuthHero icon="person-outline" title="Góc học tập của bạn" detail="Đăng nhập hoặc tạo tài khoản để xem hồ sơ đã lưu." />
                <Button label="Đăng nhập" icon="log-in-outline" onPress={() => open('login')} />
                <Button label="Tạo tài khoản" secondary icon="person-add-outline" onPress={() => open('register')} />
              </Card>}
              <Section title="Không gian của bạn" />
              <Card style={{ paddingVertical: 4 }}>
                {!auth.hasSession && <AccountRow title="Chỉnh sửa hồ sơ mẫu" detail="Thử bố cục; không thay đổi tài khoản đã lưu" icon="person-outline" onPress={() => open('preview-profile')} />}
                <AccountRow title="Giao diện & ngôn ngữ" detail="Xem trước sáng/tối và tiếng Việt/English" icon="color-palette-outline" onPress={() => open('appearance')} />
                <AccountRow title="Tùy chọn nhắc học" detail="Mốc nhắc, loại lịch và giờ yên lặng của bản mẫu" icon="notifications-outline" onPress={() => open('reminders')} />
              </Card>
              {auth.hasSession && <>
                <Section title="Tài khoản" /><Card style={{ paddingVertical: 4 }}>
                  <AccountRow title="Đăng nhập tài khoản khác" detail="Hồ sơ chỉ đổi sau khi đăng nhập thành công" icon="log-in-outline" onPress={() => { setEmail(''); open('login'); }} />
                  <AccountRow title="Tạo tài khoản khác" detail="Đăng ký tài khoản mới" icon="person-add-outline" onPress={() => { setEmail(''); open('register'); }} />
                  <AccountRow title="Đăng xuất" detail="Đóng phiên đăng nhập này" icon="log-out-outline" onPress={() => open('logout')} danger />
                </Card><T style={S.small}>Ứng dụng sẽ giữ đăng nhập khi phiên còn hiệu lực. Bạn có thể đăng xuất bất cứ lúc nào.</T>
              </>}
              {!auth.hasSession && <View style={{ alignItems: 'center', gap: 7 }}><StudentAvatar profile={display} size={44} /><T style={{ fontFamily: F.semi }}>{display.name}</T><T style={S.small}>Hồ sơ minh họa chỉ dùng trong các màn học tập thử.</T></View>}
            </>}
            {page === 'profile' && <AccountProfile onLogin={() => open('login')} />}
            {page === 'logout' && <LogoutForm onCancel={() => open('hub')} />}
            {page === 'preview-profile' && <ProfileEditor onSave={next => { saveProfile(next); open('hub'); showNotice('Đã lưu hồ sơ mẫu trong phiên thử, không thay đổi tài khoản.'); }} />}
            {page === 'appearance' && <Appearance preferences={accountPreferences} onSave={next => { setAccountPreferences(next); showNotice('Đã lưu lựa chọn xem trước trong phiên dùng thử.'); }} />}
            {page === 'reminders' && <ReminderEditor preferences={accountPreferences} onSave={next => { setAccountPreferences(next); showNotice('Đã lưu tùy chọn mẫu. Chưa gửi thông báo trên thiết bị.'); }} />}
            {(page === 'login' || page === 'register') && <AuthForm key={page} mode={page} initialEmail={email} message={message}
              onMode={open} onForgot={() => open('forgot')}
              onRegistered={value => { setEmail(value); open('login'); setMessage('Tạo tài khoản thành công. Đăng nhập để tiếp tục.'); }}
              onSignedIn={loaded => { open('hub'); showNotice(loaded ? 'Đăng nhập thành công. Hồ sơ đã được tải.' : 'Đã đăng nhập. Thử tải lại hồ sơ để tiếp tục.'); }} />}
            {page === 'forgot' && <><AuthHero icon="key-outline" title="Khôi phục mật khẩu" detail="Chức năng gửi email khôi phục chưa sẵn sàng." /><Card><T style={S.small}>Mật khẩu của bạn chưa được thay đổi và chưa có email nào được gửi. Bạn có thể quay lại đăng nhập hoặc tiếp tục khám phá các màn học tập.</T></Card><Button label="Quay lại đăng nhập" onPress={() => open('login')} /></>}
          </InteractionBlock>
        </RememberedScrollView>
        <ActionStatus /><NoticeToast modal bottom={Math.max(20, inset.bottom)} />
        {picker.active && <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 8, paddingBottom: 30 + inset.bottom }}><DateTimePanel /></ScrollView>}
      </KeyboardAvoidingView>
    </View>
  </Modal>;
}
