/* eslint-disable no-console */
/**
 * Sync files from the upstream http-client-python checkout (sibling `core/`
 * repo) into this package.
 *
 * typespec-python is mostly a wrapper around http-client-python, so most of
 * the build / setup / CI helper scripts and shared test assets should be kept
 * identical between the two packages. This script copies the files (and
 * directories) listed in INCLUDES from
 *   <repo-root>/core/packages/http-client-python/<path>
 * into
 *   <this-package>/<path>
 * so we don't have to maintain duplicate copies by hand. If the core/ checkout
 * isn't present the script exits with an informational message and does
 * nothing.
 *
 * Usage:
 *   tsx eng/scripts/sync.ts          # write mode: overwrite local files
 *   tsx eng/scripts/sync.ts --check  # check mode: exit non-zero on drift (CI)
 */
import fs from "fs";
import { dirname, join, relative, sep } from "path";
import pc from "picocolors";
import { fileURLToPath } from "url";
import { parseArgs } from "util";

const here = dirname(fileURLToPath(import.meta.url));
// eng/scripts/sync.ts -> package root is two levels up
const packageRoot = join(here, "..", "..");

// Source lives in the sibling `core/` checkout at the repo root:
//   <repo-root>/core/packages/http-client-python
// packageRoot == <repo-root>/packages/typespec-python, so the repo root is two
// levels up from packageRoot.
const repoRoot = join(packageRoot, "..", "..");
const sourceRoot = join(repoRoot, "core", "packages", "http-client-python");

/**
 * Paths (POSIX, relative to the package root on both sides) that should be
 * synced from the upstream @typespec/http-client-python package.
 *
 * - Entries ending in `/` are directories — every file underneath is copied
 *   recursively (additive: local-only files in the directory are NOT removed).
 * - Other entries are individual files.
 *
 * Anything not listed here is ignored — keeping this an allow-list makes it
 * explicit which files this package is willing to inherit from upstream.
 *
 * To pull in a new upstream file, add it here and run `pnpm sync`.
 */
const INCLUDES: readonly string[] = [
  // Shared CI config
  "eng/scripts/ci/config/mypy.ini",
  "eng/scripts/ci/config/pylintrc",
  "eng/scripts/ci/config/pyrightconfig.json",

  // Shared CI runners (invoked by run-tests.ts via tox)
  "eng/scripts/ci/run_apiview.py",
  "eng/scripts/ci/run_mypy.py",
  "eng/scripts/ci/run_pylint.py",
  "eng/scripts/ci/run_pyright.py",
  "eng/scripts/ci/run_sphinx_build.py",
  "eng/scripts/ci/util.py",

  // Shared regenerate helpers/data tables.  Per-repo orchestration (paths,
  // emitter name, single-phase vs two-phase pipeline, argv/help) lives in
  // each repo's own `regenerate.ts` and is intentionally *not* synced.
  "eng/scripts/ci/regenerate-common.ts",

  // NOTE: eng/scripts/setup/* is intentionally NOT synced. Those scripts
  // (install.py, prepare.py, venvtools.py, etc.) diverged from upstream's
  // http-client-python build/test pipeline; the typespec-python wrapper
  // owns its own copies.
  //
  // Likewise NOT synced (committed and owned by this wrapper):
  //   - generator/                  : pygen lives upstream as the source of
  //                                   truth, but the wrapper checks in a
  //                                   pinned snapshot rather than re-fetching
  //                                   on every CI run.
  //   - tests/tox.ini               : tox envs differ from upstream (paths,
  //                                   emitter name, extra envs).
  //   - tests/install_packages.py   : upstream's version calls `uv pip wheel`,
  //                                   which is not a real uv subcommand, so
  //                                   it fails in CI. The wrapper keeps the
  //                                   working `uv build --wheel` flow. Once
  //                                   the upstream script is fixed (see
  //                                   microsoft/typespec#10636) it can be
  //                                   re-added to this list.

  // Shared test assets. Directory entries (trailing `/`) are recursive and
  // **mirror** the upstream layout: files matching upstream are overwritten,
  // and local-only files are deleted. `tests/data/` and `tests/mock_api/`
  // are gitignored so a fresh CI checkout starts empty and is populated by
  // `pnpm sync`; `tests/requirements/` is small and stable enough to commit
  // as a snapshot that `pnpm sync` refreshes in place. Upstream tests are
  // treated as the source of truth; any wrapper-specific test must live
  // OUTSIDE these directories (e.g. tests/wrapper/) so it isn't pruned by
  // the sync.
  "tests/data/",
  "tests/mock_api/",
  "tests/requirements/",

  // Shared test driver/helper file. Treated as the upstream source of truth
  // (DATA_FOLDER, server-launch logic, etc.) and kept aligned with
  // http-client-python.
  "tests/conftest.py",
];

