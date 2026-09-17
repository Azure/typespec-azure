/**
 * Selection of the applicable example variant for a target API version, using the single linear
 * version order from `service.yaml` (RFC §; no preview/stable special-casing).
 */

/** A variant with an optional `since` marker. */
export interface HasSince {
  readonly since?: unknown;
}

/**
 * Within a lineage, pick the entry with the greatest `since` that is `<=` the target version.
 * The base entry (no `since`) applies from the earliest version. Returns `undefined` when nothing
 * applies (e.g. every entry's `since` is newer than the target and there is no base).
 *
 * `apiVersion` and all `since` values are located in `order`; entries whose `since` is not in
 * `order` are ignored. When `apiVersion` itself is not in `order`, nothing resolves.
 */
export function selectApplicable<T extends HasSince>(
  entries: readonly T[],
  apiVersion: string,
  order: readonly string[],
): T | undefined {
  const targetIndex = order.indexOf(apiVersion);
  if (targetIndex < 0) return undefined;

  let best: T | undefined;
  let bestIndex = Number.NEGATIVE_INFINITY;

  for (const entry of entries) {
    const since = typeof entry.since === "string" ? entry.since : undefined;
    // The base entry sorts below every real version so any `since <= target` wins over it.
    const index = since === undefined ? -1 : order.indexOf(since);
    if (since !== undefined && index < 0) continue;
    if (index <= targetIndex && index > bestIndex) {
      best = entry;
      bestIndex = index;
    }
  }

  return best;
}
