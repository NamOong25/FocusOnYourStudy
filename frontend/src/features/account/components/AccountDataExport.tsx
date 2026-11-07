import React from 'react';
import { Platform } from 'react-native';
import { Badge, Button, Card, Sheet, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { useAuth } from '../auth/AuthProvider';
import { useApiAction } from '../auth/useApiAction';
import { FormMessage } from '../components';
import { useDataExport } from '../export/useDataExport';
import { exportSections, type ExportSection } from '../export/dataExportApi';

const labels: Record<ExportSection, string> = {
  semesters: 'Học kỳ', courses: 'Môn học', assignments: 'Bài tập', studySessions: 'Buổi tự học',
  classSchedules: 'Chuỗi lịch học', classExceptions: 'Buổi nghỉ hoặc đổi', exams: 'Lịch thi',
  gradeConfigurations: 'Bộ cột điểm', pomodoroSessions: 'Phiên Pomodoro',
};

export default function AccountDataExport({ onClose }: { onClose: () => void }) {
  const auth = useAuth(), action = useApiAction();
  const { manager, state } = useDataExport();
  const preparing = state.phase === 'preparing', saving = state.phase === 'saving', busy = preparing || saving;
  const file = state.file;
  const act = (operation: () => Promise<void>) => () => { void operation().catch(() => { }); };
  return <Sheet title="Xuất dữ liệu" onClose={onClose} onBack={onClose}>
    <Badge label="BẢN SAO DỮ LIỆU" icon="download-outline" />
    <T style={S.small}>Chuẩn bị một tệp JSON chứa hồ sơ, học kỳ, môn học, bài tập, lịch, điểm số và Pomodoro của bạn.</T>
    <Card style={{ backgroundColor: C.canvas, gap: 6 }}>
      <T style={S.small}>Tài khoản xuất dữ liệu</T>
      <T selectable style={{ fontFamily: F.semi }}>{auth.email}</T>
    </Card>
    {!auth.profile && <>
      <FormMessage message={(action.error ?? auth.profileError)?.message ?? 'Tải lại hồ sơ tài khoản để xuất đúng dữ liệu của bạn.'} />
      <Button label="Thử tải lại hồ sơ" secondary loading={action.busy}
        onPress={() => { void action.run(signal => auth.reloadProfile(signal)); }} />
    </>}
    {preparing && <T accessibilityLiveRegion="polite" style={S.small}>Đang chuẩn bị tệp dữ liệu… Bạn có thể hủy hoặc đóng màn này để dừng tải.</T>}
    {file && <Card style={{ gap: 10 }}>
      <T accessibilityRole="header" style={{ fontFamily: F.bold }}>Tệp đã sẵn sàng</T>
      <T selectable style={{ fontSize: 12 }}>{file.filename}</T>
      <T style={S.small}>{new Date(file.exportedAt).toLocaleString('vi-VN')} · {Math.max(1, Math.ceil(file.bytes / 1024))} KB</T>
      {exportSections.map(section => <T key={section} style={S.small}>{labels[section]} · {file.counts[section]}</T>)}
      <T style={S.small}>Tệp có cả hồ sơ, mục tiêu Pomodoro và tùy chọn nhắc học.</T>
    </Card>}
    <FormMessage message={state.error?.message ?? ''} />
    {state.delivery && <FormMessage success message={state.delivery === 'browser'
      ? 'Đã gửi yêu cầu tải tệp đến trình duyệt. Bạn kiểm tra mục Tải xuống để xem tệp.'
      : 'Đã mở bảng chia sẻ của thiết bị. Bạn có thể mở lại để chọn nơi lưu tệp.'} />}
    {file && <Button label={Platform.OS === 'web' ? 'Tải tệp JSON' : 'Lưu hoặc chia sẻ tệp'} icon="download-outline"
      disabled={busy || !manager} loading={saving} onPress={act(manager!.save)} />}
    <Button label={file ? 'Chuẩn bị bản mới' : 'Chuẩn bị tệp JSON'} secondary={!!file}
      disabled={busy || !manager} loading={preparing} onPress={() => { if (manager) void manager.prepare().catch(() => { }); }} />
    {preparing && <Button label="Hủy chuẩn bị tệp" secondary onPress={() => manager?.cancel()} />}
    <T style={S.small}>{Platform.OS === 'web' ? 'Trình duyệt sẽ tải tệp về máy hoặc hỏi bạn nơi lưu, tùy cài đặt tải xuống.'
      : 'Chọn nơi lưu trong bảng chia sẻ của thiết bị. Nếu đóng bảng chia sẻ, bạn có thể bấm mở lại.'}</T>
    <T style={S.small}>Mỗi lần xuất hỗ trợ tối đa 10.000 bản ghi và 20 MiB.</T>
  </Sheet>;
}
