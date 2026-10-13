import type { LoadedExampleFile } from "../loader.js";
import { exampleLineageKey } from "../naming.js";
import { checkExampleIds } from "../rules.js";
import type { ExampleDiagnostic } from "../types.js";
import { substituteApiVersion } from "./materialize.js";
import { selectApplicable } from "./select.js";

/** A single resolved (and materialized) example for a target version. */
export interface ResolvedExample {
  /** The operation key (e.g. `CaCertificates.get`). */
  readonly operation: string;
  /** Stable example identifier shared by all version variants, when provided. */
  readonly id?: string;
  /** Optional display title of the selected variant. */
  readonly title?: string;
  /** @deprecated Use `id` or `getExampleFilename`; retained for existing consumers. */
  readonly legacyFilename?: string;
  readonly request?: unknown;
  readonly responses?: unknown;
}

/** The outcome of resolving a set of example files for a target version. */
export interface ResolveResult {
  readonly apiVersion: string;
  readonly examples: ResolvedExample[];
  readonly diagnostics: ExampleDiagnostic[];
}

/**
 * Resolve the applicable example for every operation/lineage at `apiVersion`, using the linear
 * `order` from `service.yaml`, and materialize the `{api-version}` placeholder. Operations whose
 * lineage has no applicable entry at the target version are omitted.
 */
export function resolveExampleFiles(
  files: readonly LoadedExampleFile[],
  apiVersion: string,
  order: readonly string[],
): ResolveResult {
  const diagnostics: ExampleDiagnostic[] = [];
  const examples: ResolvedExample[] = [];

  if (!order.includes(apiVersion)) {
    diagnostics.push({
      code: "unknown-target-version",
      message: `Target version "${apiVersion}" is not listed in service.yaml (${
        order.length === 0 ? "no versions found" : order.join(", ")
      }).`,
      severity: "error",
      file: "service.yaml",
    });
    return { apiVersion, examples, diagnostics };
  }

  diagnostics.push(...checkExampleIds(files));
  if (diagnostics.length > 0) return { apiVersion, examples, diagnostics };

  for (const file of files) {
    const data = file.data;
    if (data === null || typeof data !== "object" || Array.isArray(data)) continue;

    for (const [operation, value] of Object.entries(data)) {
      if (operation.startsWith("$") || !Array.isArray(value)) continue;

      for (const entries of groupByLineage(value).values()) {
        const selected = selectApplicable(entries, apiVersion, order);
        if (selected === undefined) continue;
        const legacyFilename =
          typeof selected.id === "string"
            ? `${selected.id}.json`
            : typeof selected.legacyFilename === "string"
              ? selected.legacyFilename
              : undefined;
        examples.push({
          operation,
          ...(typeof selected.id === "string" ? { id: selected.id } : {}),
          ...(typeof selected.title === "string" && selected.title !== ""
            ? { title: selected.title }
            : {}),
          ...(legacyFilename === undefined
            ? {}
            : {
                // eslint-disable-next-line @typescript-eslint/no-deprecated -- Keep existing SDK consumers compatible.
                legacyFilename,
              }),
          request: substituteApiVersion(selected.request, apiVersion),
          responses: substituteApiVersion(selected.responses, apiVersion),
        });
      }
    }
  }

  examples.sort(
    (a, b) =>
      a.operation.localeCompare(b.operation) ||
      (a.id ?? a.title ?? "").localeCompare(b.id ?? b.title ?? ""),
  );

  return { apiVersion, examples, diagnostics };
}

interface Variant {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly since?: unknown;
  readonly legacyFilename?: unknown;
  readonly request?: unknown;
  readonly responses?: unknown;
}

/** IDs define modern lineages; title-based grouping remains compatible with existing files. */
function groupByLineage(variants: readonly unknown[]): Map<string, Variant[]> {
  const lineages = new Map<string, Variant[]>();
  for (const variant of variants) {
    if (variant === null || typeof variant !== "object" || Array.isArray(variant)) continue;
    const v = variant as Variant;
    const key = exampleLineageKey(v);
    const group = lineages.get(key);
    if (group) group.push(v);
    else lineages.set(key, [v]);
  }
  return lineages;
}
