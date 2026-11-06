import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useApp } from '../../../store/model';
import { API_BASE_URL } from '../../../shared/api/config';
import { ApiError, cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../auth/AuthProvider';
import { createReminderPreferencesApi } from './reminderPreferencesApi';
import { parseReminderPreferences, type ReminderPreferences } from './reminderPreferencesData';
import { emptySavedReminderPreferences, ReminderPreferencesSource } from './ReminderPreferencesSource';
import { notifyReminderPreferences, startReminderPreferencesSync } from './reminderPreferencesSync';

type SavedPreferences = ReturnType<typeof emptySavedReminderPreferences> & {
  reload: () => Promise<unknown>;
  accept: (value: ReminderPreferences, announce?: boolean) => ReminderPreferences;
};
const Context = createContext<SavedPreferences | null>(null);

export function ReminderPreferencesProvider({ children }: { children: ReactNode }) {
  const auth = useAuth(), { accountPreferences } = useApp();
  const id = auth.hasSession ? auth.profile?.id : null, owner = id ? auth.revision + ':' + id : null;
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const api = useMemo(() => createReminderPreferencesApi(API_BASE_URL, (operation, signal) => {
    if (!owner || currentOwner.current !== owner) return Promise.reject(cancelledRequest());
    return auth.authorized(token => {
      if (currentOwner.current !== owner) return Promise.reject(cancelledRequest());
      return operation(token);
    }, signal);
  }), [owner, auth.authorized]);
  const liveSource = useRef<{ owner: string; source: ReminderPreferencesSource } | null>(null);
  const [snapshot, setSnapshot] = useState({ owner: null as string | null, state: emptySavedReminderPreferences() });
  useEffect(() => {
    if (!owner || !id) return;
    const source = new ReminderPreferencesSource(api.read);
    liveSource.current = { owner, source };
    const update = () => setSnapshot({ owner, state: source.state });
    const stop = source.subscribe(update), stopSync = startReminderPreferencesSync(source.reload, id);
    update();
    void source.reload().catch(() => { });
    return () => {
      stopSync(); stop(); source.dispose();
      if (liveSource.current?.source === source) liveSource.current = null;
    };
  }, [api, owner, id]);
  const accept = useCallback((value: ReminderPreferences, announce = false) => {
    const live = liveSource.current;
    if (!owner || !id || currentOwner.current !== owner || live?.owner !== owner) throw cancelledRequest();
    const current = live.source.accept(value);
    if (announce) notifyReminderPreferences(id);
    return current;
  }, [owner, id]);
  const reload = useCallback(() => {
    if (!owner) return auth.reloadProfile(new AbortController().signal);
    const live = liveSource.current;
    return currentOwner.current === owner && live?.owner === owner ? live.source.reload() : Promise.reject(cancelledRequest());
  }, [owner, auth.reloadProfile]);
  const preview = useMemo(() => parseReminderPreferences({ ...accountPreferences, version: 0 }), [accountPreferences]);
  const state = owner && snapshot.owner === owner ? snapshot.state : {
    ...emptySavedReminderPreferences(), error: auth.hasSession && !id
      ? auth.profileError ?? new ApiError('Tải lại hồ sơ tài khoản để đọc tùy chọn nhắc học.', 'REMINDER_PROFILE_REQUIRED') : null,
  };
  return <Context.Provider value={{ ...(auth.hasSession ? state : { value: preview, loading: false, error: null }), reload, accept }}>
    {children}
  </Context.Provider>;
}

export function useSavedReminderPreferences() {
  const value = useContext(Context);
  if (!value) throw new Error('Missing ReminderPreferencesProvider');
  return value;
}
