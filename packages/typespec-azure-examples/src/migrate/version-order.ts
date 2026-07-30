/**
 * Version ordering for migration. Azure API versions are date-based (`YYYY-MM-DD`) with an optional
 * `-preview`/`-beta` suffix. When a `service.yaml` order is available it is authoritative; otherwise
 * this heuristic sorts by date ascending and places a same-dated preview *before* its GA.
 */

/** Build a comparator from an explicit, authoritative version order (e.g. from `service.yaml`). */
export function comparatorFromOrder(order: readonly string[]): (a: string, b: string) => number {
  const index = new Map(order.map((version, i) => [version, i] as const));
  return (a, b) => {
    const ia = index.get(a);
    const ib = index.get(b);
    if (ia !== undefined && ib !== undefined) return ia - ib;
    if (ia !== undefined) return -1;
    if (ib !== undefined) return 1;
    return defaultCompareVersions(a, b);
  };
}

/** Heuristic comparator over date-based Azure version strings. */
export function defaultCompareVersions(a: string, b: string): number {
  const da = datePart(a);
  const db = datePart(b);
  if (da !== db) return da < db ? -1 : 1;
  const pa = isPreview(a) ? 0 : 1;
  const pb = isPreview(b) ? 0 : 1;
  if (pa !== pb) return pa - pb;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Return the earliest version under the given comparator. */
export function earliestVersion(
  versions: readonly string[],
  compare: (a: string, b: string) => number,
): string | undefined {
  if (versions.length === 0) return undefined;
  return [...versions].sort(compare)[0];
}

function datePart(version: string): string {
  const match = /^\d{4}-\d{2}-\d{2}/.exec(version);
  return match ? match[0] : version;
}

function isPreview(version: string): boolean {
  return /-(preview|beta|privatepreview)/i.test(version);
}