/**
 * Directory/file names to skip when walking INCLUDES directory entries. Any
 * path that has a segment matching one of these names is ignored on both
 * sides: not copied from source, and not pruned in dest. This is how we keep
 * build artifacts (egg-info, __pycache__, build/, dist/) from polluting the
 * sync.
 */
const EXCLUDED_SEGMENTS: ReadonlySet<string> = new Set([
  "__pycache__",
  "build",
  "dist",
  "pygen.egg-info",
  ".pytest_cache",
  ".mypy_cache",
  ".tox",
  ".wheels",
]);

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
  Copy the files (and recursive directories) listed in INCLUDES from
  <repo-root>/core/packages/http-client-python/ into this package, preserving
  the same path on both sides. Anything not in INCLUDES is left untouched.
  Directory entries are additive — local-only files are not deleted. If the
  core/ checkout is not present, the script exits with an informational
  message and does nothing.

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
  removed: string[]; // local-only files inside a synced directory (mirror)
}

/**
 * Merge upstream dependencies into this package's top-level
 *   dev_requirements.txt
 *
 * This is NOT a full copy. The wrapper file is split on the marker line
 *   `# additional dependency needed for development`
 * Everything BEFORE the marker is replaced verbatim with the contents of
 *   <upstream>/eng/scripts/ci/dev_requirements.txt
 * Everything from the marker onwards (wrapper-specific deps such as
 * `setuptools`) is preserved untouched. If the wrapper file lacks the
 * marker, the upstream content simply replaces the whole file.
 */
function syncDevRequirements(srcAbs: string, destAbs: string, stats: SyncStats): void {
  const relPath = "dev_requirements.txt";

  if (!fs.existsSync(srcAbs)) {
    stats.missing.push("eng/scripts/ci/dev_requirements.txt");
    return;
  }
  if (!fs.existsSync(destAbs)) {
    stats.missing.push(relPath);
    return;
  }

  const srcText = fs.readFileSync(srcAbs, "utf8");
  const destText = fs.readFileSync(destAbs, "utf8");

  // Preserve any leading comment block ("title") of the wrapper file -- the
  // run of `#`-prefixed lines at the very top, before the first non-comment
  // line.
  const destLines = destText.split(/\r?\n/);
  const titleLines: string[] = [];
  for (const line of destLines) {
    if (line.trim().startsWith("#")) titleLines.push(line);
    else break;
  }
  const title = titleLines.length ? titleLines.join("\n") + "\n" : "";

  const MARKER_RE = /^#\s*additional dependency/im;
  const match = MARKER_RE.exec(destText);
  // If marker is missing, the upstream content (with title) becomes the whole
  // file. Otherwise, keep the marker line and everything after it as-is, with
  // a single blank line between the upstream block and the wrapper-only tail.
  const tail = match ? destText.slice(match.index) : "";
  const upstream = srcText.endsWith("\n") ? srcText : srcText + "\n";
  const newText = tail ? title + upstream + "\n" + tail : title + upstream;

  if (newText === destText) {
    stats.unchanged.push(relPath);
    return;
  }
  if (check) {
    stats.drifted.push(relPath);
    return;
  }
  fs.writeFileSync(destAbs, newText, "utf8");
  stats.copied.push(relPath);
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

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  const stack: string[] = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const dirent of fs.readdirSync(cur, { withFileTypes: true })) {
      if (EXCLUDED_SEGMENTS.has(dirent.name)) continue;
      const child = join(cur, dirent.name);
      if (dirent.isDirectory()) {
        stack.push(child);
      } else if (dirent.isFile()) {
        out.push(child);
      }
    }
  }
  return out;
}

