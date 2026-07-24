// Shared helpers for the bundle-size scripts.

/** Format a byte count as a human readable string (B, KB, MB). */
export function formatBytes(bytes: number): string {
  const abs = Math.abs(bytes);
  if (abs < 1024) {
    return `${bytes} B`;
  }
  if (abs < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Format a signed byte delta, e.g. "+1.20 KB" / "-512 B" / "0 B". */
export function formatDelta(bytes: number): string {
  if (bytes === 0) {
    return "0 B";
  }
  const sign = bytes > 0 ? "+" : "-";
  return `${sign}${formatBytes(Math.abs(bytes))}`;
}

/** Format a signed percentage, e.g. "+3.4%". Returns "n/a" when base is 0. */
export function formatPercent(base: number, head: number): string {
  if (base === 0) {
    return head === 0 ? "0%" : "new";
  }
  const pct = ((head - base) / base) * 100;
  if (pct === 0) {
    return "0%";
  }
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
