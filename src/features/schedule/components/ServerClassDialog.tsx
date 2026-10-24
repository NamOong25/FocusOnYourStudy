import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Row, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { dateLabel } from '../../../shared/utils/dates';
import { asApiError, isCancelled, type ApiError } from '../../../shared/api/http';
import { API_BASE_URL } from '../../../shared/api/config';
import { useAuth } from '../../account/auth/AuthProvider';
import { weekdaysLabel, reminderLabel } from '../calendar';
import { createScheduleApi, type ServerOccurrence, type ServerRule } from '../api/scheduleApi';

export default function ServerClassDialog({ item, title, onClose, onReload, onEdit }: {
  item: ServerOccurrence; title: string; onClose: () => void; onReload: () => void; onEdit: (rule: ServerRule) => void;
}) {
  const auth = useAuth(), [rule, setRule] = useState<ServerRule | null>(null), [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    void createScheduleApi(API_BASE_URL, auth.authorized).get(item, controller.signal)
      .then(value => { if (live) setRule(value); }).catch(failure => { if (live && !isCancelled(failure)) setError(asApiError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [item, auth.authorized]);
  return <Sheet title="Chi tiết buổi học" onClose={onClose}>
    {!rule ? <StateView kind={error ? 'error' : 'loading'} title={error ? 'Chưa xem được buổi học' : 'Đang tải chi tiết'} message={error?.message ?? 'Đang kiểm tra lịch đã lưu của bạn.'} actionLabel={error ? 'Tải lại lịch' : undefined} onAction={onReload} /> : <>
      <Card style={{ backgroundColor: item.cancelled ? C.redSoft : C.soft, gap: 10 }}><Badge label={item.cancelled ? 'Đã nghỉ buổi này' : item.changed ? 'Đã điều chỉnh buổi này' : 'Theo lịch gốc'} color={item.cancelled ? C.red : C.primary} bg="#FFFFFFAA" /><T style={{ fontFamily: F.extra, fontSize: 23, lineHeight: 33 }}>{title}</T><T style={{ fontFamily: F.semi, color: C.primary }}>{dateLabel(item.date)}/{item.date.slice(0, 4)}</T></Card>
      <Row><Card style={[S.grow, { backgroundColor: C.canvas, gap: 6 }]}><T style={{ fontFamily: F.bold }}>{item.startTime} – {item.endTime}</T><T style={S.small}>{item.cancelled ? 'Giờ dự kiến trước khi nghỉ' : 'Giờ của buổi này'}</T></Card><Card style={[S.grow, { backgroundColor: C.canvas, gap: 6 }]}><T style={{ fontFamily: F.bold }}>{item.room || 'Chưa có phòng'}</T><T style={S.small}>Phòng học</T></Card></Row>
      <T style={S.small}>Múi giờ: {item.timeZone}</T><T style={S.small}>Giảng viên: {item.teacher || 'Chưa có thông tin'}</T>
      {(item.changed || item.cancelled) && <Card style={{ backgroundColor: C.amberSoft, gap: 6 }}><T style={{ fontFamily: F.bold, color: C.amber }}>Chỉ áp dụng cho ngày này</T><T style={S.small}>{item.reason || 'Chưa ghi lý do'}</T><T style={S.small}>Lịch gốc: {rule.startTime} – {rule.endTime} · {rule.room || 'Chưa có phòng'}</T></Card>}
      {!!item.notes && <Card><T style={S.small}>{item.notes}</T></Card>}
      <Card style={{ backgroundColor: C.canvas, gap: 7 }}><T style={{ fontFamily: F.bold }}>Chuỗi lịch học</T><T style={S.small}>{weekdaysLabel(rule.weekdays.map(d => d % 7))} · {rule.startTime} – {rule.endTime}</T><T style={S.small}>{dateLabel(rule.startsOn)}/{rule.startsOn.slice(0, 4)} → {dateLabel(rule.endsOn)}/{rule.endsOn.slice(0, 4)}</T><T style={S.small}>{rule.reminderMinutes ? `Mốc nhắc đã chọn: trước ${reminderLabel(rule.reminderMinutes)}` : 'Không chọn mốc nhắc'} · Chưa gửi nhắc trên thiết bị.</T></Card>
      <Button label="Chỉnh sửa cả chuỗi lịch" icon="repeat-outline" onPress={() => onEdit(rule)} />
      <T style={S.small}>Chỉnh sửa áp dụng cho cả chuỗi. Nghỉ, đổi hoặc khôi phục riêng một buổi sẽ được bổ sung sau.</T><Button label="Đóng chi tiết" secondary onPress={onClose} />
    </>}
  </Sheet>;
}
