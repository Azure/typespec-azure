/**
 * Configuration types and loader for the doc-updater system.
 *
 * Each package that wants automated doc updates provides a YAML config
 * file in the `configs/` directory alongside this package, and a
 * matching set of prompt files in `prompts/<name>/`.
 */

import { load as parseYaml } from "js-yaml";
import { readdir, readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

/**
 * Configuration for a single package's documentation update.
 */
export interface DocUpdateConfig {
  /** Unique identifier (e.g. "tcgc", "azure-core", "autorest") */
  name: string;

  /** Human-readable display name */
  displayName: string;

  /** Brief description of what the package does — used by the knowledge builder */
  description: string;

  /** Source code paths to analyze for cross-referencing */
  sourceCodePaths: string[];
}

/** Directory containing YAML config files, relative to this source file. */
const CONFIGS_DIR = resolve(import.meta.dirname ?? ".", "../configs");

/**
 * Load a doc-update config by name.
 *
 * Reads `configs/<name>.yaml` and returns the parsed config.
 */
export async function loadConfig(name: string): Promise<DocUpdateConfig> {
  const filePath = resolve(CONFIGS_DIR, `${name}.yaml`);
  let raw: string;
  try {
    raw = await readFile(filePath, "utf-8");
  } catch {
    const available = await listConfigs();
    throw new Error(
      `Unknown doc-update config "${name}". Available configs: ${available.join(", ")}`,
    );
  }
  return parseYaml(raw) as DocUpdateConfig;
}

/**
 * List all available config names (derived from YAML filenames).
 */
export async function listConfigs(): Promise<string[]> {
  const entries = await readdir(CONFIGS_DIR);
  return entries.filter((f) => f.endsWith(".yaml")).map((f) => basename(f, ".yaml"));
}
