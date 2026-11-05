import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { emptyProfileEdit, ProfileEditManager } from './ProfileEditManager';

export function useProfileEditor() {
  const auth = useAuth(), id = auth.hasSession ? auth.profile?.id : null, owner = id ? `${auth.revision}:${id}` : null;
  const api = useMemo(() => ({ read: auth.reloadProfile, save: (input: Parameters<typeof auth.updateProfile>[0], signal: AbortSignal) => auth.updateProfile(input, signal, id!) }), [auth.reloadProfile, auth.updateProfile, id]);
  const [snapshot, setSnapshot] = useState({ owner: null as string | null, manager: null as ProfileEditManager | null, state: emptyProfileEdit() });
  useEffect(() => {
    if (!id || !owner) return;
    const manager = new ProfileEditManager(id, api), update = () => setSnapshot({ owner, manager, state: manager.state });
    const stop = manager.subscribe(update); update(); void manager.read().catch(() => { });
    return () => { stop(); manager.dispose(); };
  }, [owner, id, api]);
  return snapshot.owner === owner && owner ? snapshot : { owner, manager: null, state: emptyProfileEdit() };
}
