import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { join, relative, resolve } from "path";
import pc from "picocolors";
import { coreRepoRoot, repoRoot } from "./helpers.js";

const WorkspaceYamlFile = "pnpm-workspace.yaml";

/** Parses the `catalog:` section from a pnpm-workspace.yaml file. */
function parseCatalog(filePath: string): Record<string, string> {
  let content: string;
  try {
    content = readFileSync(filePath, "utf8");
  } catch {
    return {};
  }

  const catalog: Record<string, string> = {};
  const lines = content.split("\n");
  let inCatalog = false;

  for (const line of lines) {
    if (/^catalog:\s*$/.test(line)) {
      inCatalog = true;
      continue;
    }
    // A non-indented, non-empty, non-comment line ends the catalog section
    if (inCatalog && line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) {
      break;
    }
    if (!inCatalog) continue;

    const match = line.match(/^\s+"?([^":]+)"?\s*:\s*"?([^"]+)"?\s*$/);
    if (match) {
      catalog[match[1].trim()] = match[2].trim();
    }
  }

  return catalog;
}

/** Serializes a catalog object into YAML. */
function serializeCatalog(catalog: Record<string, string>): string {
  const lines = ["catalog:"];
  const sorted = Object.entries(catalog).sort(([a], [b]) => a.localeCompare(b));
  for (const [dep, version] of sorted) {
    const key = dep.startsWith("@") ? `"${dep}"` : dep;
    // Quote versions that start with a digit so YAML doesn't parse them as numbers
    const val = /^\d/.test(version) ? `"${version}"` : version;
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
  const catalogStr = "\n" + serializeCatalog(catalog);
  const after = afterCatalog.length > 0 ? "\n" + afterCatalog.join("\n") : "";

  return before + catalogStr + after;
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
function checkCatalogUsage(coreCatalog: Record<string, string>): { errors: string[]; warnings: string[]; unusedEntries: string[] } {
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
      "  check  - Verify catalog sync with core and enforce catalog: usage (exits non-zero if any issues)",
    );
    console.error("  fix    - Sync catalog from core, align packageManager, and remove unused entries");
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

  // Check packageManager field
  const repoPackageJson = resolve(repoRoot, "package.json");
  const corePackageJson = resolve(coreRepoRoot, "package.json");
  const repoManifest = JSON.parse(readFileSync(repoPackageJson, "utf8"));
  const coreManifest = JSON.parse(readFileSync(corePackageJson, "utf8"));
  const repoPM = repoManifest.packageManager;
  const corePM = coreManifest.packageManager;
  const packageManagerMismatch = repoPM && corePM && repoPM !== corePM;

  if (mismatches.length === 0 && missing.length === 0 && !packageManagerMismatch) {
    console.log(pc.green("✓") + " Catalog is in sync with core.");
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

  const content = readFileSync(repoWorkspaceYaml, "utf8");
  const updated = replaceCatalogSection(content, updatedCatalog);
  writeFileSync(repoWorkspaceYaml, updated);

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
    console.log(`\n${pc.green("✓")} Removed ${pc.yellow(String(unusedEntries.length))} unused catalog entries.`);
  } else if (mode === "check" && unusedEntries.length > 0) {
    console.log(`\nRun with ${pc.cyan("fix")} to remove unused entries.`);
  }

  if (errors.length === 0 && unusedEntries.length === 0) {
    console.log(pc.green("✓") + " All dependencies are using catalog: or workspace: protocols.");
  }
}

main();
