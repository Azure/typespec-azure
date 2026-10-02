/**
 * `tsp-examples add`: add examples for a newly-introduced API version. For each operation in the
 * target version's Swagger, the operation's contract is diffed against the previous version and an
 * example is only added when something changed — a brand-new operation gets a schema-shaped skeleton,
 * and a changed operation gets a `since: <target>` variant cloned from its previous example (parity
 * with how oad detects a contract change). Unchanged operations are left untouched: their existing
 * lineage already resolves forward.
 */

import { readFile } from "fs/promises";
import { join, relative, sep } from "path";
import { discoverExampleFiles } from "../discover.js";
import { loadExampleFile, parseServiceVersions } from "../loader.js";
import { serializeExamplesYaml } from "../migrate/emit.js";
import { deriveOperationKey, interfaceOf } from "../migrate/operation-key.js";
import { discoverSwaggerFiles, namespaceFromPaths, versionFromPath } from "../migrate/swagger.js";
import { selectApplicable } from "../resolve/select.js";
import type { ExampleDiagnostic } from "../types.js";
import { diffOperation } from "./diff.js";
import {
  createDocLoader,
  extractOperationSignatures,
  type OperationSignature,
} from "./signature.js";
import { skeletonForOperation } from "./skeleton.js";

/** Options controlling an `add` run. */
export interface AddOptions {
  /** Target API version. When omitted, the newest version in `service.yaml` is used. */
  readonly apiVersion?: string;
  /** Override the `$namespace` written into any newly created example file. */
  readonly namespace?: string;
}

/** A single example entry that `add` created. */
export interface AddedExample {
  readonly operationKey: string;
  /** Why the example was added. */
  readonly kind: "new-operation" | "changed";
  /** Whether it was cloned from a previous example (vs a generated skeleton). */
  readonly cloned: boolean;
  /** The example file the entry was written to. */
  readonly file: string;
  /** Human-readable detail (diff reasons, or "new operation"). */
  readonly detail: string;
}

/** The outcome of an `add` run. */
export interface AddResult {
  readonly targetVersion: string;
  readonly previousVersion?: string;
  /** Example files whose content changed, ready to write. */
  readonly files: { path: string; content: string }[];
  readonly added: AddedExample[];
  readonly diagnostics: ExampleDiagnostic[];
}

type AnyRecord = Record<string, any>;

interface Variant {
  title?: string;
  since?: string;
  request?: unknown;
  responses?: unknown;
  [key: string]: unknown;
}

/**
 * Add examples for a new API version. Pure aside from reading the spec tree (it does not write
 * files): the caller decides whether to persist {@link AddResult.files}.
 */
