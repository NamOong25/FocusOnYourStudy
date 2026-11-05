import React from 'react';
import { View } from 'react-native';
import { Badge, Button, Card, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useAuth } from '../auth/AuthProvider';
import { AccountField, FormMessage } from '../components';
import { profileFields } from '../profile/profileData';
import { useProfileEditor } from '../profile/useProfileEditor';

const labels = { fullName: 'Họ và tên', school: 'Trường học', major: 'Ngành học' };
export default function AccountProfileEditor({ onClose }: { onClose: () => void }) {
  const auth = useAuth(), { manager, state } = useProfileEditor();
  const act = (fn: () => Promise<void>) => () => { void fn().catch(() => { }); };
  return <Sheet title="Chỉnh sửa hồ sơ" onClose={onClose} onBack={onClose} dirty={!!manager?.dirty}>
    <Badge label="HỒ SƠ TÀI KHOẢN" icon="person-outline" />
    <T style={S.small}>Cập nhật thông tin để góc học tập mang tên bạn. Trường học và ngành học có thể để trống.</T>
    {!state.loaded ? <><StateView kind={state.error ? 'error' : 'loading'} title={state.error ? 'Chưa mở được hồ sơ' : 'Đang tải hồ sơ hiện tại'} message={state.error?.message ?? 'Đợi một chút để lấy thông tin đã lưu.'} />
      {state.error && manager && <Button label="Thử tải lại hồ sơ" secondary onPress={act(manager.read)} loading={state.busy} />}</> : <>
      <Card style={{ gap: 5, backgroundColor: C.canvas }}><T style={S.small}>Email tài khoản</T><T selectable style={{ fontFamily: F.semi }}>{state.baseline?.email ?? auth.email}</T></Card>
      {profileFields.map(field => <AccountField key={field} label={labels[field]} value={state.draft[field]} onChange={value => manager?.edit(field, value)} disabled={state.busy} error={state.error?.fields[field]} />)}
      <FormMessage message={state.error?.message ?? ''} />
      <FormMessage message={state.notice} success />
      {state.reviewRequired && <Card style={{ gap: 12, backgroundColor: C.amberSoft }}>
        <T style={{ fontFamily: F.bold }}>Đối chiếu trước khi lưu tiếp</T>
        <T style={S.small}>Nội dung đang nhập vẫn được giữ. Đọc hồ sơ hiện tại để kiểm tra kết quả lần lưu hoặc thay đổi ở nơi khác.</T>
        <Button label="Đọc hồ sơ hiện tại để đối chiếu" secondary loading={state.busy} disabled={state.busy} onPress={act(manager!.read)} />
      </Card>}
      {state.latest && <Card style={{ gap: 12 }}><T style={{ fontFamily: F.bold }}>Thông tin hiện tại trên tài khoản</T>
        {profileFields.map(field => <View key={field} style={{ gap: 4 }}><T style={S.small}>{labels[field]}</T><T>{state.latest![field] || 'Chưa thêm'}</T></View>)}
        <T style={S.small}>Bạn có thể dùng thông tin mới, hoặc giữ bản đang nhập để chỉnh và lưu thay cho nội dung hiện tại.</T>
        <Button label="Dùng thông tin hiện tại" secondary disabled={state.busy} onPress={() => manager!.resolve(false)} />
        <Button label="Giữ bản đang nhập để sửa tiếp" secondary disabled={state.busy} onPress={() => manager!.resolve(true)} />
      </Card>}
      <Button label="Lưu hồ sơ" icon="checkmark-outline" loading={state.busy} disabled={state.busy || state.reviewRequired || !manager?.dirty} onPress={act(manager!.save)} />
      {state.busy && <T style={S.small}>Đang xử lý. Đóng biểu mẫu không hủy được một lần lưu đã gửi; mở lại để đọc kết quả hiện tại.</T>}
      <Button label="Xong" secondary disabled={state.busy} onPress={onClose} />
    </>}
  </Sheet>;
}
