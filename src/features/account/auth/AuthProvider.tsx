import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { API_BASE_URL, AUTH_TRANSPORT } from '../../../shared/api/config';
import { createAccountApi } from '../api/accountApi';
import { SessionManager } from './SessionManager';
import { sessionCoordinator, sessionStore } from './sessionPlatform';
import type { SessionState } from './sessionTypes';

export const accountApi = createAccountApi(API_BASE_URL, AUTH_TRANSPORT);
type AuthContextValue = SessionState & Pick<SessionManager, 'signIn' | 'reloadProfile' | 'restore' | 'skipRestore' | 'logout'>;
const Context = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const ref = useRef<SessionManager | null>(null);
  if (!ref.current) ref.current = new SessionManager(accountApi, sessionStore, sessionCoordinator);
  const manager = ref.current, [state, setState] = useState(manager.state);
  useEffect(() => {
    const unsubscribe = manager.subscribe(() => setState(manager.state)), stopListening = manager.listen();
    void manager.restore();
    const check = () => { if (Platform.OS === 'web' ? document.visibilityState === 'visible' : AppState.currentState === 'active') void manager.tick(); };
    const timer = setInterval(check, 30_000);
    const native = AppState.addEventListener('change', status => { if (status === 'active') check(); });
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', check);
    return () => { unsubscribe(); stopListening(); clearInterval(timer); native.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', check); };
  }, [manager]);
  return <Context.Provider value={{ ...state, signIn: manager.signIn, reloadProfile: manager.reloadProfile,
    restore: manager.restore, skipRestore: manager.skipRestore, logout: manager.logout }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw new Error('Missing AuthProvider'); return value; }