export async function add(root: string, options: AddOptions = {}): Promise<AddResult> {
  const diagnostics: ExampleDiagnostic[] = [];

  const order = await readVersionOrder(root);
  if (order === undefined || order.length === 0) {
    diagnostics.push({
      code: "missing-service-yaml",
      message: "No readable service.yaml version list; cannot determine the target version.",
      severity: "error",
      file: "service.yaml",
    });
    return { targetVersion: "", files: [], added: [], diagnostics };
  }

  const targetVersion = options.apiVersion ?? order[order.length - 1];
  if (!order.includes(targetVersion)) {
    diagnostics.push({
      code: "unknown-target-version",
      message: `Target version "${targetVersion}" is not listed in service.yaml (${order.join(", ")}).`,
      severity: "error",
      file: "service.yaml",
    });
    return { targetVersion, files: [], added: [], diagnostics };
  }
  const targetIndex = order.indexOf(targetVersion);
  const previousVersion = targetIndex > 0 ? order[targetIndex - 1] : undefined;
  const baselineVersion = order[0];

  const { signaturesByVersion, namespace: detectedNamespace } = await crawlSignatures(root);
  const targetSignatures = signaturesByVersion.get(targetVersion) ?? new Map();
  const previousSignatures = previousVersion
    ? (signaturesByVersion.get(previousVersion) ?? new Map())
    : new Map<string, OperationSignature>();

  if (targetSignatures.size === 0) {
    diagnostics.push({
      code: "no-target-swagger",
      message: `No Swagger operations found for target version "${targetVersion}".`,
      severity: "error",
      file: "service.yaml",
    });
    return { targetVersion, previousVersion, files: [], added: [], diagnostics };
  }

  const { store, parseErrors } = await loadExampleStore(
    root,
    options.namespace ?? detectedNamespace,
  );
  if (parseErrors.length > 0) {
    // Abort before touching anything: a malformed existing file must never be overwritten.
    return {
      targetVersion,
      previousVersion,
      files: [],
      added: [],
      diagnostics: [...diagnostics, ...parseErrors],
    };
  }
  const added: AddedExample[] = [];

  for (const [operationId, targetSignature] of sortedByKey(targetSignatures)) {
    const operationKey = deriveOperationKey(operationId);
    const existing = store.lineages.get(operationKey);
    const previousSignature = previousSignatures.get(operationId);
    const isNew = previousSignature === undefined;

    if (isNew) {
      // Skip if this operation already has an example that applies at the target (a `since: target`
      // entry, or a base entry when the target is the first version) — keeps `add` idempotent.
      if (
        existing !== undefined &&
        selectApplicable(existing.entries, targetVersion, order) !== undefined
      )
        continue;
      const skeleton = buildSkeletonVariant(targetSignature, targetVersion, baselineVersion);
      const file = store.append(operationKey, skeleton);
      added.push({
        operationKey,
        kind: "new-operation",
        cloned: false,
        file,
        detail: "new operation",
      });
      continue;
    }

    const diff = diffOperation(previousSignature, targetSignature);
    if (!diff.changed) {
      if (
        existing === undefined ||
        selectApplicable(existing.entries, targetVersion, order) === undefined
      ) {
        diagnostics.push({
          code: "missing-example",
          message: `Operation "${operationKey}" has no example applicable at "${targetVersion}" (unchanged since the previous version; add one manually if needed).`,
          severity: "warning",
          file: existing?.file ?? "examples.yaml",
        });
      }
      continue;
    }

    // Changed: add a `since: target` variant to each existing lineage, cloned from its previous
    // applicable entry so the author only edits the delta.
    const lineages = groupByLineage(existing?.entries ?? []);
    if (lineages.size === 0) {
      const skeleton = buildSkeletonVariant(targetSignature, targetVersion, baselineVersion, true);
      const file = store.append(operationKey, skeleton);
      added.push({
        operationKey,
        kind: "changed",
        cloned: false,
        file,
        detail: `${diff.reasons.join("; ")} (no prior example to clone)`,
      });
      continue;
    }

    for (const [title, entries] of lineages) {
      if (hasEntrySince(entries, targetVersion)) continue;
      const source =
        selectApplicable(entries, previousVersion!, order) ?? entries[entries.length - 1];
      const clone = cloneVariant(source, title, targetVersion);
      const file = store.append(operationKey, clone);
      added.push({
        operationKey,
        kind: "changed",
        cloned: true,
        file,
        detail: diff.reasons.join("; "),
      });
    }
  }

  return {
    targetVersion,
    previousVersion,
    files: store.serializeModified(),
    added,
    diagnostics,
  };
}

async function readVersionOrder(root: string): Promise<string[] | undefined> {
  try {
    return parseServiceVersions(await readFile(join(root, "service.yaml"), "utf-8")).versions;
  } catch {
    return undefined;
  }
}

async function crawlSignatures(root: string): Promise<{
  signaturesByVersion: Map<string, Map<string, OperationSignature>>;
  namespace?: string;
}> {
  const files = await discoverSwaggerFiles(root);
  const signaturesByVersion = new Map<string, Map<string, OperationSignature>>();
  const readDoc = createDocLoader();
  let namespace: string | undefined;

  for (const file of files) {
    const version = versionFromPath(file);
    if (version === undefined) continue;
    let doc: AnyRecord;
    try {
      doc = JSON.parse(await readFile(file, "utf-8"));
    } catch {
      continue;
    }
    if (doc.paths === undefined) continue;
    namespace ??= namespaceFromPaths(Object.keys(doc.paths));

    const merged = signaturesByVersion.get(version) ?? new Map<string, OperationSignature>();
    for (const [id, signature] of await extractOperationSignatures(doc, { docPath: file, readDoc }))
      merged.set(id, signature);
    signaturesByVersion.set(version, merged);
  }

  return { signaturesByVersion, namespace };
}

/** In-memory view of a service's example files, supporting appends and re-serialization. */
interface ExampleStore {
  readonly lineages: Map<string, { file: string; entries: Variant[] }>;
  /** Append a variant to an operation, returning the file it was written to. */
  append(operationKey: string, variant: Variant): string;
  /** Serialize only the files that were modified. */
  serializeModified(): { path: string; content: string }[];
}

