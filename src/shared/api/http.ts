export type FieldErrors = Record<string, string>;
export class ApiError extends Error {
  constructor(message: string, public readonly code: string, public readonly status = 0,
    public readonly fields: FieldErrors = {}) { super(message); this.name = 'ApiError'; }
}
export const cancelledRequest = () => new ApiError('Yêu cầu đã được hủy.', 'REQUEST_CANCELLED');
export const isCancelled = (error: unknown) => error instanceof ApiError && error.code === 'REQUEST_CANCELLED';
export const asApiError = (error: unknown) => error instanceof ApiError ? error
  : new ApiError('Chưa thể hoàn tất yêu cầu. Hãy thử lại.', 'UNEXPECTED_ERROR');
export function assertNotCancelled(signal?: AbortSignal) { if (signal?.aborted) throw cancelledRequest(); }

const messages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu chưa đúng.',
  EMAIL_ALREADY_EXISTS: 'Email này đã được đăng ký. Bạn có thể đăng nhập bằng tài khoản đó.',
  VALIDATION_FAILED: 'Kiểm tra các trường được báo lỗi.',
  AUTH_RATE_LIMITED: 'Bạn đã thử nhiều lần. Chờ một chút rồi thử lại.',
  INVALID_ACCESS_TOKEN: 'Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.',
  AUTHENTICATION_REQUIRED: 'Bạn cần đăng nhập để xem hồ sơ.',
  CSRF_INVALID: 'Yêu cầu chưa được xác nhận. Bấm thử lại để lấy mã xác nhận mới.',
  AUTH_ORIGIN_REJECTED: 'Chưa thể đăng nhập từ địa chỉ ứng dụng này.',
  COOKIE_TRANSPORT_REQUIRED: 'Chưa thể xác nhận phiên trình duyệt. Hãy tải lại và thử lại.',
  DATABASE_UNAVAILABLE: 'Dịch vụ đang tạm gián đoạn. Hãy thử lại sau.',
  INVALID_REFRESH_TOKEN: 'Phiên đăng nhập không còn hợp lệ. Hãy đăng nhập lại.',
  REFRESH_TOKEN_REUSED: 'Phiên đã bị thu hồi. Hãy đăng nhập lại.',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.',
  SEMESTER_ALREADY_EXISTS: 'Học kỳ này đã có trong năm học đã chọn.',
  SEMESTER_NOT_FOUND: 'Học kỳ không còn tồn tại hoặc bạn không được truy cập. Hãy tải lại danh sách.',
  SEMESTER_VERSION_CONFLICT: 'Học kỳ đã được sửa ở nơi khác. Nạp bản mới nhất trước khi lưu hoặc xóa.',
  SEMESTER_HAS_COURSES: 'Học kỳ còn môn học đã lưu. Hãy xử lý các môn trước khi xóa học kỳ.',
  COURSE_ALREADY_EXISTS: 'Mã môn này đã có trong học kỳ đã chọn.',
  COURSE_NOT_FOUND: 'Môn học không còn tồn tại hoặc bạn không được truy cập. Hãy tải lại danh sách.',
  COURSE_VERSION_CONFLICT: 'Môn học đã được sửa ở nơi khác. Nạp bản mới nhất trước khi lưu hoặc xóa.',
  COURSE_HAS_ASSIGNMENTS: 'Môn còn bài tập đã lưu. Hãy xử lý các bài tập trước khi xóa hoặc chuyển học kỳ.',
  ASSIGNMENT_NOT_FOUND: 'Bài tập không còn tồn tại hoặc bạn không được truy cập. Hãy tải lại danh sách.',
  ASSIGNMENT_VERSION_CONFLICT: 'Bài tập đã được sửa ở nơi khác. Nạp bản mới nhất trước khi lưu hoặc xóa.',
  ASSIGNMENT_HAS_STUDY_SESSIONS: 'Bài tập còn buổi tự học đã lưu. Gỡ liên kết các buổi trước khi đổi môn.',
  ASSIGNMENT_DEADLINE_CONFLICT: 'Hạn nộp mới đang trước lúc kết thúc buổi tự học đã lưu. Điều chỉnh buổi học hoặc gỡ liên kết trước.',
  COURSE_HAS_STUDY_SESSIONS: 'Môn còn buổi tự học đã lưu. Xử lý các buổi trước khi xóa hoặc chuyển học kỳ.',
  COURSE_HAS_EXAMS: 'Môn còn lịch thi đã lưu. Xử lý các lịch thi trước khi xóa hoặc chuyển học kỳ.',
  COURSE_HAS_CLASS_SCHEDULES: 'Môn còn lịch học đã lưu. Xử lý các chuỗi lịch trước khi xóa hoặc chuyển học kỳ.',
  STUDY_SESSION_NOT_FOUND: 'Buổi học không còn tồn tại hoặc bạn không được truy cập. Hãy tải lại.',
  STUDY_SESSION_VERSION_CONFLICT: 'Buổi học đã được sửa ở nơi khác. Nạp bản mới nhất trước khi lưu hoặc xóa.',
  STUDY_TIME_CONFLICT: 'Khung giờ trùng buổi tự học khác. Tải lại lịch và chọn giờ khác.',
  SCHEDULE_TIME_CONFLICT: 'Khung giờ trùng lịch học hoặc buổi tự học đã lưu. Chọn giờ khác hoặc điều chỉnh lịch.',
  CLASS_SCHEDULE_NOT_FOUND: 'Lịch học không còn tồn tại hoặc bạn không được truy cập. Hãy tải lại lịch.',
  CLASS_SCHEDULE_VERSION_CONFLICT: 'Chuỗi hoặc một buổi đã được sửa ở nơi khác. Xem lại bản mới trước khi tiếp tục.',
  CLASS_SCHEDULE_HAS_EXCEPTIONS: 'Chuỗi có buổi đã nghỉ/đổi. Giữ ngày và cấu hình còn hợp lệ, hoặc xử lý ngoại lệ trước khi thay đổi.',
  CLASS_OCCURRENCE_NOT_FOUND: 'Ngày học không còn thuộc chuỗi. Đóng và chọn lại buổi từ lịch mới nhất.',
  CLASS_EXCEPTION_NOT_FOUND: 'Buổi không còn ngoại lệ riêng. Đọc lại buổi hiện tại trước khi tiếp tục.',
  INVALID_CLASS_EXCEPTION: 'Thay đổi buổi chưa hợp lệ. Kiểm tra giờ thực tế sau khi dùng thông tin theo chuỗi.',
  INVALID_CLASS_DATE: 'Ngày buổi học chưa hợp lệ trong năm 1900–2099.',
  INVALID_CLASS_RANGE: 'Khoảng ngày xem lịch chưa hợp lệ. Chọn lại ngày hoặc khoảng ngắn hơn.',
  STUDY_ASSIGNMENT_COURSE_MISMATCH: 'Bài tập cần thuộc đúng môn của buổi học. Kiểm tra lại bài đã chọn.',
  STUDY_AFTER_DEADLINE: 'Buổi học kết thúc sau hạn bài đã lưu. Đổi giờ hoặc gỡ liên kết bài tập.',
  INVALID_STUDY_RANGE: 'Khoảng thời gian lọc chưa hợp lệ. Chọn lại ngày và giờ.',
  DATA_CONFLICT: 'Dữ liệu đã thay đổi hoặc còn liên kết. Hãy tải lại trước khi thử tiếp.',
};
function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function errorFromResponse(status: number, value: unknown, retryAfter: string | null) {
  const code = object(value) && typeof value.code === 'string' ? value.code : 'HTTP_ERROR';
  const fields: FieldErrors = {};
  if (code === 'VALIDATION_FAILED' && object(value) && Array.isArray(value.errors)) {
    for (const item of value.errors) if (object(item) && typeof item.field === 'string' && typeof item.message === 'string'
      && (['email', 'password', 'confirmPassword', 'fullName', 'school', 'major', 'term', 'startYear', 'status', 'note', 'version', 'semesterId', 'code', 'name', 'credits', 'teacher', 'room', 'color', 'description', 'courseId', 'title', 'dueAt', 'priority', 'notes', 'startsAt', 'timeZone', 'durationMinutes', 'assignmentId', 'weekdays', 'startsOn', 'endsOn', 'startTime', 'endTime', 'reminderMinutes', 'reason', 'kind', 'scheduleVersion'].includes(item.field) || /^weekdays\[[0-6]\]$/.test(item.field))) fields[item.field] = item.message.slice(0, 180);
  }
  let message = messages[code] ?? (status >= 500 ? 'Dịch vụ đang gặp sự cố. Hãy thử lại sau.'
    : 'Chưa thể hoàn tất yêu cầu. Kiểm tra thông tin và thử lại.');
  // This known conflict includes the owned course/date/time; retain the specific explanation in the study form.
  if ((status === 409 && ['SCHEDULE_TIME_CONFLICT', 'CLASS_SCHEDULE_HAS_EXCEPTIONS'].includes(code) || status === 400 && code === 'INVALID_CLASS_EXCEPTION') && object(value)
    && typeof value.detail === 'string' && value.detail.trim() && value.detail.length <= 1200) message = value.detail;
  if (status === 429 && retryAfter && /^\d{1,5}$/.test(retryAfter)) message = `Bạn đã thử nhiều lần. Thử lại sau ${Number(retryAfter)} giây.`;
  return new ApiError(message, code, status, fields);
}

