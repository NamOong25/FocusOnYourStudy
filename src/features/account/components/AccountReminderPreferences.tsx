import React from 'react';
import { Badge, Button, Card, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { FormMessage } from '../components';
import { useAuth } from '../auth/AuthProvider';
import { useApiAction } from '../auth/useApiAction';
import { useReminderPreferences } from '../preferences/useReminderPreferences';
import ReminderPreferenceFields from './ReminderPreferenceFields';

export default function AccountReminderPreferences({ onClose }: { onClose: () => void }) {
  const auth = useAuth(), profileAction = useApiAction();
  const { manager, state } = useReminderPreferences();
  const act = (operation: () => Promise<void>) => () => { void operation().catch(() => { }); };
  const current = state.latest;
  return <Sheet title="Tùy chọn nhắc học" onClose={onClose} onBack={onClose}
    dirty={!!manager?.dirty || state.reviewRequired}>
    <Badge label="TÙY CHỌN TÀI KHOẢN" icon="notifications-outline" />
    <T style={S.small}>Lưu cách bạn muốn được nhắc để dùng lại trên các thiết bị.</T>
    {!auth.profile ? <>
      <StateView kind={profileAction.busy ? 'loading' : 'error'} title="Cần tải hồ sơ tài khoản"
        message={(profileAction.error ?? auth.profileError)?.message ?? 'Tải hồ sơ để đọc đúng tùy chọn của tài khoản.'} />
      <Button label="Thử tải lại hồ sơ" secondary loading={profileAction.busy}
        onPress={() => { void profileAction.run(signal => auth.reloadProfile(signal)); }} />
    </> : !state.draft ? <>
      <StateView kind={state.error ? 'error' : 'loading'} title={state.error ? 'Chưa tải được tùy chọn' : 'Đang tải tùy chọn nhắc học'}
        message={state.error?.message ?? 'Đợi một chút để đọc các lựa chọn đã lưu.'} />
      {state.error && manager && <Button label="Thử tải lại tùy chọn" secondary loading={state.busy} onPress={act(manager.read)} />}
    </> : <>
      <ReminderPreferenceFields draft={state.draft} onChange={(field, value) => manager?.edit(field, value)}
        disabled={state.busy} errors={state.error?.fields} />
      <FormMessage message={state.error?.message ?? ''} />
      <FormMessage message={state.notice} success />
      {state.reviewRequired && <Card style={{ backgroundColor: C.amberSoft, gap: 12 }}>
        <T style={{ fontFamily: F.bold }}>Đối chiếu trước khi lưu tiếp</T>
        <T style={S.small}>Lựa chọn đang chỉnh được giữ. Đọc lại cấu hình để kiểm tra lần lưu vừa rồi hoặc thay đổi ở nơi khác.</T>
        <Button label="Đọc tùy chọn hiện tại" secondary loading={state.busy} onPress={act(manager!.read)} />
      </Card>}
      {current && <Card style={{ gap: 12 }}>
        <T style={{ fontFamily: F.bold }}>Cấu hình hiện tại trên tài khoản</T>
        <T style={S.small}>Nhắc bài tập {current.assignments ? 'bật' : 'tắt'} · Lịch học {current.classes ? 'bật' : 'tắt'} · Lịch thi {current.exams ? 'bật' : 'tắt'}</T>
        <T style={S.small}>Nhắc trước {current.reminderMinutes} phút · Giờ yên lặng {current.quiet ? current.quietStart + ' → ' + current.quietEnd : 'tắt'}</T>
        <Button label="Dùng cấu hình hiện tại" secondary disabled={state.busy} onPress={() => manager!.resolve(false)} />
        <Button label="Giữ lựa chọn đang chỉnh" secondary disabled={state.busy} onPress={() => manager!.resolve(true)} />
      </Card>}
      <Button label="Lưu tùy chọn nhắc học" icon="checkmark-outline" loading={state.busy}
        disabled={state.busy || state.reviewRequired || !manager?.dirty} onPress={act(manager!.save)} />
      <Button label="Xong" secondary disabled={state.busy} onPress={onClose} />
      <T style={S.small}>Áp dụng các lựa chọn vào chuông thông báo sẽ được bổ sung ở bước tiếp theo.</T>
    </>}
  </Sheet>;
}
