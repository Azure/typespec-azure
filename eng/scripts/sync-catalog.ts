import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import pc from "picocolors";
import { repoRoot, coreRepoRoot } from "./helpers.js";

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

function main() {
  const mode = process.argv[2];

  if (mode !== "check" && mode !== "sync") {
    console.error("Usage: sync-catalog <check|sync>");
    console.error("  check  - Report mismatches between core and this repo's catalog (exits non-zero if any)");
    console.error("  sync   - Update this repo's catalog with versions from core");
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

  if (mismatches.length === 0 && missing.length === 0) {
    console.log(pc.green("✓") + " Catalog is in sync with core.");
    process.exit(0);
  }

  if (mismatches.length > 0) {
    console.log(
      `Found ${pc.yellow(String(mismatches.length))} version mismatch(es) with core:\n`,
    );
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
    console.log(`\nRun with ${pc.cyan("sync")} to apply these changes.`);
    process.exit(1);
  }

  // Sync mode: apply changes
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

  console.log(`\n${pc.green("✓")} Updated ${repoWorkspaceYaml}`);
}

main();
