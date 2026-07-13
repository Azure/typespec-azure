import { load } from "js-yaml";
import { minimatch } from "minimatch";
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The git path that changes when the `core` submodule pointer moves. */
const SUBMODULE_PATH = "core";

/**
 * @typedef {Object} Target
 * @property {string} [self]
 * @property {string[]} [use]
 * @property {string[]} [extra]
 * @property {string[]} [ignore]
 * @property {boolean} [coreSubmodule]
 *
 * @typedef {Object} Config
 * @property {{ ignore?: string[] }} [defaults]
 * @property {Record<string, string[]>} [groups]
 * @property {Record<string, Target>} targets
 */

/**
 * Resolve a target's effective trigger + ignore globs.
 * @param {Config} config
 * @param {string} name
 * @returns {{ triggers: string[], ignore: string[], coreSubmodule: boolean }}
 */
export function resolveTarget(config, name) {
  const target = config.targets[name];
  const groups = config.groups ?? {};
  const triggers = [];
  if (target.self) triggers.push(target.self);
  for (const groupName of target.use ?? []) {
    const globs = groups[groupName];
    if (!globs) {
      throw new Error(`Target "${name}" references unknown group "${groupName}"`);
    }
    triggers.push(...globs);
  }
  triggers.push(...(target.extra ?? []));
  const ignore = target.ignore ?? config.defaults?.ignore ?? [];
  return { triggers, ignore, coreSubmodule: target.coreSubmodule === true };
}

/**
 * Compute which targets are affected by a set of changed files.
 * @param {string[]} changedFiles
 * @param {Config} config
 * @returns {Record<string, boolean>}
 */
export function computeAffected(changedFiles, config) {
  const submoduleChanged = changedFiles.includes(SUBMODULE_PATH);
  /** @type {Record<string, boolean>} */
  const result = {};
  for (const name of Object.keys(config.targets)) {
    const { triggers, ignore, coreSubmodule } = resolveTarget(config, name);
    let affected = coreSubmodule && submoduleChanged;
    if (!affected) {
      affected = changedFiles.some(
        (file) =>
          triggers.some((glob) => minimatch(file, glob, { dot: true })) &&
          !ignore.some((glob) => minimatch(file, glob, { dot: true })),
      );
    }
    result[name] = affected;
  }
  return result;
}

/**
 * @param {string} path
 * @returns {Config}
 */
export function loadConfig(path) {
  return /** @type {Config} */ (load(readFileSync(path, "utf8")));
}

/**
 * @param {string} base
 * @param {string} head
 * @returns {string[]}
 */
function getChangedFiles(base, head) {
  const out = execFileSync("git", ["diff", "--name-only", base, head], {
    encoding: "utf8",
  });
  return out
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

// CLI entry: run only when executed directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || "HEAD";
  if (!base) {
    console.error("ERROR: BASE_SHA env var is required");
    process.exit(1);
  }
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const configPath = join(scriptDir, "..", "ci", "downstream-deps.yml");
  const config = loadConfig(configPath);
  const changedFiles = getChangedFiles(base, head);
  const affected = computeAffected(changedFiles, config);

  console.log(`Base: ${base}`);
  console.log(`Head: ${head}`);
  console.log(`Changed files (${changedFiles.length}):`);
  for (const f of changedFiles) console.log(`  ${f}`);
  console.log("Affected targets:", JSON.stringify(affected));

  const outPath = process.env.GITHUB_OUTPUT;
  if (outPath) {
    const lines =
      Object.entries(affected)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n") + "\n";
    appendFileSync(outPath, lines);
  }
}
