import { defaultLegacyExampleFilename, stripJsonExtension } from "../naming.js";
import type { MigratedVariant } from "./model.js";

/** One example as collected from the crawl, prior to lineage collapsing. */
export interface CollectedExample {
  /** The API version this example was found under. */
  readonly version: string;
  /** The `x-ms-examples` map key, used as the lineage title. */
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
      assignNaming(variant, {
        operationId: options.operationId,
        key: name,
        fileName: entry.fileName,
        singleLineage,
      });

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

/** Present keys in the canonical emission order: title, since, legacyFilename, request, responses. */
function orderKeys(variant: MigratedVariant): MigratedVariant {
  return {
    ...(variant.title !== undefined ? { title: variant.title } : {}),
    ...(variant.since !== undefined ? { since: variant.since } : {}),
    ...(variant.legacyFilename !== undefined ? { legacyFilename: variant.legacyFilename } : {}),
    request: variant.request,
    responses: variant.responses,
  };
}

/**
 * Assign the minimal `title` / `legacyFilename` needed for the emitter to reconstruct the original
 * x-ms-examples key and file name. Both are omitted whenever they follow the default convention
 * (key = `operationId`, file = `<operationId>.json`), so the common case stays clean.
 */
function assignNaming(
  variant: MigratedVariant,
  info: { operationId: string; key: string; fileName: string; singleLineage: boolean },
): void {
  const { operationId, key, fileName, singleLineage } = info;

  if (singleLineage) {
    // Both key and file name are the defaults => nothing to store.
    if (key === operationId && fileName === defaultLegacyExampleFilename(operationId)) {
      return;
    }
    // The key is recoverable from the file name (`Foo.json` -> key `Foo`) => store only the file.
    if (key === stripJsonExtension(fileName)) {
      variant.legacyFilename = fileName;
      return;
    }
  }

  // Otherwise the key must be stored as `title` (also required to disambiguate multiple lineages);
  // the file name only needs storing when it deviates from the `operationId`+`title` default.
  variant.title = key;
  if (fileName !== defaultLegacyExampleFilename(operationId, key)) {
    variant.legacyFilename = fileName;
  }
}
