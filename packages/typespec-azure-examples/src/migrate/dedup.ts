import type { MigratedVariant } from "./model.js";

/** One example as collected from the crawl, prior to lineage collapsing. */
export interface CollectedExample {
  /** The API version this example was found under. */
  readonly version: string;
  /** The `x-ms-examples` map key, used as the lineage title. */
  readonly exampleName: string;
  /** The transformed + api-version-normalized variant content. */
  readonly variant: MigratedVariant;
}

export interface BuildLineagesOptions {
  /** Ascending comparator over version strings (lowest/earliest first). */
  readonly compareVersions: (a: string, b: string) => number;
  /**
   * The earliest version across the whole migration. When a lineage's first appearance is later
   * than this, its base entry gets a `since` so migration stays faithful. When omitted, the
   * earliest entry of each lineage is always the base (no `since`).
   */
  readonly baselineVersion?: string;
}

/**
 * Collapse an operation's collected examples into unified variants: group by lineage (example
 * name), order by version, keep one base entry, and emit a `since` variant only when the content
 * changes from the previously-emitted entry. If the operation has a single lineage, the `title` is
 * omitted (single-example case).
 */
export function buildLineages(
  examples: readonly CollectedExample[],
  options: BuildLineagesOptions,
): MigratedVariant[] {
  const byName = new Map<string, CollectedExample[]>();
  for (const example of examples) {
    const group = byName.get(example.exampleName);
    if (group) group.push(example);
    else byName.set(example.exampleName, [example]);
  }

  const singleLineage = byName.size <= 1;
  const result: MigratedVariant[] = [];

  for (const [name, group] of byName) {
    const ordered = [...group].sort((a, b) => options.compareVersions(a.version, b.version));

    let lastContent: string | undefined;
    let isFirst = true;
    for (const entry of ordered) {
      const content = canonicalize(entry.variant);
      if (!isFirst && content === lastContent) continue;

      const variant: MigratedVariant = {
        request: entry.variant.request,
        responses: entry.variant.responses,
      };
      if (!singleLineage) variant.title = name;

      const introduceSince =
        !isFirst ||
        (options.baselineVersion !== undefined && entry.version !== options.baselineVersion);
      if (introduceSince) variant.since = entry.version;

      result.push(orderKeys(variant));
      lastContent = content;
      isFirst = false;
    }
  }

  return result;
}

/** Stable, key-order-independent serialization used to compare variant content for equality. */
function canonicalize(variant: MigratedVariant): string {
  return JSON.stringify(sortValue({ request: variant.request, responses: variant.responses }));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortValue((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Present keys in the canonical emission order: title, since, request, responses. */
function orderKeys(variant: MigratedVariant): MigratedVariant {
  const ordered: MigratedVariant = { request: variant.request, responses: variant.responses };
  if (variant.title !== undefined) ordered.title = variant.title;
  if (variant.since !== undefined) ordered.since = variant.since;
  return {
    ...(ordered.title !== undefined ? { title: ordered.title } : {}),
    ...(ordered.since !== undefined ? { since: ordered.since } : {}),
    request: ordered.request,
    responses: ordered.responses,
  };
}
