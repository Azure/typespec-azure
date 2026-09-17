import type { ExampleDiagnostic } from "../types.js";
import { buildLineages, type CollectedExample } from "./dedup.js";
import { planFiles, type EmittedFile, type OperationEntry } from "./emit.js";
import { normalizeApiVersion } from "./normalize.js";
import { deriveOperationKey } from "./operation-key.js";
import { crawlExamples } from "./swagger.js";
import { transformExample } from "./transform.js";
import {
  comparatorFromOrder,
  defaultCompareVersions,
  earliestVersion,
  latestVersion,
} from "./version-order.js";

/** Options controlling a migration run. */
export interface MigrateOptions {
  /** Override the detected `$namespace`. */
  readonly namespace?: string;
  /**
   * Authoritative version order (e.g. from `service.yaml`). When omitted, a date-based heuristic
   * is used over the versions discovered while crawling.
   */
  readonly versionOrder?: readonly string[];
  /** Force (or disable) splitting output into `examples/<Interface>.yaml`. */
  readonly splitByInterface?: boolean;
  /** When `splitByInterface` is undefined, auto-split above this interface count. */
  readonly autoSplitThreshold?: number;
}

/** The outcome of a migration run. */
export interface MigrateResult {
  /** The files to write (relative paths + serialized YAML). */
  readonly files: EmittedFile[];
  /** The namespace used (detected or overridden). */
  readonly namespace?: string;
  /** The versions discovered while crawling. */
  readonly versions: string[];
  /** The number of operations migrated. */
  readonly operationCount: number;
  /**
   * Warnings surfaced during migration — currently, example lineages that stop appearing before the
   * service's latest version. The unified format has no removal marker, so such an example is
   * re-materialized for every version from its last appearance onward; the migrator flags it so the
   * author can confirm it still applies (or remove it).
   */
  readonly diagnostics: ExampleDiagnostic[];
}

/**
 * Migrate a tree of versioned Swagger specs with `x-ms-examples` into the unified `examples.yaml`
 * format. Pure aside from reading the input tree (it does not write files).
 */
export async function migrate(root: string, options: MigrateOptions = {}): Promise<MigrateResult> {
  const crawl = await crawlExamples(root);
  const namespace = options.namespace ?? crawl.namespace;

  const compareVersions = options.versionOrder
    ? comparatorFromOrder(options.versionOrder)
    : defaultCompareVersions;
  const baselineVersion = options.versionOrder
    ? options.versionOrder[0]
    : earliestVersion(crawl.versions, compareVersions);

  // When an authoritative version order is supplied (e.g. from `service.yaml`), it is the source of
  // truth: examples found under on-disk versions that are not listed there are ignored, so the
  // generated `since` values always reference a real service version.
  const allowedVersions = options.versionOrder ? new Set(options.versionOrder) : undefined;

  const byOperation = new Map<string, CollectedExample[]>();
  const operationIds = new Map<string, string>();
  for (const crawled of crawl.examples) {
    if (allowedVersions !== undefined && !allowedVersions.has(crawled.version)) continue;
    const operationKey = deriveOperationKey(crawled.operationId);
    operationIds.set(operationKey, crawled.operationId);
    const variant = normalizeApiVersion(
      transformExample(crawled.doc, crawled.paramLocations),
      crawled.version,
    );
    const collected: CollectedExample = {
      version: crawled.version,
      exampleName: crawled.exampleName,
      fileName: crawled.fileName,
      variant,
    };
    const group = byOperation.get(operationKey);
    if (group) group.push(collected);
    else byOperation.set(operationKey, [collected]);
  }

  const entries: OperationEntry[] = [];
  for (const [operationKey, collected] of byOperation) {
    entries.push({
      operationKey,
      variants: buildLineages(collected, {
        operationId: operationIds.get(operationKey)!,
        compareVersions,
        baselineVersion,
      }),
    });
  }

  const files = planFiles(entries, namespace, {
    splitByInterface: options.splitByInterface,
    autoSplitThreshold: options.autoSplitThreshold,
  });

  const versions = options.versionOrder ? [...options.versionOrder] : crawl.versions;
  const diagnostics = collectRemovalDiagnostics(byOperation, versions, compareVersions);
  return { files, namespace, versions, operationCount: entries.length, diagnostics };
}

/**
 * Flag example lineages that stop appearing before the latest version. Because the unified format
 * has no removal marker, such an example would be re-materialized for versions it never shipped in,
 * so the author should confirm it still applies (or drop it).
 */
function collectRemovalDiagnostics(
  byOperation: ReadonlyMap<string, readonly CollectedExample[]>,
  versions: readonly string[],
  compareVersions: (a: string, b: string) => number,
): ExampleDiagnostic[] {
  const latest = latestVersion(versions, compareVersions);
  if (latest === undefined) return [];

  const diagnostics: ExampleDiagnostic[] = [];
  for (const [operationKey, collected] of byOperation) {
    const lastByLineage = new Map<string, string>();
    for (const example of collected) {
      const current = lastByLineage.get(example.exampleName);
      if (current === undefined || compareVersions(example.version, current) > 0) {
        lastByLineage.set(example.exampleName, example.version);
      }
    }
    for (const [lineage, lastSeen] of lastByLineage) {
      if (compareVersions(lastSeen, latest) < 0) {
        diagnostics.push({
          code: "example-removed-before-latest",
          message:
            `Example "${lineage}" for operation "${operationKey}" last appears in "${lastSeen}", ` +
            `before the latest version "${latest}". The unified format has no removal marker, so it ` +
            `will be re-materialized for every version from "${lastSeen}" onward — confirm it still ` +
            `applies to later versions, or remove it.`,
          severity: "warning",
          file: "examples.yaml",
        });
      }
    }
  }
  return diagnostics;
}
