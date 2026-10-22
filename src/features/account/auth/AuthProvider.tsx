import React, { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { API_BASE_URL, AUTH_TRANSPORT } from '../../../shared/api/config';
import { ApiError, asApiError, assertNotCancelled, isCancelled } from '../../../shared/api/http';
import { createAccountApi } from '../api/accountApi';
import type { AccountProfile, LoginInput, LoginResult } from '../api/types';

export const accountApi = createAccountApi(API_BASE_URL, AUTH_TRANSPORT);
type ProfileState = { hasSession: boolean; profile: AccountProfile | null; profileError: ApiError | null; email: string };
const guest: ProfileState = { hasSession: false, profile: null, profileError: null, email: '' };
type AuthContextValue = ProfileState & { signIn: (input: LoginInput, signal: AbortSignal) => Promise<boolean>; reloadProfile: (signal: AbortSignal) => Promise<void> };
const Context = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProfileState>(guest);
  // Tokens live in memory only in 2C.1. Never copy them to the prototype store, storage or logs.
  const session = useRef<LoginResult | null>(null), generation = useRef(0), signingIn = useRef(false);
  const signIn = async (input: LoginInput, signal: AbortSignal) => {
    if (signingIn.current) throw new ApiError('Đang xử lý đăng nhập. Hãy đợi một chút.', 'REQUEST_BUSY');
    signingIn.current = true;
    const version = ++generation.current;
    try {
      const next = await accountApi.login(input, signal);
      assertNotCancelled(signal);
      let profile: AccountProfile | null = null, profileError: ApiError | null = null;
      try {
        profile = await accountApi.profile(next.accessToken, signal);
        if (profile.id !== next.user.id) throw new ApiError('Chưa xác nhận được đúng hồ sơ. Hãy đăng nhập lại.', 'PROFILE_MISMATCH');
      } catch (error) {
        if (isCancelled(error) || signal.aborted) { assertNotCancelled(signal); throw error; }
        profileError = asApiError(error); profile = null;
      }
      assertNotCancelled(signal);
      if (version === generation.current) {
        session.current = next;
        setState({ hasSession: true, profile, profileError, email: next.user.email });
      }
      return !!profile;
    } finally { signingIn.current = false; }
  };
  const reloadProfile = async (signal: AbortSignal) => {
    const current = session.current, version = generation.current;
    if (!current) throw new ApiError('Bạn cần đăng nhập để xem hồ sơ.', 'AUTHENTICATION_REQUIRED', 401);
    try {
      const profile = await accountApi.profile(current.accessToken, signal);
      if (profile.id !== current.user.id) throw new ApiError('Chưa xác nhận được đúng hồ sơ. Hãy đăng nhập lại.', 'PROFILE_MISMATCH');
      assertNotCancelled(signal);
      if (generation.current === version && session.current === current) setState({ hasSession: true, profile, profileError: null, email: profile.email });
    } catch (error) {
      if (!isCancelled(error) && !signal.aborted && generation.current === version && session.current === current)
        setState({ hasSession: true, profile: null, profileError: asApiError(error), email: current.user.email });
      throw error;
    }
  };
  return <Context.Provider value={{ ...state, signIn, reloadProfile }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('Missing AuthProvider'); return value; }
