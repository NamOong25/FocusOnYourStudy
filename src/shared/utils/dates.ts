export const today = new Date();
export function dateKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function addDays(d: Date, n: number) { const next = new Date(d); next.setDate(next.getDate() + n); return next; }
export function parseDay(s: string) { const [y, m, d] = s.split('-').map(Number); return new Date(y!, m! - 1, d!); }
export function dateLabel(s: string) { const d = parseDay(s); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`; }
export function dueLabel(s: string) { const diff = Math.round((parseDay(s).getTime() - parseDay(dateKey(new Date())).getTime()) / 86400000); return diff < 0 ? `Trễ ${-diff} ngày` : diff === 0 ? 'Hôm nay' : diff === 1 ? 'Ngày mai' : `Còn ${diff} ngày`; }
export function isValidDate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && dateKey(parseDay(s)) === s; }