type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; body?: unknown; headers?: Record<string, string>; signal?: AbortSignal; credentials?: RequestCredentials; empty?: boolean };
export function createHttpClient(baseUrl: string, { timeoutMs = 10_000, fetcher = fetch }: { timeoutMs?: number; fetcher?: typeof fetch } = {}) {
  return async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    assertNotCancelled(options.signal);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    const interrupted = new Promise<never>((_, reject) => {
      abortListener = () => { controller.abort(); reject(cancelledRequest()); };
      options.signal?.addEventListener('abort', abortListener, { once: true });
      timer = setTimeout(() => { controller.abort(); reject(new ApiError('Phản hồi quá lâu. Kiểm tra kết nối và thử lại.', 'REQUEST_TIMEOUT')); }, timeoutMs);
    });
    const work = (async () => {
      let response: Response;
      try {
        response = await fetcher(baseUrl + path, {
          method: options.method ?? 'GET', credentials: options.credentials ?? 'omit', signal: controller.signal,
          headers: { Accept: 'application/json', ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
          ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        });
      } catch {
        assertNotCancelled(options.signal);
        if (controller.signal.aborted) throw new ApiError('Phản hồi quá lâu. Kiểm tra kết nối và thử lại.', 'REQUEST_TIMEOUT');
        throw new ApiError('Không thể kết nối. Kiểm tra mạng và thử lại.', 'NETWORK_ERROR');
      }
      const text = await response.text();
      let payload: unknown;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
      if (!response.ok) throw errorFromResponse(response.status, payload, response.headers.get('Retry-After'));
      if (options.empty) {
        if (response.status === 204 && !text) return undefined as T;
        throw new ApiError('Phản hồi xác nhận chưa hợp lệ. Kiểm tra dữ liệu trước khi thử lại.', 'INVALID_RESPONSE');
      }
      if (!object(payload) || !('data' in payload)) throw new ApiError('Phản hồi chưa hợp lệ. Hãy thử lại sau.', 'INVALID_RESPONSE');
      return payload.data as T;
    })();
    try {
      const result = await Promise.race([work, interrupted]);
      assertNotCancelled(options.signal);
      return result;
    } finally {
      if (timer) clearTimeout(timer);
      if (abortListener) options.signal?.removeEventListener('abort', abortListener);
    }
  };
}
