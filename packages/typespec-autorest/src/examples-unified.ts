import {
  defaultLegacyExampleFilename,
  deriveOperationKey,
  loadExampleFile,
  resolveExampleFiles,
  stripJsonExtension,
  type ExampleDiagnostic,
  type ExampleRequest,
  type LoadedExampleFile,
  type ResolvedExample,
} from "@azure-tools/typespec-azure-examples";
import {
  getRelativePathFromDirectory,
  joinPaths,
  normalizePath,
  type Program,
} from "@typespec/compiler";

/** A legacy `x-ms-examples` document materialized from the unified format. */
export interface LegacyExampleDoc {
  readonly operationId: string;
  readonly title: string;
  readonly parameters: Record<string, unknown>;
  readonly responses: Record<string, unknown>;
}

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
 * Materialize a resolved unified example into a legacy `x-ms-examples` document. The unified
 * `request` buckets (`path`/`query`/`headers`/`body`) are flattened back into the legacy flat
 * `parameters` bag; the implicit `api-version` parameter (dropped in the unified format) is
 * re-added, and the request body is placed under the operation's body parameter name.
 */
export function toLegacyExampleDoc(
  resolved: ResolvedExample,
  options: { operationId: string; apiVersion: string; bodyParameterName?: string },
): LegacyExampleDoc {
  const request = (resolved.request ?? {}) as ExampleRequest;
  const parameters: Record<string, unknown> = { "api-version": options.apiVersion };

  for (const bucket of [request.path, request.query, request.headers]) {
    if (bucket && typeof bucket === "object") {
      Object.assign(parameters, bucket);
    }
  }

  if (request.body !== undefined) {
    parameters[options.bodyParameterName ?? "body"] = request.body;
  }

  const responses =
    resolved.responses && typeof resolved.responses === "object"
      ? (resolved.responses as Record<string, unknown>)
      : {};

  return {
    operationId: options.operationId,
    title:
      resolved.title ??
      (resolved.legacyFilename ? stripJsonExtension(resolved.legacyFilename) : undefined) ??
      options.operationId,
    parameters,
    responses,
  };
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
