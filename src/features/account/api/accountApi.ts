import { ApiError, createHttpClient } from '../../../shared/api/http';
import type { AccountProfile, LoginInput, LoginResult, RegisterInput } from './types';

const isProfile = (p: unknown): p is AccountProfile => {
  if (typeof p !== 'object' || p === null) return false;
  const v = p as Record<string, unknown>;
  return ['id', 'email', 'fullName', 'school', 'major', 'timeZone'].every(key => typeof v[key] === 'string') && !!v.id && !!v.email && !!v.fullName;
};
const invalidResponse = () => new ApiError('Phản hồi tài khoản chưa hợp lệ. Hãy thử lại sau.', 'INVALID_RESPONSE');

export function createAccountApi(baseUrl: string, transport: 'cookie' | 'body', options?: Parameters<typeof createHttpClient>[1]) {
  const request = createHttpClient(baseUrl, options);
  const credentials = transport === 'cookie' ? 'include' as const : 'omit' as const;
  async function authHeaders(signal?: AbortSignal): Promise<Record<string, string>> {
    if (transport === 'body') return { 'X-Auth-Transport': 'body' };
    // Get a fresh masked CSRF token for each deliberate submission; never automatically retry a mutation.
    const proof = await request<{ headerName: string; token: string }>('/api/v1/auth/csrf', { signal, credentials });
    if (!proof || proof.headerName !== 'X-XSRF-TOKEN' || typeof proof.token !== 'string' || !proof.token) throw invalidResponse();
    return { 'X-Auth-Transport': 'cookie', 'X-XSRF-TOKEN': proof.token };
  }
  return {
    async register(input: RegisterInput, signal?: AbortSignal) {
      const headers = await authHeaders(signal);
      const profile = await request<unknown>('/api/v1/auth/register', { method: 'POST', body: input, signal, credentials, headers });
      if (!isProfile(profile)) throw invalidResponse();
      return profile;
    },
    async login(input: LoginInput, signal?: AbortSignal): Promise<LoginResult> {
      const headers = await authHeaders(signal);
      const value = await request<LoginResult>('/api/v1/auth/login', { method: 'POST', body: input, signal, credentials, headers });
      if (!value || typeof value.accessToken !== 'string' || !value.accessToken || value.tokenType !== 'Bearer'
        || !Number.isFinite(value.expiresIn) || value.expiresIn <= 0 || !isProfile(value.user)
        || (transport === 'body' && typeof value.refreshToken !== 'string')) throw invalidResponse();
      return value;
    },
    async profile(accessToken: string, signal?: AbortSignal) {
      const profile = await request<unknown>('/api/v1/users/me', { signal, credentials,
        headers: { Authorization: `Bearer ${accessToken}` } });
      if (!isProfile(profile)) throw invalidResponse();
      return profile;
    },
  };
}
