import { ApiError, assertNotCancelled, createHttpClient } from '../../../shared/api/http';
import type { Authorized } from '../../academics/api/semestersApi';
import { createScheduleApi, parseServerOccurrence, type ServerOccurrence } from '../api/scheduleApi';
import { expectedOccurrences, overviewKey, overviewWindows, type OverviewQuery, type OverviewSnapshot } from './overview';

const changed = () => new ApiError('Lịch đã thay đổi trong lúc tổng hợp. Tải lại để xem dữ liệu cùng phiên bản.', 'SCHEDULE_OVERVIEW_CHANGED', 409);
const invalid = () => new ApiError('Phản hồi tổng hợp lịch chưa đầy đủ hoặc không hợp lệ. Tải lại lịch để kiểm tra.', 'INVALID_RESPONSE');
export function createOverviewApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const api = createScheduleApi(baseUrl, authorized, options), http = createHttpClient(baseUrl, options);
  return { async read(q: OverviewQuery, signal?: AbortSignal): Promise<OverviewSnapshot> {
    overviewKey(q);
    const readRules = async () => (await api.rules(q.semesterId, signal)).filter(r => !q.courseId || r.courseId === q.courseId);
    const rules = await readRules(), windows = overviewWindows(rules, q.today), byId = new Map(rules.map(r => [r.id, r]));
    const rows: ServerOccurrence[] = [], seen = new Set<string>(), expected = expectedOccurrences(rules, q.today);
    // Use independent bounded requests instead of assuming a single calendar page
    // contains the semester. Stop on the first failed chunk; never publish partial data.
    for (const window of windows) {
      assertNotCancelled(signal);
      const scope = q.courseId ? `courseId=${encodeURIComponent(q.courseId)}` : `semesterId=${encodeURIComponent(q.semesterId)}`;
      const value = await authorized(token => http<unknown>(`/api/v1/class-schedules/occurrences?${scope}&from=${window.from}&to=${window.to}`, { headers: { Authorization: `Bearer ${token}` }, signal }), signal);
      if (!Array.isArray(value)) throw invalid();
      for (const raw of value) {
        const row = parseServerOccurrence(raw), rule = byId.get(row.scheduleId), key = `${row.scheduleId}:${row.date}`;
        if (!rule || rule.courseId !== row.courseId || rule.version !== row.scheduleVersion) throw changed();
        if (row.date < window.from || row.date > window.to || seen.has(key) || !expected.has(key)
          || row.timeZone !== rule.timeZone || row.notes !== rule.notes || row.reminderMinutes !== rule.reminderMinutes) throw invalid();
        if (!row.changed && (row.startTime !== rule.startTime || row.endTime !== rule.endTime || row.room !== rule.room || row.teacher !== rule.teacher)) throw invalid();
        seen.add(key); rows.push(row);
      }
    }
    const after = await readRules(); assertNotCancelled(signal);
    const signature = (list: typeof rules) => JSON.stringify([...list].sort((a, b) => a.id.localeCompare(b.id)));
    if (signature(rules) !== signature(after)) throw changed();
    if (seen.size !== expected.size) throw invalid();
    return { rules, rows: rows.sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.scheduleId.localeCompare(b.scheduleId)) };
  } };
}
