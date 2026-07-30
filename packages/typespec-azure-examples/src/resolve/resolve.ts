import type { LoadedExampleFile } from "../loader.js";
import type { ExampleDiagnostic } from "../types.js";
import { substituteApiVersion } from "./materialize.js";
import { selectApplicable } from "./select.js";

/** A single resolved (and materialized) example for a target version. */
export interface ResolvedExample {
  /** The operation key (e.g. `CaCertificates.get`). */
  readonly operation: string;
  /** The lineage title, when the operation has more than one lineage. */
  readonly title?: string;
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

  for (const file of files) {
    const data = file.data;
    if (data === null || typeof data !== "object" || Array.isArray(data)) continue;

    for (const [operation, value] of Object.entries(data)) {
      if (operation.startsWith("$") || !Array.isArray(value)) continue;

      for (const [title, entries] of groupByLineage(value)) {
        const selected = selectApplicable(entries, apiVersion, order);
        if (selected === undefined) continue;
        examples.push({
          operation,
          ...(title === "" ? {} : { title }),
          request: substituteApiVersion(selected.request, apiVersion),
          responses: substituteApiVersion(selected.responses, apiVersion),
        });
      }
    }
  }

  examples.sort(
    (a, b) =>
      a.operation.localeCompare(b.operation) || (a.title ?? "").localeCompare(b.title ?? ""),
  );

  return { apiVersion, examples, diagnostics };
}

interface Variant {
  readonly title?: unknown;
  readonly since?: unknown;
  readonly request?: unknown;
  readonly responses?: unknown;
}

/** Group an operation's variants into lineages keyed by `title` (untitled => the default `""`). */
function groupByLineage(variants: readonly unknown[]): Map<string, Variant[]> {
  const lineages = new Map<string, Variant[]>();
  for (const variant of variants) {
    if (variant === null || typeof variant !== "object" || Array.isArray(variant)) continue;
    const v = variant as Variant;
    const title = typeof v.title === "string" ? v.title : "";
    const group = lineages.get(title);
    if (group) group.push(v);
    else lineages.set(title, [v]);
  }
  return lineages;
}
