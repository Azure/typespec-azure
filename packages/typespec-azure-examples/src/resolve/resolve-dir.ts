import { readFile } from "fs/promises";
import { join, relative } from "path";
import { discoverExampleFiles } from "../discover.js";
import { loadExampleFile, parseServiceVersions } from "../loader.js";
import { resolveExampleFiles, type ResolveResult } from "./resolve.js";

/** Result of resolving a service directory for a target version. */
export interface ResolveDirResult extends ResolveResult {
  /** The example files that were discovered. */
  readonly files: string[];
  /** The version order read from `service.yaml`. */
  readonly order: string[];
}

/**
 * Resolve a service directory for `apiVersion`: read the version order from `service.yaml`, discover
 * `examples.yaml` / `examples/*.yaml`, and resolve + materialize the applicable examples.
 */
export async function resolveExamplesDir(
  dir: string,
  apiVersion: string,
): Promise<ResolveDirResult> {
  let order: string[] = [];
  try {
    order = parseServiceVersions(await readFile(join(dir, "service.yaml"), "utf-8")).versions;
  } catch {
    order = [];
  }

  const filePaths = await discoverExampleFiles(dir);
  const files = await Promise.all(
    filePaths.map(async (path) =>
      loadExampleFile(relative(dir, path), await readFile(path, "utf-8")),
    ),
  );

  const result = resolveExampleFiles(files, apiVersion, order);
  return { ...result, order, files: filePaths.map((path) => relative(dir, path)) };
}
