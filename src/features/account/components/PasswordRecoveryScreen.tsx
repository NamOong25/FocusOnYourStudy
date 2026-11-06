import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, T } from '../../../shared/components';
import { C, F } from '../../../shared/theme';
import type { ResetLink } from '../password/passwordResetData';
import AuthForm from './AuthForm';
import PasswordResetConfirmForm from './PasswordResetConfirmForm';
import PasswordResetRequestForm from './PasswordResetRequestForm';

type Page = 'reset' | 'login' | 'register' | 'forgot';
type Props = { link: ResetLink | null; clearLink: () => void; onClose: () => void };

export default function PasswordRecoveryScreen({ link, clearLink, onClose }: Props) {
  const [page, setPage] = useState<Page>('reset');
  const [email, setEmail] = useState(''), [message, setMessage] = useState('');
  const open = (next: Exclude<Page, 'reset'>) => {
    clearLink();
    setMessage('');
    setPage(next);
  };
  return <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#EDEDF8' }}>
    <ScrollView style={{ width: '100%', maxWidth: 520, backgroundColor: C.canvas }}
      keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 24, paddingBottom: 36, gap: 18 }}>
      <T style={{ fontFamily: F.extra, color: C.primary, fontSize: 17 }}>FocusYourStudy</T>
      {page === 'reset' && <PasswordResetConfirmForm link={link} clearLink={clearLink} onClose={onClose}
        onLogin={() => open('login')} onRequest={() => open('forgot')} />}
      {page === 'forgot' && <PasswordResetRequestForm initialEmail={email} onLogin={() => open('login')} />}
      {(page === 'login' || page === 'register') && <>
        <AuthForm key={page} mode={page} initialEmail={email} message={message}
          onMode={open} onForgot={value => { setEmail(value); open('forgot'); }} onSignedIn={onClose}
          onRegistered={value => { setEmail(value); open('login'); setMessage('Tạo tài khoản thành công. Đăng nhập để tiếp tục.'); }} />
        <Button label="Về ứng dụng" secondary onPress={onClose} />
      </>}
    </ScrollView>
  </View>;
}
