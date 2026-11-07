/** Exact microsecond comparisons within the app's 1900–2099 deadline range. */
export function instantMicros(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d)(?:\.(\d{1,6}))?(Z|([+-])(\d\d):(\d\d))$/.exec(value);
  if (!match) return null;
  const base = Date.parse(match[1] + 'Z');
  if (!Number.isFinite(base) || new Date(base).toISOString().slice(0, 19) !== match[1]) return null;
  const hours = Number(match[5] ?? 0), minutes = Number(match[6] ?? 0);
  if (hours > 18 || minutes > 59 || hours === 18 && minutes !== 0) return null;
  const offset = (hours * 60 + minutes) * 60000000 * (match[4] === '-' ? -1 : 1);
  const micros = base * 1000 + Number((match[2] ?? '').padEnd(6, '0')) - offset;
  return Number.isSafeInteger(micros) ? micros : null;
}
