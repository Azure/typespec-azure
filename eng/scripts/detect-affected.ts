import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// -----------------------------------------------------------------------------
// Downstream CI target configuration.
//
// The single source of truth is `detect-affected.config.json` (loaded below).
// Upstream *package* dependencies are NOT listed there: they are derived from
// the real pnpm workspace graph (`getAffectedPackages`, via
// `pnpm --filter "...[base]"`). The config only declares what the graph cannot
// express (ignore globs, shared/extra CI-infra paths, the submodule path, and
// the target -> package mapping).
//
// TO ADD A NEW TARGET (e.g. `go`):
//   1. Add an entry to `targets` in `detect-affected.config.json`.
//   2. Add a reusable `.github/workflows/ci-<id>.yml` (on: workflow_call).
//   3. Add a job + gate `needs:` entry in `.github/workflows/ci-downstream.yml`.
// No changes to this file (or its test) are needed — both are config-driven.
//
// TO ADD A NEW UPSTREAM LIBRARY (e.g. a new typespec-azure-* package that an
// emitter depends on): nothing to do — the workspace graph picks it up
// automatically as soon as the emitter declares the dependency.
// -----------------------------------------------------------------------------

interface Target {
  /** Workspace package name whose graph dependents identify this emitter. */
  package: string;
  /** Extra paths (outside any package) that should trigger this target. */
  extra?: string[];
}

interface Config {
  /** Git path that changes when the git-submodule pointer moves (triggers all targets). */
  submodulePath: string;
  /** Globs whose sole change should NOT trigger anything; passed to pnpm via `--changed-files-ignore-pattern`. */
  ignore: string[];
  /** Paths that trigger every target (shared CI infrastructure). */
  sharedExtra: string[];
  targets: Record<string, Target>;
}

export const CONFIG: Config = JSON.parse(
  readFileSync(new URL("./detect-affected.config.json", import.meta.url), "utf8"),
);

/**
 * Run pnpm and return stdout. On Windows pnpm is `pnpm.cmd`, which Node refuses
 * to spawn without a shell (EINVAL); on Linux/macOS CI it is a real binary.
 */
function runPnpm(args: string[]): string {
  const isWindows = process.platform === "win32";
  return execFileSync(isWindows ? "pnpm.cmd" : "pnpm", args, {
    encoding: "utf8",
    shell: isWindows,
  });
}

/**
 * Match a file against an `extra` path pattern. Only two forms are supported,
 * because that is all the non-package CI-infra paths ever need:
 *   - `dir/**`  — the file is `dir` or lives anywhere under it.
 *   - exact     — the file path equals the pattern.
 * (Test/markdown ignore globs are handled by pnpm, not here.)
 */
export function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      return file === prefix || file.startsWith(prefix + "/");
    }
    return file === pattern;
  });
}

/**
 * Decide which targets are affected. Pure: all git/pnpm I/O happens in the caller.
 *
 * A target fires on any of three signals: its package is in the pnpm-derived
 * affected set, OR one of the two things the graph cannot see changed — the
 * `core` submodule pointer (which every emitter depends on, so it triggers all
 * targets), or a non-package `extra` CI-infra path.
 *
 * @param affectedPackages Target package OR any graph-dependent of a meaningfully
 *   changed package (from `pnpm --filter "...[base]"`).
 * @param changedFiles Full changed-file list, used only for the two non-graph
 *   signals (`core` submodule + `extra` paths).
 */
export function computeAffected(
  affectedPackages: Set<string>,
  changedFiles: string[],
  config: Config,
): Record<string, boolean> {
  const submoduleChanged = changedFiles.includes(config.submodulePath);
  const result: Record<string, boolean> = {};
  for (const [name, target] of Object.entries(config.targets)) {
    const extra = [...config.sharedExtra, ...(target.extra ?? [])];
    result[name] =
      affectedPackages.has(target.package) || // pnpm workspace graph
      submoduleChanged || // non-graph: core submodule (all emitters depend on it)
      changedFiles.some((file) => matchesAny(file, extra)); // non-graph: CI-infra paths
  }
  return result;
}

function getChangedFiles(base: string, head: string): string[] {
  return execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Return the workspace packages affected since `base`: every package with a
 * meaningful change plus all of its graph dependents. Change detection, dependent
 * expansion, and test/markdown filtering are all delegated to pnpm:
 *
 *   pnpm --filter "...[<base>]" --changed-files-ignore-pattern <glob> list --depth -1 --json
 *
 * `...[base]` diffs `base` against the working tree (in CI the checkout is HEAD,
 * so this is `base..HEAD`). Each `ignore` glob is passed as its own
 * `--changed-files-ignore-pattern`; a package whose only changes match those
 * globs is not reported.
 */
function getAffectedPackages(base: string, ignore: string[]): Set<string> {
  const args = ["--filter", `...[${base}]`];
  for (const glob of ignore) args.push("--changed-files-ignore-pattern", glob);
  args.push("list", "--depth", "-1", "--json");
  const out = runPnpm(args).trim();
  if (!out) return new Set();
  const parsed = JSON.parse(out) as Array<{ name?: string }>;
  return new Set(parsed.map((p) => p.name).filter((n): n is string => Boolean(n)));
}

// CLI entry: run only when executed directly (not when imported by tests).
// Compare URLs (not paths) so separator/format differences never matter.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || "HEAD";
  if (!base) {
    console.error("ERROR: BASE_SHA env var is required");
    process.exit(1);
  }

  const changedFiles = getChangedFiles(base, head);
  const affectedPackages = getAffectedPackages(base, CONFIG.ignore);
  const affected = computeAffected(affectedPackages, changedFiles, CONFIG);

  console.log(`Base: ${base}`);
  console.log(`Head: ${head}`);
  console.log(`Changed files (${changedFiles.length}):`);
  for (const f of changedFiles) console.log(`  ${f}`);
  console.log(`Affected packages: ${[...affectedPackages].join(", ") || "(none)"}`);
  console.log("Affected targets:", JSON.stringify(affected));

  const outPath = process.env.GITHUB_OUTPUT;
  if (outPath) {
    // Single JSON output; consumers gate on `fromJSON(...).<target>` so the
    // workflow never enumerates target names.
    appendFileSync(outPath, `affected=${JSON.stringify(affected)}\n`);
  }
}
