import React, { useEffect, useState } from 'react';
import { Button, Card, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { asApiError, isCancelled, type ApiError } from '../../../shared/api/http';
import { useApp } from '../../../store/model';
import type { ScheduleSource } from '../api/useServerSchedule';
import type { ServerRule } from '../api/scheduleApi';
import { weekdaysLabel } from '../calendar';

export default function ServerRuleList({ semesterId, source, onEdit, onClose }: {
  semesterId: string; source: ScheduleSource; onEdit: (rule: ServerRule) => void; onClose: () => void;
}) {
  const { courseCatalog, semesters } = useApp(), [rows, setRows] = useState<ServerRule[] | null>(null), [error, setError] = useState<ApiError | null>(null), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let live = true; setRows(null); setError(null);
    void source.rules(source.needsReload ? undefined : semesterId, controller.signal).then(value => { if (live) setRows(value); })
      .catch(failure => { if (live && !isCancelled(failure)) setError(asApiError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [semesterId, source.rules, source.needsReload, attempt]);
  const confirm = () => { void source.reload().then(() => { source.acknowledge(); onClose(); }).catch(failure => setError(asApiError(failure))); };
  return <Sheet title="Quản lý chuỗi lịch" onClose={onClose}>
    <T style={S.small}>{source.needsReload ? 'Toàn bộ chuỗi trong tài khoản để kiểm tra lần ghi chưa rõ kết quả, kể cả ở học kỳ khác.' : 'Toàn bộ chuỗi trong học kỳ, gồm lịch chưa bắt đầu hoặc đã kết thúc. Chọn chuỗi để chỉnh sửa hoặc xóa cả chuỗi.'}</T>
    {!rows ? <StateView kind={error ? 'error' : 'loading'} title={error ? 'Chưa tải được các chuỗi' : 'Đang tải chuỗi lịch'} message={error?.message ?? 'Đang lấy danh sách đã lưu.'} actionLabel={error ? 'Thử lại danh sách chuỗi' : undefined} onAction={() => setAttempt(n => n + 1)} /> : <>
      {!rows.length && <StateView title="Chưa có chuỗi lịch trong học kỳ" message="Đóng danh sách và chọn Thêm chuỗi lịch để bắt đầu." />}
      {rows.map(row => {
        const course = courseCatalog.find(c => c.id === row.courseId), semester = semesters.find(s => s.id === course?.semesterId);
        return <Card key={row.id} style={{ gap: 8, backgroundColor: C.canvas }}><T style={{ fontFamily: F.bold }}>{course?.name ?? 'Môn chưa được tải'}</T><T style={S.small}>{course?.code} · {semester?.name} {semester?.academicYear}</T><T style={S.small}>{weekdaysLabel(row.weekdays.map(d => d % 7))} · {row.startTime} – {row.endTime}</T><T style={S.small}>{row.startsOn} → {row.endsOn} · {row.timeZone}</T><T style={S.small}>{row.room || 'Chưa có phòng'}</T><Button label={`Chỉnh sửa chuỗi ${course?.name ?? row.id} ${row.startTime}`} secondary disabled={source.busy || source.needsReload || source.loading || !source.loaded || !!source.error} onPress={() => onEdit(row)} /></Card>;
      })}
      {error && <T accessibilityRole="alert" style={{ color: C.red }}>{error.message}</T>}
      {source.error && <Button label="Tải lại lịch để tiếp tục chỉnh sửa" secondary disabled={source.busy || source.loading} onPress={() => { void source.reload().catch(failure => setError(asApiError(failure))); }} />}
      {source.needsReload && (source.pendingOccurrence ? <><T style={S.small}>Cần kiểm tra ngoại lệ của đúng ngày vừa ghi; danh sách cả chuỗi không xác định được kết quả buổi đó.</T><Button label="Đóng để kiểm tra đúng buổi" secondary onPress={onClose} /></> : <><T style={S.small}>Kiểm tra danh sách trên để biết lần lưu trước đã xuất hiện hay chưa. App không tự gửi lại yêu cầu lưu.</T><Button label="Đã kiểm tra dữ liệu, tiếp tục" secondary disabled={source.busy || source.loading} onPress={confirm} /></>)}
      <Button label="Tải lại danh sách chuỗi" secondary disabled={source.busy || source.loading} onPress={() => setAttempt(n => n + 1)} />
    </>}
  </Sheet>;
}
