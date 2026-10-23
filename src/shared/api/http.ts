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
  DATA_CONFLICT: 'Dữ liệu đã thay đổi hoặc còn liên kết. Hãy tải lại trước khi thử tiếp.',
};
function object(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function errorFromResponse(status: number, value: unknown, retryAfter: string | null) {
  const code = object(value) && typeof value.code === 'string' ? value.code : 'HTTP_ERROR';
  const fields: FieldErrors = {};
  if (code === 'VALIDATION_FAILED' && object(value) && Array.isArray(value.errors)) {
    for (const item of value.errors) if (object(item) && typeof item.field === 'string' && typeof item.message === 'string'
      && ['email', 'password', 'confirmPassword', 'fullName', 'school', 'major', 'term', 'startYear', 'status', 'note', 'version'].includes(item.field)) fields[item.field] = item.message.slice(0, 180);
  }
  let message = messages[code] ?? (status >= 500 ? 'Dịch vụ đang gặp sự cố. Hãy thử lại sau.'
    : 'Chưa thể hoàn tất yêu cầu. Kiểm tra thông tin và thử lại.');
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
      if (options.empty && response.status === 204 && !text) return undefined as T;
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
