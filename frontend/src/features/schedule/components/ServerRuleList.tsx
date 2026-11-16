import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button, Icon, Sheet, StateView, T } from '../../../shared/components';
import { C, F, S } from '../../../shared/theme';
import { asApiError, isCancelled, type ApiError } from '../../../shared/api/http';
import { dateLabel } from '../../../shared/utils/dates';
import { displayDate } from '../../../shared/utils/pickerDates';
import { useApp } from '../../../store/model';
import type { ScheduleSource } from '../api/useServerSchedule';
import type { ServerRule } from '../api/scheduleApi';
import { weekdaysLabel } from '../calendar';
import { meetingPlatforms } from '../classFormat';
import { useAuth } from '../../account/auth/AuthProvider';
import { useApiAction } from '../../account/auth/useApiAction';

export default function ServerRuleList({ semesterId, source, onEdit, onClose }: {
  semesterId: string; source: ScheduleSource; onEdit: (rule: ServerRule) => void; onClose: () => void;
}) {
  const { courseCatalog, semesters } = useApp(), [rows, setRows] = useState<ServerRule[] | null>(null), [error, setError] = useState<ApiError | null>(null), [attempt, setAttempt] = useState(0);
  const timeZone = useAuth().profile?.timeZone ?? 'Asia/Ho_Chi_Minh';
  const selectedSemester = semesters.find(semester => semester.id === semesterId);
  const allSemesters = source.needsReload;
  const openRule = useApiAction();
  useEffect(() => {
    const controller = new AbortController(); let live = true; setRows(null); setError(null);
    void source.rules(source.needsReload ? undefined : semesterId, controller.signal).then(value => { if (live) setRows(value); })
      .catch(failure => { if (live && !isCancelled(failure)) setError(asApiError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [semesterId, source.rules, source.needsReload, attempt]);
  const confirm = () => { void source.reload().then(() => { source.acknowledge(); onClose(); }).catch(failure => setError(asApiError(failure))); };
  const editDisabled = openRule.busy || source.busy || allSemesters || source.loading || !source.loaded || !!source.error;
  return <Sheet title="Quản lý chuỗi lịch" onClose={onClose}>
    <View style={styles.intro}>
      {selectedSemester && !allSemesters && <T style={styles.semester}>{selectedSemester.name} · {selectedSemester.academicYear}</T>}
      <T style={S.small}>{allSemesters
        ? 'Đang hiển thị cả chuỗi ở học kỳ khác để bạn kiểm tra lần lưu trước.'
        : 'Chọn một chuỗi để chỉnh sửa.'}</T>
    </View>
    {!rows ? <StateView kind={error ? 'error' : 'loading'} title={error ? 'Chưa tải được các chuỗi' : 'Đang tải chuỗi lịch'} message={error?.message ?? 'Đang lấy danh sách đã lưu.'} actionLabel={error ? 'Thử lại danh sách chuỗi' : undefined} onAction={() => setAttempt(n => n + 1)} /> : <>
      {!rows.length && <StateView title="Chưa có chuỗi lịch trong học kỳ" message="Đóng danh sách và chọn Thêm chuỗi lịch để bắt đầu." />}
      {rows.map(row => {
        const course = courseCatalog.find(c => c.id === row.courseId);
        const semester = allSemesters ? semesters.find(s => s.id === course?.semesterId) : undefined;
        const name = course?.name ?? 'Môn chưa được tải';
        const location = row.meetingPlatform && row.meetingPlatform !== 'NONE' ? `Online · ${meetingPlatforms[row.meetingPlatform]}` : row.room || 'Chưa có phòng';
        const days = weekdaysLabel(row.weekdays.map(day => day % 7));
        const formatDate = selectedSemester && !allSemesters && row.startsOn.slice(0, 4) === row.endsOn.slice(0, 4) ? dateLabel : displayDate;
        return <View key={row.id} style={styles.rule}>
          <View style={styles.calendarIcon} accessible={false} aria-hidden>
            <Icon name="calendar-outline" size={19} />
          </View>
          <View style={styles.details}>
            <T style={styles.course}>{name}</T>
            <T style={S.small}>{days} · {row.startTime}–{row.endTime} · {location}{row.lessonType === 'PRACTICE' ? ' · Thực hành' : ''}</T>
            <T style={S.small}>{formatDate(row.startsOn)}–{formatDate(row.endsOn)}{row.timeZone !== timeZone && ` · ${row.timeZone}`}</T>
            {semester && <T style={S.small}>{semester.name} · {semester.academicYear}</T>}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh sửa chuỗi ${name} ${row.startTime}`}
            accessibilityHint={`${days}, ${displayDate(row.startsOn)} đến ${displayDate(row.endsOn)}`}
            accessibilityState={{ disabled: editDisabled }} disabled={editDisabled}
            onPress={() => { void openRule.run(signal => source.readRule(row.id, signal), onEdit); }}
            style={({ pressed }) => [styles.edit, (pressed || editDisabled) && { opacity: editDisabled ? 0.45 : 0.7 }]}>
            <Icon name="pencil-outline" size={19} />
          </Pressable>
        </View>;
      })}
      {error && <T accessibilityRole="alert" style={{ color: C.red }}>{error.message}</T>}
      {openRule.error && <T accessibilityRole="alert" style={{ color: C.red }}>{openRule.error.message}</T>}
      {source.error && <Button label="Tải lại lịch để tiếp tục chỉnh sửa" secondary disabled={source.busy || source.loading} onPress={() => { void source.reload().catch(failure => setError(asApiError(failure))); }} />}
      {source.needsReload && (source.pendingOccurrence ? <><T style={S.small}>Cần kiểm tra ngoại lệ của đúng ngày vừa ghi; danh sách cả chuỗi không xác định được kết quả buổi đó.</T><Button label="Đóng để kiểm tra đúng buổi" secondary onPress={onClose} /></> : <><T style={S.small}>Kiểm tra danh sách trên để biết lần lưu trước đã xuất hiện hay chưa. App không tự gửi lại yêu cầu lưu.</T><Button label="Đã kiểm tra dữ liệu, tiếp tục" secondary disabled={source.busy || source.loading} onPress={confirm} /></>)}
      <Button label="Tải lại danh sách chuỗi" secondary disabled={source.busy || source.loading} onPress={() => setAttempt(n => n + 1)} />
    </>}
  </Sheet>;
}

const styles = StyleSheet.create({
  intro: { gap: 4 },
  semester: { fontFamily: F.semi, color: C.muted },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16,
    borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  calendarIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft },
  details: { flex: 1, minWidth: 0, gap: 2 },
  course: { fontFamily: F.bold, fontSize: 14, lineHeight: 21 },
  edit: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft },
});
