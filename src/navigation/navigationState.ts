export type Tab = 'home' | 'schedule' | 'focus' | 'stats' | 'ai';
export type ScheduleMode = 'Lịch & bài tập' | 'Môn & học kỳ' | 'Tự học';
export type AppRoute = { tab: Tab; scheduleMode: ScheduleMode };
export const homeRoute: AppRoute = { tab: 'home', scheduleMode: 'Lịch & bài tập' };
export function pushRoute(trail: AppRoute[], next: AppRoute) {
  const current = trail[trail.length - 1] ?? homeRoute;
  if (current.tab === next.tab && current.scheduleMode === next.scheduleMode) return trail;
  return trail.length >= 40 ? [trail[0]!, ...trail.slice(-38), next] : [...trail, next];
}
export function previousRoute(trail: AppRoute[]) { return trail.length > 1 ? trail.slice(0, -1) : trail; }
export function viewKey(route: AppRoute) { return route.tab === 'schedule' ? route.scheduleMode : route.tab; }
export function routeLabel(route: AppRoute) { return route.tab === 'schedule' ? route.scheduleMode : ({ home: 'Trang chủ', focus: 'Tập trung', stats: 'Thống kê', ai: 'Trợ lý AI' })[route.tab]; }
export function createBackRegistry(changed: () => void = () => {}) {
  const entries = new Map<symbol, { priority: number; order: number; action: () => void }>(); let order = 0;
  return {
    register(id: symbol, priority: number, action: () => void) { entries.set(id, { priority, order: ++order, action }); changed(); return () => { entries.delete(id); changed(); }; },
    size: () => entries.size,
    back() { const item = [...entries.values()].sort((a, b) => b.priority - a.priority || b.order - a.order)[0]; if (!item) return false; item.action(); return true; },
  };
}
