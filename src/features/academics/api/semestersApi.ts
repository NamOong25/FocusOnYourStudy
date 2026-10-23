import { ApiError, createHttpClient } from '../../../shared/api/http';
import { Semester, SemesterStatus, SemesterTerm, semesterName } from '../academic';

export type SemesterInput = { term: SemesterTerm; startYear: number; status: SemesterStatus; note: string };
export type Authorized = <T>(operation: (accessToken: string) => Promise<T>, signal?: AbortSignal) => Promise<T>;
const status: Record<string, SemesterStatus> = { CURRENT: 'Đang học', UPCOMING: 'Sắp tới', COMPLETED: 'Đã kết thúc' };
const toServer: Record<SemesterStatus, string> = { 'Đang học': 'CURRENT', 'Sắp tới': 'UPCOMING', 'Đã kết thúc': 'COMPLETED' };
function semester(value: unknown): Semester {
  const v = value as Record<string, unknown> | null;
  if (!v || typeof v.id !== 'string' || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v.id)
    || ![1, 2, 3].includes(v.term as number) || !Number.isInteger(v.startYear) || Number(v.startYear) < 1900 || Number(v.startYear) > 2099
    || typeof v.status !== 'string' || !status[v.status] || typeof v.note !== 'string' || v.note.length > 2000
    || !Number.isSafeInteger(v.version) || Number(v.version) < 0) throw new ApiError('Phản hồi học kỳ chưa hợp lệ. Hãy tải lại.', 'INVALID_RESPONSE');
  const term = v.term as SemesterTerm;
  return { id: v.id, term, name: semesterName(term), academicYear: `${v.startYear} – ${Number(v.startYear) + 1}`,
    status: status[v.status]!, note: v.note, version: v.version as number };
}
export function createSemestersApi(baseUrl: string, authorized: Authorized, options?: Parameters<typeof createHttpClient>[1]) {
  const http = createHttpClient(baseUrl, options);
  const headers = (token: string) => ({ Authorization: `Bearer ${token}` });
  const body = (input: SemesterInput) => ({ ...input, status: toServer[input.status] });
  return {
    async list(signal?: AbortSignal) {
      const rows = await authorized(token => http<unknown>('/api/v1/semesters', { signal, headers: headers(token) }), signal);
      if (!Array.isArray(rows)) throw new ApiError('Danh sách học kỳ chưa hợp lệ.', 'INVALID_RESPONSE');
      const result = rows.map(semester);
      if (new Set(result.map(s => s.id)).size !== result.length) throw new ApiError('Danh sách học kỳ bị trùng định danh.', 'INVALID_RESPONSE');
      return result;
    },
    async save(input: SemesterInput, original?: Semester) {
      if (original && !Number.isSafeInteger(original.version)) throw new ApiError('Hãy nạp bản học kỳ mới nhất trước khi sửa.', 'SEMESTER_VERSION_CONFLICT', 409);
      return semester(await authorized(token => http<unknown>('/api/v1/semesters' + (original ? '/' + encodeURIComponent(original.id) : ''), {
        method: original ? 'PUT' : 'POST', headers: headers(token), body: { ...body(input), ...(original ? { version: original.version } : {}) },
      })));
    },
    async remove(original: Semester) {
      if (!Number.isSafeInteger(original.version)) throw new ApiError('Hãy nạp bản học kỳ mới nhất trước khi xóa.', 'SEMESTER_VERSION_CONFLICT', 409);
      await authorized(token => http<void>(`/api/v1/semesters/${encodeURIComponent(original.id)}?version=${original.version}`, {
        method: 'DELETE', headers: headers(token), empty: true,
      }));
    },
  };
}
