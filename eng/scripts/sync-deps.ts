import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, relative, resolve } from "path";
import pc from "picocolors";
import { coreRepoRoot, repoRoot } from "./helpers.js";

const WorkspaceYamlFile = "pnpm-workspace.yaml";

/**
 * Parses a top-level key/value section (e.g. `catalog:` or `overrides:`) from a
 * pnpm-workspace.yaml document, returning a map of entry name to version.
 */
function parseKeyValueSection(content: string, section: string): Record<string, string> {
  const entries: Record<string, string> = {};
  const lines = content.split("\n");
  const header = new RegExp(`^${section}:\\s*$`);
  let inSection = false;

  for (const line of lines) {
    if (header.test(line)) {
      inSection = true;
      continue;
    }
    // A non-indented, non-empty, non-comment line ends the section
    if (inSection && line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) {
      break;
    }
    if (!inSection) continue;
    // Skip comment lines so they aren't parsed as fake entries.
    if (line.trim().startsWith("#")) continue;

    const match = line.match(/^\s+"?([^":]+)"?\s*:\s*"?([^"]+)"?\s*$/);
    if (match) {
      entries[match[1].trim()] = match[2].trim();
    }
  }

  return entries;
}

/** Parses the `catalog:` section from a pnpm-workspace.yaml file. */
function parseCatalog(filePath: string): Record<string, string> {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return {};
  }
  return parseKeyValueSection(content, "catalog");
}

/** Parses the `overrides:` section from a pnpm-workspace.yaml file. */
function parseOverrides(filePath: string): Record<string, string> {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return {};
  }
  return parseKeyValueSection(content, "overrides");
}

/**
 * Parses the comments in the `catalog:` section, associating each comment (or run
 * of consecutive comments) with the dependency entry that immediately follows it.
 * This lets us keep an explanatory comment attached to its entry when the catalog
 * is re-sorted and re-serialized.
 */
function parseCatalogComments(content: string): Record<string, string[]> {
  const comments: Record<string, string[]> = {};
  const lines = content.split("\n");
  let inCatalog = false;
  let pending: string[] = [];

  for (const line of lines) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true;
      continue;
    }
    if (!inCatalog) continue;
    // A non-indented, non-empty, non-comment line ends the catalog section
    if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) break;

    const trimmed = line.trim();
    if (trimmed.startsWith("#")) {
      pending.push(trimmed);
      continue;
    }
    if (trimmed === "") {
      // Blank line breaks the association so comments only attach to an adjacent entry.
      pending = [];
      continue;
    }

    const match = line.match(/^\s+"?([^":]+)"?\s*:/);
    if (match && pending.length > 0) {
      comments[match[1].trim()] = pending;
    }
    pending = [];
  }

  return comments;
}

/**
 * Determines whether a catalog version value must be quoted to be a valid YAML
 * plain scalar. Safe plain scalars are caret/tilde ranges (e.g. `^1.2.3`) or tag
 * names starting with a letter (e.g. `latest`). Anything else — values starting
 * with a digit (parsed as a number) or containing YAML indicator characters such
 * as whitespace, `>`, `<`, `:` or `*` (e.g. `>=0.33.0 <1.0.0`) — must be quoted.
 */
function needsQuoting(version: string): boolean {
  return !/^[\^~]?[A-Za-z0-9][A-Za-z0-9.\-]*$/.test(version) || /^\d/.test(version);
}

/** Serializes a catalog object into YAML, re-emitting any associated comments. */
function serializeCatalog(
  catalog: Record<string, string>,
  comments: Record<string, string[]> = {},
): string {
  const lines = ["catalog:"];
  const sorted = Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b));
  for (const [dep, version] of sorted) {
    for (const comment of comments[dep] ?? []) {
      lines.push(`  ${comment}`);
    }
    const key = dep.startsWith("@") ? `"${dep}"` : dep;
    const val = needsQuoting(version) ? `"${version}"` : version;
    lines.push(`  ${key}: ${val}`);
  }
  return lines.join("\n") + "\n";
}

/** Replaces the catalog section in a pnpm-workspace.yaml file. */
function replaceCatalogSection(content: string, catalog: Record<string, string>): string {
  const lines = content.split("\n");
  const beforeCatalog: string[] = [];
  const afterCatalog: string[] = [];

  let state: "before" | "in" | "after" = "before";
  for (const line of lines) {
    if (state === "before") {
      if (/^catalog:\s*$/.test(line)) {
        state = "in";
      } else {
        beforeCatalog.push(line);
      }
    } else if (state === "in") {
      if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) {
        state = "after";
        afterCatalog.push(line);
      }
    } else {
      afterCatalog.push(line);
    }
  }

  const before = beforeCatalog.join("\n").replace(/\n+$/, "\n");
  const catalogStr = "\n" + serializeCatalog(catalog, parseCatalogComments(content));
  const after = afterCatalog.length > 0 ? "\n" + afterCatalog.join("\n") : "";

  return before + catalogStr + after;
}

