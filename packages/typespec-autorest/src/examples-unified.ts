import {
  defaultLegacyExampleFilename,
  deriveOperationKey,
  loadExampleFile,
  resolveExampleFiles,
  stripJsonExtension,
  type ExampleDiagnostic,
  type LoadedExampleFile,
  type ResolvedExample,
} from "@azure-tools/typespec-azure-examples";
import {
  getRelativePathFromDirectory,
  joinPaths,
  normalizePath,
  type Program,
} from "@typespec/compiler";

/** The outcome of loading a service's unified examples for a single target API version. */
export interface UnifiedExamplesResult {
  /** Resolved examples grouped by unified operation key (e.g. `CaCertificates.get`). */
  readonly byOperationKey: Map<string, ResolvedExample[]>;
  /** Diagnostics produced while resolving. */
  readonly diagnostics: readonly ExampleDiagnostic[];
}

async function isFile(program: Program, path: string): Promise<boolean> {
  try {
    return (await program.host.stat(path)).isFile();
  } catch {
    return false;
  }
}

async function isDirectory(program: Program, path: string): Promise<boolean> {
  try {
    return (await program.host.stat(path)).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Discover the unified example files under `baseDir`: a top-level `examples.yaml` and/or
 * per-interface files under `examples/` (`examples/<Interface>.yaml`).
 */
export async function discoverUnifiedExampleFiles(
  program: Program,
  baseDir: string,
): Promise<string[]> {
  const found: string[] = [];

  const topLevel = joinPaths(baseDir, "examples.yaml");
  if (await isFile(program, topLevel)) {
    found.push(topLevel);
  }

  const examplesDir = joinPaths(baseDir, "examples");
  if (await isDirectory(program, examplesDir)) {
    for (const entry of await program.host.readDir(examplesDir)) {
      if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
        found.push(joinPaths(examplesDir, entry));
      }
    }
  }

  return found.map(normalizePath).sort();
}

/** Returns true if the service directory contains any unified example files. */
export async function hasUnifiedExamples(program: Program, baseDir: string): Promise<boolean> {
  return (await discoverUnifiedExampleFiles(program, baseDir)).length > 0;
}

/**
 * Load and resolve the unified examples in `baseDir` for `apiVersion`, using `versionOrder` (the
 * service's linear list of API versions) to select the applicable variant of each operation.
 */
export async function loadUnifiedExamples(
  program: Program,
  baseDir: string,
  apiVersion: string,
  versionOrder: readonly string[],
): Promise<UnifiedExamplesResult> {
  const filePaths = await discoverUnifiedExampleFiles(program, baseDir);
  const files: LoadedExampleFile[] = [];
  for (const path of filePaths) {
    const file = await program.host.readFile(path);
    files.push(loadExampleFile(getRelativePathFromDirectory(baseDir, path, false), file.text));
  }

  const resolved = resolveExampleFiles(files, apiVersion, [...versionOrder]);
  const byOperationKey = new Map<string, ResolvedExample[]>();
  for (const example of resolved.examples) {
    const list = byOperationKey.get(example.operation);
    if (list) {
      list.push(example);
    } else {
      byOperationKey.set(example.operation, [example]);
    }
  }

  return { byOperationKey, diagnostics: resolved.diagnostics };
}

/** Map a Swagger `operationId` (`Interface_Method`) to its unified operation key. */
export function operationKeyForId(operationId: string): string {
  return deriveOperationKey(operationId);
}

/**
 * Build a deterministic, unique file name for a materialized example. When `preferredName` is
 * provided (the original legacy file name preserved during migration) it is used as the base so the
 * emitted file keeps its original name; otherwise the conventional `<OperationId>[_<Title>].json`
 * name is used. The result is disambiguated against `used`.
 */
export function legacyExampleFileName(
  operationId: string,
  title: string | undefined,
  used: Set<string>,
  preferredName?: string,
): string {
  const base = stripJsonExtension(
    preferredName ?? defaultLegacyExampleFilename(operationId, title),
  );
  let name = base;
  let index = 2;
  while (used.has(name)) {
    name = `${base}_${index++}`;
  }
  used.add(name);
  return `${name}.json`;
}

/**
 * Disambiguate an `x-ms-examples` key against the keys already used for the same operation. Two
 * variants of one operation can derive the same title (e.g. an untitled lineage whose default key
 * is the `operationId` next to a lineage explicitly titled the same), which would otherwise silently
 * overwrite each other in the `x-ms-examples` map. Mirrors {@link legacyExampleFileName}.
 */
export function uniqueExampleKey(title: string, used: Set<string>): string {
  let name = title;
  let index = 2;
  while (used.has(name)) {
    name = `${title}_${index++}`;
  }
  used.add(name);
  return name;
}
