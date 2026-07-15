import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";
import { loadExampleFile, parseServiceVersions, type LoadedExampleFile } from "./loader.js";
import type { ExampleDiagnostic } from "./types.js";
import { validateExampleFiles } from "./validate.js";

/** Result of validating an examples directory. */
export interface ValidateDirResult {
  /** All diagnostics produced (errors and warnings). */
  readonly diagnostics: ExampleDiagnostic[];
  /** The example files that were discovered and validated. */
  readonly files: string[];
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover the example files under `dir`: a top-level `examples.yaml` and/or per-interface
 * files under `examples/` (`examples/<Interface>.yaml`).
 */
export async function discoverExampleFiles(dir: string): Promise<string[]> {
  const found: string[] = [];

  const topLevel = join(dir, "examples.yaml");
  if (await exists(topLevel)) found.push(topLevel);

  const examplesDir = join(dir, "examples");
  if ((await exists(examplesDir)) && (await stat(examplesDir)).isDirectory()) {
    for (const entry of await readdir(examplesDir)) {
      if (entry.endsWith(".yaml") || entry.endsWith(".yml")) {
        found.push(join(examplesDir, entry));
      }
    }
  }

  return found.sort();
}

/**
 * Validate all example files in a service directory. Discovers `examples.yaml` /
 * `examples/*.yaml` and the adjacent `service.yaml` (for the `since ∈ service.yaml` check),
 * then runs {@link validateExampleFiles}. Paths in diagnostics are relative to `dir`.
 */
export async function validateExamplesDir(dir: string): Promise<ValidateDirResult> {
  const filePaths = await discoverExampleFiles(dir);
  const files: LoadedExampleFile[] = [];
  for (const path of filePaths) {
    const content = await readFile(path, "utf-8");
    files.push(loadExampleFile(relative(dir, path), content));
  }

  const diagnostics: ExampleDiagnostic[] = [];
  let serviceVersions: string[] | undefined;
  const serviceYamlPath = join(dir, "service.yaml");
  if (await exists(serviceYamlPath)) {
    serviceVersions = parseServiceVersions(await readFile(serviceYamlPath, "utf-8")).versions;
  } else if (files.length > 0) {
    diagnostics.push({
      code: "missing-service-yaml",
      message:
        "No service.yaml found next to the examples; skipping the 'since' version-membership check.",
      severity: "warning",
      file: relative(dir, serviceYamlPath),
    });
  }

  diagnostics.push(...validateExampleFiles(files, { serviceVersions }));

  return { diagnostics, files: filePaths.map((path) => relative(dir, path)) };
}
