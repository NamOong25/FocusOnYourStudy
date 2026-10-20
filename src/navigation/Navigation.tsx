import React, { createContext, ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BackHandler, Platform, ScrollView, ScrollViewProps } from 'react-native';
import { createBackRegistry } from './navigationState';

type Scope = { active: boolean; depth: number; closeFlow?: () => void; scroll: Map<string, number> };
const ScopeContext = createContext<Scope>({ active: true, depth: 0, scroll: new Map() });
const BackContext = createContext<ReturnType<typeof createBackRegistry> | null>(null);
export function NavigationProvider({ children }: { children: ReactNode }) {
  const sync = useRef<() => void>(() => {}); const scroll = useRef(new Map<string, number>());
  const registry = useMemo(() => createBackRegistry(() => sync.current()), []);
  useEffect(() => {
    const native = Platform.OS === 'android' ? BackHandler.addEventListener('hardwareBackPress', () => registry.back()) : undefined;
    if (Platform.OS !== 'web' || typeof window === 'undefined') return () => native?.remove();
    // One owned guard entry lets browser Back invoke the same active action as Android/Escape.
    // The URL stays unchanged; this is not a URL/deep-link router or a Forward-state replay system.
    const marker = '__focusStudyBack'; let guard = Boolean(window.history.state?.[marker]), ignoring = false, disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const synchronize = () => {
      if (disposed || ignoring) return;
      if (registry.size() && !guard) { window.history.pushState({ ...window.history.state, [marker]: true }, ''); guard = true; }
      else if (!registry.size() && guard && window.history.state?.[marker]) { ignoring = true; window.history.back(); }
    };
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(synchronize, 0); };
    const pop = () => {
      const wasGuard = guard; guard = Boolean(window.history.state?.[marker]);
      if (ignoring) ignoring = false; else if (wasGuard && !guard) registry.back();
      schedule();
    };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape' && !event.defaultPrevented && !event.isComposing && registry.back()) { event.preventDefault(); event.stopImmediatePropagation(); } };
    sync.current = schedule; window.addEventListener('popstate', pop); window.addEventListener('keyup', key, true); schedule();
    return () => { disposed = true; if (timer) clearTimeout(timer); sync.current = () => {}; window.removeEventListener('popstate', pop); window.removeEventListener('keyup', key, true); native?.remove(); };
  }, [registry]);
  return <BackContext.Provider value={registry}><ScopeContext.Provider value={{ active: true, depth: 0, scroll: scroll.current }}>{children}</ScopeContext.Provider></BackContext.Provider>;
}
export function useNavigationScope() { return useContext(ScopeContext); }
export function NavigationScope({ active, children }: { active: boolean; children: ReactNode }) { const parent = useNavigationScope(); return <ScopeContext.Provider value={{ ...parent, active: parent.active && active, depth: parent.depth + 1 }}>{children}</ScopeContext.Provider>; }
export function FlowScope({ onClose, children }: { onClose: () => void; children: ReactNode }) { const parent = useNavigationScope(), scroll = useRef(new Map<string, number>()); return <ScopeContext.Provider value={{ ...parent, depth: parent.depth + 1, closeFlow: onClose, scroll: scroll.current }}>{children}</ScopeContext.Provider>; }
export function useBackAction(enabled: boolean, onBack: () => void, priority?: number) {
  const registry = useContext(BackContext), scope = useNavigationScope(); const id = useRef(Symbol('back')), action = useRef(onBack); action.current = onBack;
  const rank = priority ?? scope.depth * 10 + 10;
  useEffect(() => { if (enabled && scope.active) return registry?.register(id.current, rank, () => action.current()); }, [registry, enabled, scope.active, rank]);
}
export function RememberedScrollView({ memoryKey, active = true, onScroll, onContentSizeChange, ...props }: ScrollViewProps & { memoryKey: string; active?: boolean }) {
  const scope = useNavigationScope(); const ref = useRef<ScrollView>(null); const restoring = useRef(true); const wanted = useRef(0); const visible = active && scope.active;
  useLayoutEffect(() => {
    if (!visible) return;
    restoring.current = true; wanted.current = scope.scroll.get(memoryKey) ?? 0;
    let second: number | undefined;
    const first = requestAnimationFrame(() => { ref.current?.scrollTo({ y: wanted.current, animated: false }); second = requestAnimationFrame(() => { restoring.current = false; }); });
    return () => { cancelAnimationFrame(first); if (second) cancelAnimationFrame(second); };
  }, [visible, memoryKey, scope.scroll]);
  return <ScrollView {...props} ref={ref} scrollEventThrottle={16} onScroll={event => { if (visible && !restoring.current) scope.scroll.set(memoryKey, event.nativeEvent.contentOffset.y); onScroll?.(event); }} onContentSizeChange={(w, h) => { if (visible && restoring.current) ref.current?.scrollTo({ y: wanted.current, animated: false }); onContentSizeChange?.(w, h); }} />;
}
