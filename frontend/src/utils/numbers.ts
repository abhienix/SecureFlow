export function safeFixed(value: unknown, decimals = 1): string {
  const n = parseFloat(String(value ?? 0));
  if (isNaN(n) || !isFinite(n)) {
    return '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '');
  }
  return n.toFixed(decimals);
}

export function safeNumber(value: unknown, fallback = 0): number {
  const n = parseFloat(String(value ?? fallback));
  if (isNaN(n) || !isFinite(n)) return fallback;
  return n;
}
