import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { PasswordChangeManager } from './PasswordChangeManager';
import { emptyPasswordDraft, type PasswordUpdate } from './passwordData';

export function usePasswordChange() {
  const auth = useAuth(), id = auth.hasSession ? auth.profile?.id : null, owner = id ? `${auth.revision}:${id}` : null;
  const save = useMemo(() => (input: PasswordUpdate, signal: AbortSignal) => auth.changePassword(input, signal, id!), [auth.changePassword, id]);
  const [snapshot, setSnapshot] = useState({ owner: null as string | null, manager: null as PasswordChangeManager | null, state: { draft: emptyPasswordDraft(), busy: false, error: null as import('../../../shared/api/http').ApiError | null } });
  useEffect(() => {
    if (!owner) return;
    const manager = new PasswordChangeManager(save), update = () => setSnapshot({ owner, manager, state: manager.state });
    const stop = manager.subscribe(update); update(); return () => { stop(); manager.dispose(); };
  }, [owner, save]);
  return snapshot.owner === owner && owner ? snapshot : { owner, manager: null, state: { draft: emptyPasswordDraft(), busy: false, error: null } };
}
