import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigationScope } from '../../../navigation/Navigation';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../auth/AuthProvider';
import { createReminderPreferencesApi } from './reminderPreferencesApi';
import { emptyReminderPreferences, ReminderPreferencesManager } from './ReminderPreferencesManager';
import { useSavedReminderPreferences } from './ReminderPreferencesProvider';
import type { ReminderPreferences } from './reminderPreferencesData';

export function useReminderPreferences() {
  const auth = useAuth(), { active } = useNavigationScope();
  const shared = useSavedReminderPreferences();
  const owner = active && auth.hasSession && auth.profile ? auth.revision + ':' + auth.profile.id : null;
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const api = useMemo(() => {
    const transport = createReminderPreferencesApi(API_BASE_URL, (operation, signal) => {
      if (!owner || currentOwner.current !== owner) return Promise.reject(cancelledRequest());
      return auth.authorized(token => {
        if (currentOwner.current !== owner) return Promise.reject(cancelledRequest());
        return operation(token);
      }, signal);
    });
    return {
      read: async (signal: AbortSignal) => shared.accept(await transport.read(signal)),
      save: async (input: ReminderPreferences, signal: AbortSignal) => {
        const saved = await transport.save(input, signal);
        shared.accept(saved, true);
        return saved;
      },
    };
  }, [auth.authorized, owner, shared.accept]);
  const [snapshot, setSnapshot] = useState({
    owner: null as string | null, manager: null as ReminderPreferencesManager | null, state: emptyReminderPreferences(),
  });
  useEffect(() => {
    if (!owner) return;
    const manager = new ReminderPreferencesManager(api);
    const update = () => setSnapshot({ owner, manager, state: manager.state });
    const stop = manager.subscribe(update);
    update();
    void manager.read().catch(() => { });
    return () => { stop(); manager.dispose(); };
  }, [owner, api]);
  return owner && snapshot.owner === owner ? snapshot : { owner, manager: null, state: emptyReminderPreferences() };
}