async function loadExampleStore(
  root: string,
  namespace: string | undefined,
): Promise<{ store: ExampleStore; parseErrors: ExampleDiagnostic[] }> {
  const paths = await discoverExampleFiles(root);
  const fileData = new Map<string, AnyRecord>();
  const lineages = new Map<string, { file: string; entries: Variant[] }>();
  const modified = new Set<string>();
  const parseErrors: ExampleDiagnostic[] = [];
  let split = false;

  for (const absPath of paths) {
    const relative = toRelative(root, absPath);
    if (relative.startsWith("examples/")) split = true;
    const file = loadExampleFile(relative, await readFile(absPath, "utf-8"));
    // Never treat a file that fails to parse as empty — appending to `{}` and re-serializing would erase
    // the whole file. Record the error so the caller can abort before writing anything.
    if (file.parseError !== undefined) {
      parseErrors.push({
        code: "invalid-examples-file",
        message: `Could not parse ${relative}: ${file.parseError}`,
        severity: "error",
        file: relative,
      });
      continue;
    }
    const data = (file.data ?? {}) as AnyRecord;
    fileData.set(relative, data);
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("$") || !Array.isArray(value)) continue;
      lineages.set(key, { file: relative, entries: value as Variant[] });
    }
  }

  const fileFor = (operationKey: string): string => {
    const path = split ? `examples/${interfaceOf(operationKey)}.yaml` : "examples.yaml";
    if (!fileData.has(path)) {
      const data: AnyRecord = {};
      if (namespace !== undefined) data.$namespace = namespace;
      fileData.set(path, data);
    }
    return path;
  };

  const store: ExampleStore = {
    lineages,
    append(operationKey, variant) {
      const target = lineages.get(operationKey);
      const path = target?.file ?? fileFor(operationKey);
      const data = fileData.get(path)!;
      if (!Array.isArray(data[operationKey])) data[operationKey] = [];
      (data[operationKey] as Variant[]).push(variant);
      if (target === undefined)
        lineages.set(operationKey, { file: path, entries: data[operationKey] });
      modified.add(path);
      return path;
    },
    serializeModified() {
      return [...modified]
        .sort()
        .map((path) => ({ path, content: serializeExamplesYaml(fileData.get(path)!) }));
    },
  };

  return { store, parseErrors };
}

function groupByLineage(entries: readonly Variant[]): Map<string, Variant[]> {
  const byTitle = new Map<string, Variant[]>();
  for (const entry of entries) {
    const title = typeof entry.title === "string" ? entry.title : "";
    const group = byTitle.get(title);
    if (group) group.push(entry);
    else byTitle.set(title, [entry]);
  }
  return byTitle;
}

function hasEntrySince(entries: readonly Variant[] | undefined, version: string): boolean {
  return entries?.some((entry) => entry.since === version) ?? false;
}

/** Clone an existing entry into a new `since: target` variant, keeping the lineage title. */
function cloneVariant(source: Variant, title: string, targetVersion: string): Variant {
  const variant: Variant = {};
  if (title !== "") variant.title = title;
  variant.since = targetVersion;
  // Preserve identifying metadata so the new version keeps the same legacy file name (and any
  // author description), otherwise resolving the new version would derive a different filename and
  // break the round-trip.
  if (typeof source.legacyFilename === "string") variant.legacyFilename = source.legacyFilename;
  if (source.description !== undefined) variant.description = source.description;
  variant.request = structuredClone(source.request ?? {});
  variant.responses = structuredClone(source.responses ?? {});
  return variant;
}

function buildSkeletonVariant(
  signature: OperationSignature,
  targetVersion: string,
  baselineVersion: string,
  forceSince = false,
): Variant {
  const skeleton = skeletonForOperation(signature);
  const variant: Variant = {};
  if (forceSince || targetVersion !== baselineVersion) variant.since = targetVersion;
  variant.request = skeleton.request;
  variant.responses = skeleton.responses;
  return variant;
}

function sortedByKey(signatures: Map<string, OperationSignature>): [string, OperationSignature][] {
  return [...signatures.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function toRelative(root: string, absolute: string): string {
  // `path.relative` handles platform separators; normalize to `/` so downstream checks
  // (e.g. `startsWith("examples/")`) and emitted paths are consistent across OSes.
  return relative(root, absolute).split(sep).join("/");
}
