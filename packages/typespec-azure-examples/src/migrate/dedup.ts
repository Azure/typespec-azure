import { isValidExampleId, stripJsonExtension } from "../naming.js";
import type { MigratedVariant } from "./model.js";

/** One example as collected from the crawl, prior to lineage collapsing. */
export interface CollectedExample {
  /** The API version this example was found under. */
  readonly version: string;
  /** The `x-ms-examples` map key, preserved as display text when it differs from the ID. */
  readonly exampleName: string;
  /** The original `x-ms-examples` file name (basename of the `$ref`). */
  readonly fileName: string;
  /** The transformed + api-version-normalized variant content. */
  readonly variant: MigratedVariant;
}

export interface BuildLineagesOptions {
  /** The Swagger `operationId` of the operation (used to reconstruct the default file name/key). */
  readonly operationId: string;
  /** Ascending comparator over version strings (lowest/earliest first). */
  readonly compareVersions: (a: string, b: string) => number;
  /**
   * The earliest version across the whole migration. When a lineage's first appearance is later
   * than this, its base entry gets a `since` so migration stays faithful. When omitted, the
   * earliest entry of each lineage is always the base (no `since`).
   */
  readonly baselineVersion?: string;
  /** IDs already assigned to other operations in the same service. */
  readonly usedIds?: Set<string>;
}

/**
 * Collapse an operation's collected examples into unified variants: group related version entries,
 * keep one base entry, and emit a `since` variant when the content or display title changes.
 * Each lineage gets a stable ID derived from its original
 * filename; titles are omitted when the single lineage's original key is recoverable from its ID.
 */
export function buildLineages(
  examples: readonly CollectedExample[],
  options: BuildLineagesOptions,
): MigratedVariant[] {
  const groups = groupCollectedExamples(examples);
  const singleLineage = groups.length <= 1;
  const result: MigratedVariant[] = [];
  const usedIds = options.usedIds ?? new Set<string>();

  for (const group of groups) {
    const ordered = [...group].sort((a, b) => options.compareVersions(a.version, b.version));
    const firstFileName = ordered[0].fileName;
    const candidate = stripJsonExtension(firstFileName);
    const stableFileName = ordered.every((entry) => entry.fileName === firstFileName);
    let id: string | undefined;
    if (stableFileName && isValidExampleId(candidate)) {
      id = candidate;
      let index = 2;
      while (usedIds.has(id.toLowerCase())) id = `${candidate}_${index++}`;
      usedIds.add(id.toLowerCase());
    }

    let lastContent: string | undefined;
    let isFirst = true;
    for (const entry of ordered) {
      const content =
        canonicalize(entry.variant) +
        JSON.stringify([entry.exampleName, id === undefined ? entry.fileName : undefined]);
      if (!isFirst && content === lastContent) continue;

      const variant: MigratedVariant = {
        request: entry.variant.request,
        responses: entry.variant.responses,
      };
      if (id !== undefined) {
        variant.id = id;
        if (!singleLineage || entry.exampleName !== id) variant.title = entry.exampleName;
      } else {
        // Historical filename changes cannot be represented by one stable ID without renaming files.
        variant.title = entry.exampleName;
        variant.legacyFilename = entry.fileName;
      }

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

export function groupCollectedExamples(
  examples: readonly CollectedExample[],
): CollectedExample[][] {
  const byName = new Map<string, CollectedExample[]>();
  for (const example of examples) {
    const group = byName.get(example.exampleName);
    if (group === undefined) byName.set(example.exampleName, [example]);
    else group.push(example);
  }
  const groups = [...byName.values()];
  for (let i = 0; i < groups.length; i++) {
    for (let j = i + 1; j < groups.length; j++) {
      const files = new Set(groups[i].map((entry) => entry.fileName));
      const versions = new Set(groups[i].map((entry) => entry.version));
      if (
        groups[j].some((entry) => files.has(entry.fileName)) &&
        groups[j].every((entry) => !versions.has(entry.version))
      ) {
        // A display-title change is not a new example; coexisting examples still stay distinct.
        groups[i].push(...groups[j]);
        groups.splice(j, 1);
        j = i;
      }
    }
  }
  return groups;
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

/** Present identity and version metadata before the request and responses. */
function orderKeys(variant: MigratedVariant): MigratedVariant {
  return {
    ...(variant.id !== undefined ? { id: variant.id } : {}),
    ...(variant.title !== undefined ? { title: variant.title } : {}),
    ...(variant.since !== undefined ? { since: variant.since } : {}),
    ...(variant.legacyFilename !== undefined ? { legacyFilename: variant.legacyFilename } : {}),
    request: variant.request,
    responses: variant.responses,
  };
}
