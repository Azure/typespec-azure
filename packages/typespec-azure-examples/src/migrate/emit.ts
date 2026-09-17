import { Document, isPair, isScalar, Scalar, visit } from "yaml";
import type { MigratedVariant } from "./model.js";
import { interfaceOf } from "./operation-key.js";

/** A single emitted file: a repo-relative path and its serialized YAML content. */
export interface EmittedFile {
  readonly path: string;
  readonly content: string;
}

/** One operation's key and its collapsed variants. */
export interface OperationEntry {
  readonly operationKey: string;
  readonly variants: MigratedVariant[];
}

/**
 * Build the plain object for an `examples.yaml` file: `$namespace` (optional) followed by one
 * key per operation. Operations are emitted in sorted key order for deterministic output.
 */
export function buildExamplesObject(
  entries: readonly OperationEntry[],
  namespace: string | undefined,
): Record<string, unknown> {
  const object: Record<string, unknown> = {};
  if (namespace !== undefined) object.$namespace = namespace;
  for (const entry of [...entries].sort((a, b) => a.operationKey.localeCompare(b.operationKey))) {
    object[entry.operationKey] = entry.variants;
  }
  return object;
}

/** Serialize an examples object to YAML, force-quoting `since` values so they stay strings. */
export function serializeExamplesYaml(object: Record<string, unknown>): string {
  const doc = new Document(object);
  visit(doc, {
    Pair(_, pair, path) {
      if (
        isScalar(pair.key) &&
        pair.key.value === "since" &&
        isScalar(pair.value) &&
        typeof pair.value.value === "string"
      ) {
        pair.value.type = Scalar.QUOTE_DOUBLE;
      }
      // Emit response status codes as bare integer keys (`200:`), matching the RFC idiom.
      // Converting the key to a number makes yaml render it unquoted.
      if (
        isScalar(pair.key) &&
        typeof pair.key.value === "string" &&
        /^\d+$/.test(pair.key.value) &&
        isUnderResponses(path)
      ) {
        pair.key.value = Number(pair.key.value);
      }
    },
  });
  return doc.toString();
}

/** Whether the visited node sits inside a `responses` mapping. */
function isUnderResponses(path: readonly unknown[]): boolean {
  return path.some((node) => isPair(node) && isScalar(node.key) && node.key.value === "responses");
}

/**
 * Plan the output files. When `splitByInterface` is set (or the interface count exceeds
 * `autoSplitThreshold`), each interface goes to `examples/<Interface>.yaml`; otherwise everything
 * goes to a single top-level `examples.yaml`. Every file repeats `$namespace`.
 */
export function planFiles(
  entries: readonly OperationEntry[],
  namespace: string | undefined,
  options: { splitByInterface?: boolean; autoSplitThreshold?: number } = {},
): EmittedFile[] {
  const interfaces = new Set(entries.map((e) => interfaceOf(e.operationKey)));
  const shouldSplit =
    options.splitByInterface === true ||
    (options.splitByInterface !== false &&
      options.autoSplitThreshold !== undefined &&
      interfaces.size > options.autoSplitThreshold);

  if (!shouldSplit) {
    return [
      {
        path: "examples.yaml",
        content: serializeExamplesYaml(buildExamplesObject(entries, namespace)),
      },
    ];
  }

  const byInterface = new Map<string, OperationEntry[]>();
  for (const entry of entries) {
    const iface = interfaceOf(entry.operationKey);
    const group = byInterface.get(iface);
    if (group) group.push(entry);
    else byInterface.set(iface, [entry]);
  }

  return [...byInterface.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([iface, group]) => ({
      path: `examples/${iface}.yaml`,
      content: serializeExamplesYaml(buildExamplesObject(group, namespace)),
    }));
}
