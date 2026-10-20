import React from 'react';
import { Button, Card, Sheet, T } from '../../shared/components';
import { useFeedback } from '../../shared/feedback/FeedbackProvider';
import { C, F, S } from '../../shared/theme';

export default function PreviewPanel({ onClose, onLoad, onGuide }: { onClose: () => void; onLoad: (fail: boolean) => void; onGuide: () => void }) {
  const { failNextSave, armSaveFailure } = useFeedback();
  return <Sheet title="Thử trạng thái giao diện" onClose={onClose}>
    <Card style={{ backgroundColor: C.soft, gap: 8 }}><T style={{ fontFamily: F.bold }}>Không gian thử của bản mẫu</T><T style={S.small}>Các thao tác dưới đây mô phỏng tải và lỗi để bạn xem giao diện. Dữ liệu trong phiên được giữ nguyên.</T></Card>
    <Button label="Xem lại hướng dẫn bắt đầu" secondary onPress={onGuide} />
    <Button label="Thử trạng thái đang tải" secondary icon="refresh-outline" onPress={() => onLoad(false)} />
    <Button label="Thử trạng thái lỗi tải" secondary icon="cloud-offline-outline" onPress={() => onLoad(true)} />
    <Card style={{ gap: 10 }}><T style={{ fontFamily: F.bold }}>Thử lỗi khi lưu hoặc xử lý</T><T style={S.small}>Bật rồi tạo hoặc sửa một mục. Lần xử lý kế tiếp sẽ báo lỗi trước khi thay đổi dữ liệu; form vẫn giữ nội dung để thử lại.</T><Button label={failNextSave ? 'Đã bật lỗi cho lần xử lý tới' : 'Bật lỗi cho lần xử lý tới'} secondary icon={failNextSave ? 'checkmark-circle-outline' : 'flask-outline'} onPress={() => armSaveFailure(!failNextSave)} />{failNextSave && <T accessibilityLiveRegion="polite" style={{ color: C.amber, fontSize: 12 }}>Chỉ áp dụng một lần. Bấm lại để tắt.</T>}</Card>
    <Button label="Quay lại ứng dụng" onPress={onClose} />
  </Sheet>;
}
