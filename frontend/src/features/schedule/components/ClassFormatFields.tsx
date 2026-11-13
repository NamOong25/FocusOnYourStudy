import React from 'react';
import { View } from 'react-native';
import { Field, Segments, T } from '../../../shared/components';
import { F } from '../../../shared/theme';
import { meetingPlatforms, type ClassFormat } from '../classFormat';

export default function ClassFormatFields({ value, onChange, disabled }: {
  value: ClassFormat; onChange: (change: Partial<ClassFormat>) => void; disabled?: boolean;
}) {
  const platform = value.meetingPlatform ?? 'NONE';
  const label = { fontFamily: F.semi, fontSize: 12 };
  return <View style={{ gap: 8 }}>
    <T style={label}>Hình thức</T>
    <Segments values={['Tại lớp', 'Online']} value={platform === 'NONE' ? 'Tại lớp' : 'Online'} disabled={disabled}
      onChange={choice => {
        if (choice === 'Tại lớp') onChange({ meetingPlatform: 'NONE', meetingId: '', meetingPasscode: '' });
        else if (platform === 'NONE') onChange({ meetingPlatform: 'ZOOM' });
      }} />
    <T style={label}>Loại buổi</T>
    <Segments values={['Lý thuyết', 'Thực hành']} value={value.lessonType === 'PRACTICE' ? 'Thực hành' : 'Lý thuyết'}
      disabled={disabled} onChange={choice => onChange({ lessonType: choice === 'Thực hành' ? 'PRACTICE' : 'THEORY' })} />
    {platform !== 'NONE' && <>
      <T style={label}>Nền tảng</T>
      <Segments values={Object.values(meetingPlatforms)} value={meetingPlatforms[platform]} disabled={disabled}
        onChange={choice => {
          const next = choice === 'Zoom' ? 'ZOOM' : 'TEAMS';
          if (next !== platform) onChange({ meetingPlatform: next, meetingId: '', meetingPasscode: '' });
        }} />
      <Field label="ID cuộc họp" value={value.meetingId ?? ''} onChange={meetingId => onChange({ meetingId })}
        maxLength={100} disabled={disabled} />
      {platform === 'ZOOM' && <Field label="Mật khẩu Zoom" value={value.meetingPasscode ?? ''}
        onChange={meetingPasscode => onChange({ meetingPasscode })} maxLength={100} disabled={disabled} secureTextEntry />}
    </>}
  </View>;
}