function removeEmptyDirsUpTo(startDir: string, stopDir: string): void {
  let cur = startDir;
  while (cur !== stopDir) {
    const rel = relative(stopDir, cur);
    // Bail if we've walked outside stopDir (rel starts with "..") or reached it (rel === "").
    if (rel === "" || rel.startsWith("..")) return;
    try {
      if (fs.readdirSync(cur).length === 0) {
        fs.rmdirSync(cur);
      } else {
        return;
      }
    } catch {
      return;
    }
    cur = dirname(cur);
  }
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

  console.log(pc.bold("Source:") + " " + sourceRoot);
  console.log(pc.bold("Destination:") + " " + packageRoot);
  console.log(pc.bold("Mode:") + " " + (check ? "check (read-only)" : "write"));
  console.log("");

  const stats: SyncStats = { copied: [], unchanged: [], drifted: [], missing: [], removed: [] };

  for (const entry of INCLUDES) {
    const isDir = entry.endsWith("/");
    const rel = isDir ? entry.slice(0, -1) : entry;
    const srcAbs = join(sourceRoot, ...rel.split("/"));

    if (!fs.existsSync(srcAbs)) {
      stats.missing.push(entry);
      continue;
    }

    if (isDir) {
      // Mirror the source directory: copy everything underneath, AND delete
      // any local-only files so the destination becomes a faithful copy of
      // the source. These directories are .gitignored, so deletions never
      // touch tracked files.
      const destDirAbs = join(packageRoot, ...rel.split("/"));
      const sourceFiles = listFilesRecursive(srcAbs);
      const sourceRelSet = new Set(sourceFiles.map((f) => toPosix(relative(srcAbs, f))));

      // Step 1: copy source -> dest
      for (const srcFile of sourceFiles) {
        const relFromDir = toPosix(relative(srcAbs, srcFile));
        const destAbs = join(destDirAbs, ...relFromDir.split("/"));
        const relFromPkg = toPosix(relative(packageRoot, destAbs));
        syncFile(srcFile, destAbs, relFromPkg, stats);
      }

      // Step 2: prune local-only files
      const destFiles = listFilesRecursive(destDirAbs);
      for (const destFile of destFiles) {
        const relFromDir = toPosix(relative(destDirAbs, destFile));
        if (sourceRelSet.has(relFromDir)) continue;
        const relFromPkg = toPosix(relative(packageRoot, destFile));
        if (check) {
          stats.drifted.push(relFromPkg + " (local-only)");
        } else {
          fs.unlinkSync(destFile);
          removeEmptyDirsUpTo(dirname(destFile), destDirAbs);
          stats.removed.push(relFromPkg);
        }
      }
    } else {
      const destAbs = join(packageRoot, ...rel.split("/"));
      syncFile(srcAbs, destAbs, toPosix(rel), stats);
    }
  }

  // Special-case merge (NOT a full copy): pull dependency lines from upstream's
  // eng/scripts/ci/dev_requirements.txt into this package's top-level
  // dev_requirements.txt while preserving wrapper-only deps and comments.
  syncDevRequirements(
    join(sourceRoot, "eng", "scripts", "ci", "dev_requirements.txt"),
    join(packageRoot, "dev_requirements.txt"),
    stats,
  );

  if (stats.copied.length) {
    console.log(pc.green(pc.bold(`Copied (${stats.copied.length}):`)));
    for (const f of stats.copied) console.log("  " + f);
  }
  if (stats.removed.length) {
    console.log(pc.magenta(pc.bold(`Removed local-only (${stats.removed.length}):`)));
    for (const f of stats.removed) console.log("  " + f);
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
        `\nSynced files have drifted from core/packages/http-client-python.\n` +
          `Run 'pnpm sync' (or 'tsx eng/scripts/sync.ts') and commit the result.`,
      ),
    );
    process.exit(1);
  }

  console.log(pc.green(pc.bold(check ? "\nNo drift detected." : "\nSync complete.")));
}

main();
