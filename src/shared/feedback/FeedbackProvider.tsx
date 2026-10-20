import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

type Notice = { id: number; message: string };
type Host = { priority: number; order: number };
function useFeedbackState() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [failNextSave, setFailNextSave] = useState(false);
  const failRef = useRef(false), sequence = useRef(0);
  const [hosts, setHosts] = useState<Record<string, Host>>({});
  const showNotice = useCallback((message: string) => {
    setNotice(message ? { id: ++sequence.current, message } : null);
  }, []);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const armSaveFailure = useCallback((enabled: boolean) => {
    failRef.current = enabled;
    setFailNextSave(enabled);
  }, []);
  const consumeSaveFailure = useCallback(() => {
    const fail = failRef.current;
    if (fail) { failRef.current = false; setFailNextSave(false); }
    return fail;
  }, []);
  const registerHost = useCallback((id: string, priority: number) => {
    const order = ++sequence.current;
    setHosts(previous => ({ ...previous, [id]: { priority, order } }));
    return () => setHosts(previous => {
      const next = { ...previous }; delete next[id]; return next;
    });
  }, []);
  const activeHost = Object.entries(hosts).sort((a, b) => b[1].priority - a[1].priority || b[1].order - a[1].order)[0]?.[0];
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(dismissNotice, 6000);
    return () => clearTimeout(timer);
  }, [notice, dismissNotice]);
  return { notice, showNotice, dismissNotice, registerHost, activeHost, failNextSave, armSaveFailure, consumeSaveFailure };
}
const Context = createContext<ReturnType<typeof useFeedbackState> | null>(null);
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const state = useFeedbackState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useFeedback() {
  const state = useContext(Context);
  if (!state) throw new Error('Missing FeedbackProvider');
  return state;
}
