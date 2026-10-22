import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigationScope } from '../../../navigation/Navigation';
import { asApiError, isCancelled, type ApiError } from '../../../shared/api/http';

export function useApiAction() {
  const { active } = useNavigationScope();
  const mounted = useRef(true), visible = useRef(active), request = useRef<AbortController | null>(null);
  visible.current = active;
  const [busy, setBusy] = useState(false), [error, setError] = useState<ApiError | null>(null);
  const cancel = useCallback(() => { request.current?.abort(); request.current = null; if (mounted.current) setBusy(false); }, []);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; request.current?.abort(); request.current = null; }; }, []);
  useEffect(() => { if (!active) cancel(); }, [active, cancel]);
  const run = async <T,>(operation: (signal: AbortSignal) => Promise<T>, success?: (result: T) => void) => {
    if (request.current || !visible.current || !mounted.current) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError(null);
    try {
      const result = await operation(controller.signal);
      if (mounted.current && visible.current && request.current === controller && !controller.signal.aborted) success?.(result);
    } catch (failure) {
      if (mounted.current && visible.current && request.current === controller && !controller.signal.aborted && !isCancelled(failure)) setError(asApiError(failure));
    } finally {
      if (request.current === controller) { request.current = null; if (mounted.current) setBusy(false); }
    }
  };
  return { busy, error, clearError: () => setError(null), run, cancel };
}