/** Serializes an overrides object into YAML, quoting keys/values when required. */
function serializeOverrides(overrides: Record<string, string>): string {
  const lines = ["overrides:"];
  const sorted = Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, version] of sorted) {
    const k = needsQuoting(key) ? `"${key}"` : key;
    const val = needsQuoting(version) ? `"${version}"` : version;
    lines.push(`  ${k}: ${val}`);
  }
  return lines.join("\n") + "\n";
}

/** Replaces the overrides section in a pnpm-workspace.yaml file. */
function replaceOverridesSection(content: string, overrides: Record<string, string>): string {
  const lines = content.split("\n");
  const beforeOverrides: string[] = [];
  const afterOverrides: string[] = [];

  let state: "before" | "in" | "after" = "before";
  for (const line of lines) {
    if (state === "before") {
      if (/^overrides:\s*$/.test(line)) {
        state = "in";
      } else {
        beforeOverrides.push(line);
      }
    } else if (state === "in") {
      if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) {
        state = "after";
        afterOverrides.push(line);
      }
    } else {
      afterOverrides.push(line);
    }
  }

  const before = beforeOverrides.join("\n").replace(/\n+$/, "\n");
  const overridesStr = "\n" + serializeOverrides(overrides);
  const after = afterOverrides.length > 0 ? "\n" + afterOverrides.join("\n") : "";

  return before + overridesStr + after;
}

interface Mismatch {
  dep: string;
  repoVersion: string;
  coreVersion: string;
}

interface Missing {
  dep: string;
  coreVersion: string;
}

const depTypes = ["dependencies", "devDependencies", "peerDependencies"] as const;

/**
 * Dependencies that are allowed to use explicit versions instead of catalog:.
 * Each entry maps a package.json path (relative to repo root) to a set of dependency names.
 */
const exceptions: Record<string, Set<string>> = {};

/**
 * Validates that all workspace package dependencies use `catalog:` or `workspace:` protocols,
 * ensuring versions are centrally managed via the pnpm catalog in pnpm-workspace.yaml.
 */
