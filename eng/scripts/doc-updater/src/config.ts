/**
 * Configuration types and loader for the doc-updater system.
 *
 * Each package that wants automated doc updates defines a DocUpdateConfig
 * with metadata and a reference to a SKILL.md file that contains
 * the actual agent instructions.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Configuration for a single package's documentation update.
 */
export interface DocUpdateConfig {
  /** Unique identifier (e.g. "tcgc", "azure-core", "autorest") */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Brief description of what this config covers */
  description: string;

  /**
   * Path to the SKILL.md file containing agent instructions,
   * relative to the repository root.
   * Example: ".github/skills/doc-update-tcgc/SKILL.md"
   */
  skillPath: string;

  /** Source code paths to analyze for cross-referencing */
  sourceCodePaths: string[];

  /** Shell commands to run for validation after changes */
  validationCommands: string[];

  /** Named focus areas that can be selected at dispatch time */
  focusAreas: Record<string, string>;
}

/**
 * Load a doc-update config by name from the registry.
 */
export async function loadConfig(name: string): Promise<DocUpdateConfig> {
  const { configs } = await import("./configs/index.js");
  const config = configs[name];
  if (!config) {
    const available = Object.keys(configs).join(", ");
    throw new Error(
      `Unknown doc-update config "${name}". Available configs: ${available}`,
    );
  }
  return config;
}

/**
 * List all available config names.
 */
export async function listConfigs(): Promise<string[]> {
  const { configs } = await import("./configs/index.js");
  return Object.keys(configs);
}

/**
 * Load the SKILL.md file for a config and return its body
 * (stripping the YAML frontmatter).
 *
 * @param config - The doc-update config
 * @param repoRoot - Absolute path to the repository root
 */
export async function loadSkillContent(
  config: DocUpdateConfig,
  repoRoot: string,
): Promise<string> {
  const fullPath = resolve(repoRoot, config.skillPath);
  const raw = await readFile(fullPath, "utf-8");

  // Strip YAML frontmatter (--- ... ---), handling both \n and \r\n
  const frontmatterMatch = raw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  return frontmatterMatch ? raw.slice(frontmatterMatch[0].length).trim() : raw.trim();
}
