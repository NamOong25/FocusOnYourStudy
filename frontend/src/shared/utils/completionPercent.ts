/** Exact HALF_UP percentage, shared with the backend's integer result. */
export function completionPercent(completed: number, total: number) {
  if (!Number.isSafeInteger(completed) || !Number.isSafeInteger(total) || completed < 0 || total < 0 || completed > total)
    throw new RangeError('Invalid completion counts');
  return total ? Number((BigInt(completed) * BigInt(200) + BigInt(total)) / (BigInt(total) * BigInt(2))) : 0;
}