function checkCatalogUsage(coreCatalog: Record<string, string>): {
  errors: string[];
  warnings: string[];
  unusedEntries: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unusedEntries: string[] = [];

  const catalog = parseCatalog(resolve(repoRoot, WorkspaceYamlFile));

  // Resolve workspace packages from pnpm (only this repo's packages, not core)
  const pnpmOutput = execSync("pnpm ls -r --json --depth -1", {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const workspacePackages: { path: string }[] = JSON.parse(pnpmOutput);
  const packageJsonPaths = workspacePackages
    .map((p) => join(relative(repoRoot, p.path), "package.json"))
    .filter((p) => !p.startsWith("core/"));

  for (const relPath of packageJsonPaths) {
    const fullPath = join(repoRoot, relPath);
    let pkg: any;
    try {
      pkg = JSON.parse(readFileSync(fullPath, "utf8"));
    } catch {
      continue;
    }
    const fileExceptions = exceptions[relPath] ?? new Set();

    for (const depType of depTypes) {
      const deps: Record<string, string> | undefined = pkg[depType];
      if (!deps) continue;

      for (const [name, version] of Object.entries(deps)) {
        if (version === "catalog:" || version.startsWith("workspace:")) {
          continue;
        }
        if (fileExceptions.has(name)) {
          if (catalog[name] && catalog[name] !== version) {
            warnings.push(
              `${relPath}: ${depType}.${name} has version "${version}" but catalog has "${catalog[name]}". Keep them in sync.`,
            );
          }
          continue;
        }
        errors.push(
          `${relPath}: ${depType}.${name} uses explicit version "${version}" instead of "catalog:".`,
        );
      }
    }
  }

  // Check that every catalog entry is actually used somewhere
  const usedCatalogEntries = new Set<string>();
  for (const relPath of packageJsonPaths) {
    const fullPath = join(repoRoot, relPath);
    let pkg: any;
    try {
      pkg = JSON.parse(readFileSync(fullPath, "utf8"));
    } catch {
      continue;
    }
    for (const depType of depTypes) {
      const deps: Record<string, string> | undefined = pkg[depType];
      if (!deps) continue;
      for (const [name, version] of Object.entries(deps)) {
        if (version === "catalog:") {
          usedCatalogEntries.add(name);
        }
      }
    }
  }

  for (const name of Object.keys(catalog)) {
    // Skip entries that come from core's catalog — they're used by core packages
    if (name in coreCatalog) continue;
    if (!usedCatalogEntries.has(name)) {
      unusedEntries.push(name);
      warnings.push(`pnpm-workspace.yaml: catalog entry "${name}" is not used by any package.`);
    }
  }

  return { errors, warnings, unusedEntries };
}

function main() {
  const mode = process.argv[2];

  if (mode !== "check" && mode !== "fix") {
    console.error("Usage: pnpm deps <check|fix>");
    console.error(
      "  check  - Verify catalog & overrides sync with core and enforce catalog: usage (exits non-zero if any issues)",
    );
    console.error(
      "  fix    - Sync catalog & overrides from core, align packageManager, and remove unused entries",
    );
    process.exit(1);
  }

  const repoWorkspaceYaml = resolve(repoRoot, WorkspaceYamlFile);
  const coreWorkspaceYaml = resolve(coreRepoRoot, WorkspaceYamlFile);

  const repoCatalog = parseCatalog(repoWorkspaceYaml);
  const coreCatalog = parseCatalog(coreWorkspaceYaml);

  if (Object.keys(repoCatalog).length === 0) {
    console.error(`No catalog found in ${repoWorkspaceYaml}`);
    process.exit(1);
  }

  if (Object.keys(coreCatalog).length === 0) {
    console.log("No catalog found in core workspace yaml. Nothing to sync.");
    process.exit(0);
  }

  const mismatches: Mismatch[] = [];
  const missing: Missing[] = [];

  for (const [dep, coreVersion] of Object.entries(coreCatalog)) {
    if (dep in repoCatalog) {
      if (repoCatalog[dep] !== coreVersion) {
        mismatches.push({ dep, repoVersion: repoCatalog[dep], coreVersion });
      }
    } else {
      missing.push({ dep, coreVersion });
    }
  }

  // Compare the `overrides:` section so security/pinning overrides from core are
  // carried over into this repo's workspace as well.
  const repoOverrides = parseOverrides(repoWorkspaceYaml);
  const coreOverrides = parseOverrides(coreWorkspaceYaml);

  const overrideMismatches: Mismatch[] = [];
  const overrideMissing: Missing[] = [];

  for (const [dep, coreVersion] of Object.entries(coreOverrides)) {
    if (dep in repoOverrides) {
      if (repoOverrides[dep] !== coreVersion) {
        overrideMismatches.push({ dep, repoVersion: repoOverrides[dep], coreVersion });
      }
    } else {
      overrideMissing.push({ dep, coreVersion });
    }
  }

  const overridesOutOfSync = overrideMismatches.length > 0 || overrideMissing.length > 0;

  // Check packageManager field
  const repoPackageJson = resolve(repoRoot, "package.json");
  const corePackageJson = resolve(coreRepoRoot, "package.json");
  const repoManifest = JSON.parse(readFileSync(repoPackageJson, "utf8"));
  const coreManifest = JSON.parse(readFileSync(corePackageJson, "utf8"));
  const repoPM = repoManifest.packageManager;
  const corePM = coreManifest.packageManager;
  const packageManagerMismatch = repoPM && corePM && repoPM !== corePM;

  if (
    mismatches.length === 0 &&
    missing.length === 0 &&
    !overridesOutOfSync &&
    !packageManagerMismatch
  ) {
    console.log(pc.green("✓") + " Catalog and overrides are in sync with core.");
    checkAndReportCatalogUsage(mode, coreCatalog);
    process.exit(0);
  }

  if (packageManagerMismatch) {
    console.log(`packageManager mismatch:`);
    console.log(`  ${pc.red(repoPM)} → ${pc.green(corePM)}`);
  }

  if (mismatches.length > 0) {
    console.log(`Found ${pc.yellow(String(mismatches.length))} version mismatch(es) with core:\n`);
    for (const { dep, repoVersion, coreVersion } of mismatches) {
      console.log(`  ${pc.cyan(dep)}: ${pc.red(repoVersion)} → ${pc.green(coreVersion)}`);
    }
  }

  if (missing.length > 0) {
    console.log(
      `\nFound ${pc.yellow(String(missing.length))} dep(s) in core catalog missing from this repo:\n`,
    );
    for (const { dep, coreVersion } of missing) {
      console.log(`  ${pc.cyan(dep)}: ${pc.green(coreVersion)}`);
    }
  }

  if (overrideMismatches.length > 0) {
    console.log(
      `\nFound ${pc.yellow(String(overrideMismatches.length))} override mismatch(es) with core:\n`,
    );
    for (const { dep, repoVersion, coreVersion } of overrideMismatches) {
      console.log(`  ${pc.cyan(dep)}: ${pc.red(repoVersion)} → ${pc.green(coreVersion)}`);
    }
  }

  if (overrideMissing.length > 0) {
    console.log(
      `\nFound ${pc.yellow(String(overrideMissing.length))} override(s) in core missing from this repo:\n`,
    );
    for (const { dep, coreVersion } of overrideMissing) {
      console.log(`  ${pc.cyan(dep)}: ${pc.green(coreVersion)}`);
    }
  }

  if (mode === "check") {
    console.log(`\nRun with ${pc.cyan("fix")} to apply these changes.`);
    process.exit(1);
  }

  // Fix mode: apply changes
  const updatedCatalog = { ...repoCatalog };
  for (const { dep, coreVersion } of mismatches) {
    updatedCatalog[dep] = coreVersion;
  }
  for (const { dep, coreVersion } of missing) {
    updatedCatalog[dep] = coreVersion;
  }

  let content = readFileSync(repoWorkspaceYaml, "utf8");
  content = replaceCatalogSection(content, updatedCatalog);

  if (overridesOutOfSync) {
    const updatedOverrides = { ...repoOverrides };
    for (const { dep, coreVersion } of overrideMismatches) {
      updatedOverrides[dep] = coreVersion;
    }
    for (const { dep, coreVersion } of overrideMissing) {
      updatedOverrides[dep] = coreVersion;
    }
    content = replaceOverridesSection(content, updatedOverrides);
  }

  writeFileSync(repoWorkspaceYaml, content);

  if (packageManagerMismatch) {
    repoManifest.packageManager = corePM;
    writeFileSync(repoPackageJson, JSON.stringify(repoManifest, null, 2) + "\n");
    console.log(`\n${pc.green("✓")} Updated packageManager to ${corePM}`);
  }

  console.log(`\n${pc.green("✓")} Updated ${repoWorkspaceYaml}`);

  checkAndReportCatalogUsage(mode, coreCatalog);
}

function checkAndReportCatalogUsage(mode: "check" | "fix", coreCatalog: Record<string, string>) {
  const { errors, warnings, unusedEntries } = checkCatalogUsage(coreCatalog);

  if (unusedEntries.length > 0) {
    console.log(
      `\nFound ${pc.yellow(String(unusedEntries.length))} unused catalog entry(s) not from core:\n`,
    );
    for (const name of unusedEntries) {
      console.log(`  ${pc.cyan(name)}: ${pc.red("unused")}`);
    }
  }

  if (warnings.length > 0) {
    const nonUnusedWarnings = warnings.filter((w) => !w.includes("is not used by any package"));
    if (nonUnusedWarnings.length > 0) {
      console.log(`\n⚠ Warnings (${nonUnusedWarnings.length}):`);
      for (const w of nonUnusedWarnings) {
        console.log(`  ${w}`);
      }
    }
  }

  if (errors.length > 0) {
    console.log(`\n✘ Found ${pc.yellow(String(errors.length))} catalog usage error(s):\n`);
    for (const e of errors) {
      console.log(`  ${pc.red(e)}`);
    }
    console.log(
      `\nAll external dependencies must use ${pc.cyan('"catalog:"')} protocol. Add the version to the catalog in pnpm-workspace.yaml and use "catalog:" in package.json.`,
    );
    process.exit(1);
  }

  if (mode === "fix" && unusedEntries.length > 0) {
    const repoWorkspaceYaml = resolve(repoRoot, WorkspaceYamlFile);
    const repoCatalog = parseCatalog(repoWorkspaceYaml);
    for (const name of unusedEntries) {
      delete repoCatalog[name];
    }
    const content = readFileSync(repoWorkspaceYaml, "utf8");
    const updated = replaceCatalogSection(content, repoCatalog);
    writeFileSync(repoWorkspaceYaml, updated);
    console.log(
      `\n${pc.green("✓")} Removed ${pc.yellow(String(unusedEntries.length))} unused catalog entries.`,
    );
  } else if (mode === "check" && unusedEntries.length > 0) {
    console.log(`\nRun with ${pc.cyan("fix")} to remove unused entries.`);
  }

  if (errors.length === 0 && unusedEntries.length === 0) {
    console.log(pc.green("✓") + " All dependencies are using catalog: or workspace: protocols.");
  }
}

main();
