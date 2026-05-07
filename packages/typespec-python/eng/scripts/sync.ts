/* eslint-disable no-console */
/**
 * Sync eng/scripts from the upstream http-client-python checkout (sibling
 * `core/` repo) into this package's eng/scripts directory.
 *
 * typespec-python is mostly a wrapper around http-client-python, so the build /
 * setup / CI helper scripts under eng/ should be kept identical between the two
 * packages. This script copies the files from <repo-root>/core/packages/
 * http-client-python/eng/scripts/ into this repo so we don't have to maintain
 * duplicate copies by hand. If the core/ checkout isn't present the script
 * exits with an informational message and does nothing.
 *
 * Usage:
 *   tsx eng/scripts/sync.ts          # write mode: overwrite local files
 *   tsx eng/scripts/sync.ts --check  # check mode: exit non-zero on drift (CI)
 */
import fs from "fs";
import { dirname, join, sep } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const here = dirname(fileURLToPath(import.meta.url));
// eng/scripts/sync.ts -> package root is two levels up
const packageRoot = join(here, "..", "..");
const destEngScripts = join(packageRoot, "eng", "scripts");

// Source lives in the sibling `core/` checkout at the repo root:
//   <repo-root>/core/packages/http-client-python/eng/scripts
// packageRoot == <repo-root>/packages/typespec-python, so the repo root is two
// levels up from packageRoot.
const repoRoot = join(packageRoot, "..", "..");
const sourceRoot = join(
  repoRoot,
  "core",
  "packages",
  "http-client-python",
  "eng",
  "scripts",
);

/**
 * Files (relative to eng/scripts, POSIX path) that should be synced from the
 * upstream @typespec/http-client-python package. Anything not listed here is
 * ignored — keeping this an allow-list makes it explicit which files this
 * package is willing to inherit from upstream.
 *
 * To pull in a new upstream file, add it here and run `pnpm sync`.
 */
const INCLUDES: readonly string[] = [
  // Shared CI config
  "ci/config/mypy.ini",
  "ci/config/pylintrc",
  "ci/config/pyrightconfig.json",

  // Shared CI runners (invoked by run-tests.ts via tox)
  "ci/run_apiview.py",
  "ci/run_mypy.py",
  "ci/run_pylint.py",
  "ci/run_pyright.py",
  "ci/run_sphinx_build.py",
  "ci/util.py",

  // Regeneration scripts (the local regenerate.ts is intentionally synced from
  // upstream; regenerate-common.ts is its shared helper module).
  "ci/regenerate.ts",
  "ci/regenerate-common.ts",

  // Shared setup scripts (invoked by package.json install/prepare hooks)
  "setup/install.py",
  "setup/package_manager.py",
  "setup/prepare.py",
  "setup/run_tsp.py",
  "setup/run-python3.ts",
  "setup/system-requirements.ts",
  "setup/venvtools.py",
];

const argv = parseArgs({
  args: process.argv.slice(2),
  options: {
    check: { type: "boolean", short: "c", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (argv.values.help) {
  console.log(`
${pc.bold("Usage:")} tsx eng/scripts/sync.ts [options]

${pc.bold("Description:")}
  Copy the files listed in INCLUDES from
  <repo-root>/core/packages/http-client-python/eng/scripts/ into this package's
  eng/scripts/. Anything not in INCLUDES is left untouched. If the core/
  checkout is not present, the script exits with an informational message and
  does nothing.

${pc.bold("Options:")}
  ${pc.cyan("-c, --check")}   Compare only; exit non-zero on any drift (for CI).
  ${pc.cyan("-h, --help")}    Show this help.
`);
  process.exit(0);
}

const check = argv.values.check ?? false;

function toPosix(p: string): string {
  return p.split(sep).join("/");
}

function readBytes(p: string): Buffer | null {
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

interface SyncStats {
  copied: string[];
  unchanged: string[];
  drifted: string[]; // only populated in --check mode
  missing: string[]; // listed in INCLUDES but not present in the source package
}

function syncFile(srcAbs: string, destAbs: string, relPath: string, stats: SyncStats): void {
  const srcBuf = fs.readFileSync(srcAbs);
  const destBuf = readBytes(destAbs);

  if (destBuf && destBuf.equals(srcBuf)) {
    stats.unchanged.push(relPath);
    return;
  }

  if (check) {
    stats.drifted.push(relPath);
    return;
  }

  fs.mkdirSync(dirname(destAbs), { recursive: true });
  fs.writeFileSync(destAbs, srcBuf);
  stats.copied.push(relPath);
}

function main(): void {
  if (!fs.existsSync(sourceRoot)) {
    console.log(
      pc.yellow(
        `core/ checkout not found at:\n  ${sourceRoot}\n` +
          `Skipping sync. Clone the typespec repo into <repo-root>/core (or run\n` +
          `the appropriate submodule init command) and re-run this script.`,
      ),
    );
    process.exit(0);
  }

  console.log(pc.bold("Source:")      + " " + sourceRoot);
  console.log(pc.bold("Destination:") + " " + destEngScripts);
  console.log(pc.bold("Mode:")        + " " + (check ? "check (read-only)" : "write"));
  console.log("");

  const stats: SyncStats = { copied: [], unchanged: [], drifted: [], missing: [] };

  for (const rel of INCLUDES) {
    const srcAbs = join(sourceRoot, ...rel.split("/"));
    if (!fs.existsSync(srcAbs)) {
      stats.missing.push(rel);
      continue;
    }
    const destAbs = join(destEngScripts, ...rel.split("/"));
    syncFile(srcAbs, destAbs, toPosix(rel), stats);
  }

  if (stats.copied.length) {
    console.log(pc.green(pc.bold(`Copied (${stats.copied.length}):`)));
    for (const f of stats.copied) console.log("  " + f);
  }
  if (stats.drifted.length) {
    console.log(pc.red(pc.bold(`Drifted (${stats.drifted.length}):`)));
    for (const f of stats.drifted) console.log("  " + f);
  }
  if (stats.missing.length) {
    console.log(pc.yellow(pc.bold(`Missing in source (${stats.missing.length}):`)));
    for (const f of stats.missing) console.log("  " + f);
  }
  console.log(pc.dim(`Unchanged: ${stats.unchanged.length}`));

  if (check && (stats.drifted.length > 0 || stats.missing.length > 0)) {
    console.error(
      pc.red(
        `\neng/scripts has drifted from core/packages/http-client-python.\n` +
          `Run 'pnpm sync' (or 'tsx eng/scripts/sync.ts') and commit the result.`,
      ),
    );
    process.exit(1);
  }

  console.log(pc.green(pc.bold(check ? "\nNo drift detected." : "\nSync complete.")));
}

main();
