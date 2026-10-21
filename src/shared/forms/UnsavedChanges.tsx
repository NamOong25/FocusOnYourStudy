import React from 'react';
import { ScrollView, View } from 'react-native';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { T } from '../components/Typography';
import { C, F, S } from '../theme';

export function UnsavedChanges({ onContinue, onDiscard }: { onContinue: () => void; onDiscard: () => void }) {
  return <ScrollView testID="unsaved-changes" accessibilityViewIsModal keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ padding: 22, gap: 16 }}>
    <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}><Icon name="document-text-outline" color={C.amber} size={25} /></View>
    <T accessibilityRole="alert" style={{ fontFamily: F.bold, fontSize: 20, lineHeight: 28 }}>Bạn có thay đổi chưa lưu</T>
    <T style={S.small}>Nội dung vừa chỉnh sửa chưa được lưu. Bạn muốn tiếp tục chỉnh sửa hay bỏ thay đổi và rời biểu mẫu?</T>
    <Button label="Tiếp tục chỉnh sửa" icon="create-outline" onPress={onContinue} />
    <Button label="Bỏ thay đổi" secondary onPress={onDiscard} />
  </ScrollView>;
}
