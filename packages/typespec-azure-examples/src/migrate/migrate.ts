import { buildLineages, type CollectedExample } from "./dedup.js";
import { planFiles, type EmittedFile, type OperationEntry } from "./emit.js";
import { normalizeApiVersions } from "./normalize.js";
import { deriveOperationKey } from "./operation-key.js";
import { crawlExamples } from "./swagger.js";
import { transformExample } from "./transform.js";
import { comparatorFromOrder, defaultCompareVersions, earliestVersion } from "./version-order.js";

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

  const byOperation = new Map<string, CollectedExample[]>();
  for (const crawled of crawl.examples) {
    const operationKey = deriveOperationKey(crawled.operationId);
    const variant = normalizeApiVersions(
      transformExample(crawled.doc, crawled.paramLocations),
      crawl.versions,
    );
    const collected: CollectedExample = {
      version: crawled.version,
      exampleName: crawled.exampleName,
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
      variants: buildLineages(collected, { compareVersions, baselineVersion }),
    });
  }

  const files = planFiles(entries, namespace, {
    splitByInterface: options.splitByInterface,
    autoSplitThreshold: options.autoSplitThreshold,
  });

  return { files, namespace, versions: crawl.versions, operationCount: entries.length };
}
