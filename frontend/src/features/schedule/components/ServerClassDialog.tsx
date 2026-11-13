import React, { useEffect, useState } from 'react';
import { Sheet, StateView, T } from '../../../shared/components';
import { S } from '../../../shared/theme';
import { asApiError, isCancelled, type ApiError } from '../../../shared/api/http';
import { API_BASE_URL } from '../../../shared/api/config';
import { useAuth } from '../../account/auth/AuthProvider';
import { weekdaysLabel } from '../calendar';
import { createScheduleApi, type ServerOccurrence, type ServerRule } from '../api/scheduleApi';
import type { ExceptionMode } from '../exceptionDraft';
import ClassOccurrenceDetails from './ClassOccurrenceDetails';

export default function ServerClassDialog({ item, title, blocked, onClose, onReload, onEdit, onException }: {
  item: ServerOccurrence; title: string; blocked: boolean; onClose: () => void; onReload: () => void; onEdit: (rule: ServerRule) => void; onException: (mode: ExceptionMode, item: ServerOccurrence) => void;
}) {
  const auth = useAuth(), [rule, setRule] = useState<ServerRule | null>(null), [error, setError] = useState<ApiError | null>(null);
  useEffect(() => {
    const controller = new AbortController(); let live = true;
    void createScheduleApi(API_BASE_URL, auth.authorized).get(item, controller.signal)
      .then(value => { if (live) setRule(value); }).catch(failure => { if (live && !isCancelled(failure)) setError(asApiError(failure)); });
    return () => { live = false; controller.abort(); };
  }, [item, auth.authorized]);
  return <Sheet title="Chi tiết buổi học" onClose={onClose} hideBackButton>
    {!rule ? <StateView kind={error ? 'error' : 'loading'} title={error ? 'Chưa xem được buổi học' : 'Đang tải chi tiết'}
      message={error?.message ?? 'Đang kiểm tra lịch đã lưu của bạn.'} actionLabel={error ? 'Tải lại lịch' : undefined} onAction={onReload} />
      : <ClassOccurrenceDetails title={title} date={item.date} format={rule}
        lesson={{ ...item, start: item.startTime, end: item.endTime }}
        recurrence={{ ...rule, weekdays: weekdaysLabel(rule.weekdays.map(day => day % 7)), start: rule.startTime, end: rule.endTime }}
        blocked={blocked} onEdit={() => onEdit(rule)}
        onChange={() => onException('change', item)} onCancel={() => onException('cancel', item)}
        onRestore={() => onException('restore', item)}>
        {blocked && <T accessibilityRole="alert" style={S.small}>Tải lại lịch hoặc kiểm tra lần lưu trước khi tiếp tục chỉnh sửa.</T>}
      </ClassOccurrenceDetails>}
  </Sheet>;
}
