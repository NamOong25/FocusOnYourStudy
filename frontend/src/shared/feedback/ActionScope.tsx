import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useNavigationScope } from '../../navigation/Navigation';
import { useFeedback } from './FeedbackProvider';

type ActionState = { phase: 'idle' | 'pending' | 'error'; label: string; message: string };
type Action = { callback: () => void; label: string };
const idle: ActionState = { phase: 'idle', label: '', message: '' };
const Context = createContext<{
  state: ActionState; busy: boolean;
  run: (callback: () => void, label: string) => void;
  retry: () => void; cancel: () => void;
} | null>(null);

// UI-only delay/failure before the existing synchronous mutation. No network request.
export function ActionScope({ children }: { children: ReactNode }) {
  const { active } = useNavigationScope();
  const { consumeSaveFailure } = useFeedback();
  const [state, setState] = useState(idle);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failed = useRef<Action | null>(null), mounted = useRef(true);
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null; failed.current = null;
    if (mounted.current) setState(idle);
  }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) clearTimeout(timer.current); }; }, []);
  useEffect(() => { if (!active) cancel(); }, [active, cancel]);
  const run = useCallback((callback: () => void, label: string) => {
    if (!active || timer.current) return;
    failed.current = { callback, label };
    setState({ phase: 'pending', label, message: '' });
    timer.current = setTimeout(() => {
      timer.current = null;
      if (!mounted.current) return;
      if (consumeSaveFailure()) {
        setState({ phase: 'error', label, message: 'Lần xử lý mẫu chưa thành công. Nội dung đang nhập vẫn được giữ; bạn có thể sửa rồi thử lại.' });
        return;
      }
      try {
        setState(idle);
        callback();
        failed.current = null;
      } catch {
        setState({ phase: 'error', label, message: 'Chưa thể hoàn tất thao tác. Kiểm tra nội dung và thử lại nhé.' });
      }
    }, 650);
  }, [active, consumeSaveFailure]);
  const retry = () => { const action = failed.current; if (action) run(action.callback, action.label); };
  return <Context.Provider value={{ state, busy: state.phase === 'pending', run, retry, cancel }}>{children}</Context.Provider>;
}
export function useActionState() { return useContext(Context); }
export function InteractionBlock({ children }: { children: ReactNode }) {
  const action = useActionState();
  return <View pointerEvents={action?.busy ? 'none' : 'auto'} style={{ gap: 16 }}>{children}</View>;
}
