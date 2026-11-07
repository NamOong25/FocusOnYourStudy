import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigationScope } from '../../../navigation/Navigation';
import { API_BASE_URL } from '../../../shared/api/config';
import { cancelledRequest } from '../../../shared/api/http';
import { useAuth } from '../auth/AuthProvider';
import { createDataExportApi } from './dataExportApi';
import { DataExportManager, emptyDataExport } from './DataExportManager';
import { saveExport } from './saveExport';

export function useDataExport() {
  const auth = useAuth(), { active } = useNavigationScope();
  const id = active && auth.hasSession ? auth.profile?.id : null, owner = id ? auth.revision + ':' + id : null;
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  const api = useMemo(() => {
    const assertOwner = () => { if (!owner || currentOwner.current !== owner) throw cancelledRequest(); };
    const transport = createDataExportApi(API_BASE_URL, (operation, signal) => {
      assertOwner();
      return auth.authorized(token => { assertOwner(); return operation(token); }, signal);
    }, id ?? '');
    return { prepare: transport.prepare,
      deliver: (file: Parameters<typeof saveExport>[0], signal: AbortSignal) => saveExport(file, signal, assertOwner) };
  }, [owner, id, auth.authorized]);
  const [snapshot, setSnapshot] = useState({
    owner: null as string | null, manager: null as DataExportManager | null, state: emptyDataExport(),
  });
  useEffect(() => {
    if (!owner) return;
    const manager = new DataExportManager(api);
    const update = () => setSnapshot({ owner, manager, state: manager.state });
    const stop = manager.subscribe(update);
    update();
    return () => { stop(); manager.dispose(); };
  }, [owner, api]);
  return owner && snapshot.owner === owner ? snapshot : { owner, manager: null, state: emptyDataExport() };
}
