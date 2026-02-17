/**
 * Format a dollar amount according to the spec:
 * >= 1B as $X.XB, >= 1M as $X.XM, >= 1K as $X.XK, below 1K as $X
 */
export function formatDollarAmount(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num) || num === 0) {
    return "$0";
  }

  const absValue = Math.abs(num);

  if (absValue >= 1_000_000_000) {
    const formatted = (num / 1_000_000_000).toFixed(1);
    return `$${formatted}B`;
  }

  if (absValue >= 1_000_000) {
    const formatted = (num / 1_000_000).toFixed(1);
    return `$${formatted}M`;
  }

  if (absValue >= 1_000) {
    const formatted = (num / 1_000).toFixed(1);
    return `$${formatted}K`;
  }

  return `$${num.toFixed(0)}`;
}
