import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigationScope } from '../../../navigation/Navigation';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../auth/AuthProvider';
import { createReminderPreferencesApi } from './reminderPreferencesApi';
import { emptyReminderPreferences, ReminderPreferencesManager } from './ReminderPreferencesManager';

export function useReminderPreferences() {
  const auth = useAuth(), { active } = useNavigationScope();
  const owner = active && auth.hasSession && auth.profile ? auth.revision + ':' + auth.profile.id : null;
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const api = useMemo(() => createReminderPreferencesApi(API_BASE_URL, (operation, signal) => {
    if (!owner || currentOwner.current !== owner) return Promise.reject(cancelledRequest());
    return auth.authorized(token => {
      if (currentOwner.current !== owner) return Promise.reject(cancelledRequest());
      return operation(token);
    }, signal);
  }), [auth.authorized, owner]);
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
