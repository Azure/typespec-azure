import {
  loadExampleFile,
  resolveExampleFiles,
  validateExampleFiles,
  type LoadedExampleFile,
  type ResolvedExample,
} from "@azure-tools/typespec-azure-examples";
import {
  createDiagnosticCollector,
  getNamespaceFullName,
  getRelativePathFromDirectory,
  joinPaths,
  NoTarget,
  type Diagnostic,
  type Namespace,
  type Program,
  type SourceFile,
} from "@typespec/compiler";
import { getVersions } from "@typespec/versioning";
import type { TCGCContext } from "./interfaces.js";
import { createDiagnostic } from "./lib.js";

export interface UnifiedExample {
  readonly example: ResolvedExample;
  readonly relativePath: string;
}

export interface UnifiedExamples {
  readonly apiVersion: string;
  readonly byOperation: Map<string, UnifiedExample[]>;
}

async function stat(program: Program, path: string) {
  try {
    return await program.host.stat(path);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

// Discovery uses the compiler host so examples also work in virtual file systems.
async function discoverFiles(program: Program, root: string): Promise<string[]> {
  const files: string[] = [];
  const main = joinPaths(root, "examples.yaml");
  if ((await stat(program, main))?.isFile()) {
    files.push(main);
  }
  const directory = joinPaths(root, "examples");
  if ((await stat(program, directory))?.isDirectory()) {
    for (const entry of await program.host.readDir(directory)) {
      const path = joinPaths(directory, entry);
      if (/\.ya?ml$/.test(entry) && (await stat(program, path))?.isFile()) {
        files.push(path);
      }
    }
  }
  return files.sort();
}

export async function loadUnifiedExamples(
  context: TCGCContext,
  service: Namespace,
): Promise<[UnifiedExamples | undefined, readonly Diagnostic[]]> {
  const diagnostics = createDiagnosticCollector();
  const program = context.program;
  const root =
    context.getPackageVersions().size > 1
      ? joinPaths(program.projectRoot, service.name)
      : program.projectRoot;
  const apiVersion = context.getPackageVersions().get(service)?.at(-1);
  // Match AutoRest: resolve against the complete TypeSpec version order, not just
  // the versions included in this SDK. Empty version selects unversioned base entries.
  const order =
    getVersions(program, service)[1]
      ?.getVersions()
      .map((version) => version.value) ?? [];
  const result: UnifiedExamples = {
    apiVersion: apiVersion ?? "",
    byOperation: new Map(),
  };
  const files: LoadedExampleFile[] = [];
  const sourceFiles = new Map<string, SourceFile>();

  function report(filename: string, error: string, location?: { line?: number; col?: number }) {
    const file = sourceFiles.get(filename);
    const pos = (file?.getLineStarts()[(location?.line ?? 1) - 1] ?? 0) + (location?.col ?? 1) - 1;
    diagnostics.add(
      createDiagnostic({
        code: "example-loading",
        messageId: "default",
        format: { filename, error },
        target: file ? { file, pos, end: pos } : NoTarget,
      }),
    );
  }

  let paths: string[];
  try {
    paths = await discoverFiles(program, root);
  } catch (error) {
    report(root, String(error));
    return diagnostics.wrap(result);
  }
  if (paths.length === 0) {
    return diagnostics.wrap(undefined);
  }
  for (const path of paths) {
    let source: SourceFile;
    try {
      source = await program.host.readFile(path);
    } catch (error) {
      report(path, String(error));
      return diagnostics.wrap(result);
    }
    const relativePath = getRelativePathFromDirectory(program.projectRoot, path, false);
    sourceFiles.set(relativePath, source);
    files.push(loadExampleFile(relativePath, source.text));
  }

  const validation = validateExampleFiles(files, { serviceVersions: order });
  for (const diagnostic of validation) {
    report(diagnostic.file, diagnostic.message, diagnostic);
  }
  if (validation.some((diagnostic) => diagnostic.severity === "error")) {
    return diagnostics.wrap(result);
  }

  for (const file of files) {
    if (file.data === undefined) {
      report(file.path, "Unable to read the YAML example document.");
      return diagnostics.wrap(result);
    }
    const namespace: unknown = file.data?.$namespace;
    if (namespace !== undefined && namespace !== getNamespaceFullName(service)) {
      report(
        file.path,
        `Example namespace "${namespace}" does not match service "${getNamespaceFullName(service)}".`,
      );
      return diagnostics.wrap(result);
    }
    if (apiVersion === undefined && JSON.stringify(file.data).includes("{api-version}")) {
      report(file.path, "The {api-version} placeholder requires a versioned service.");
      return diagnostics.wrap(result);
    }
  }

  const resolved = resolveExampleFiles(files, result.apiVersion, order.length ? order : [""]);
  for (const diagnostic of resolved.diagnostics) {
    report(diagnostic.file, diagnostic.message, diagnostic);
  }
  // Placement validation guarantees that each operation has exactly one source file.
  const sources = new Map<string, string>();
  for (const file of files) {
    for (const operation of Object.keys(file.data)) {
      if (!operation.startsWith("$")) {
        sources.set(operation, file.path);
      }
    }
  }
  for (const example of resolved.examples) {
    const key = example.operation;
    const entries = result.byOperation.get(key) ?? [];
    entries.push({ example, relativePath: sources.get(example.operation)! });
    result.byOperation.set(key, entries);
  }
  return diagnostics.wrap(result);
}
