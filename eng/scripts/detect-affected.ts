import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------
// Downstream CI target configuration.
//
// Upstream *package* dependencies are NOT listed here: they are derived from the
// real pnpm workspace graph (`getDependents`). This config only declares what the
// graph cannot express.
//
// TO ADD A NEW TARGET:
//   1. Add an entry to `TARGETS` below (key = short, expression-safe id).
//   2. Add a reusable `.github/workflows/ci-<id>.yml` (on: workflow_call).
//   3. Add a job + gate `needs:` entry in `.github/workflows/ci-downstream.yml`.
//
// TO ADD A NEW UPSTREAM LIBRARY (e.g. a new typespec-azure-* package that an
// emitter depends on): nothing to do here — the workspace graph picks it up
// automatically as soon as the emitter declares the dependency.
// -----------------------------------------------------------------------------

interface Target {
  /** Workspace package name whose graph dependents identify this emitter. */
  package: string;
  /** Extra paths (outside any package) that should trigger this target. */
  extra?: string[];
  /** Whether a `core` git submodule bump should trigger this target. */
  coreSubmodule?: boolean;
}

interface Config {
  /** Globs whose sole change should NOT trigger anything (matched per file). */
  ignore: string[];
  /** Paths that trigger every target (shared CI infrastructure). */
  sharedExtra: string[];
  targets: Record<string, Target>;
}

export const CONFIG: Config = {
  ignore: ["**/test/**", "**/*.md"],
  sharedExtra: [".github/actions/setup/**"],
  targets: {
    python: {
      package: "@azure-tools/typespec-python",
      extra: [".github/workflows/ci-python.yml", ".github/actions/setup-python/**"],
      coreSubmodule: true,
    },
    java: {
      package: "@azure-tools/typespec-java",
      extra: [".github/workflows/ci-java.yml", ".github/actions/setup-java/**"],
      coreSubmodule: true,
    },
    typescript: {
      package: "@azure-tools/typespec-ts",
      extra: [".github/workflows/ci-typescript.yml"],
      coreSubmodule: true,
    },
  },
};

/** The git path that changes when the `core` submodule pointer moves. */
const SUBMODULE_PATH = "core";

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
 * Convert a restricted glob (`**`, `*`, literals) into an anchored RegExp.
 * `**` matches across path separators, `*` matches within a single segment.
 */
export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

export function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((glob) => globToRegExp(glob).test(file));
}

/** Drop files whose change is not meaningful (matches an `ignore` glob). */
export function filterIgnored(files: string[], ignore: string[]): string[] {
  return files.filter((file) => !matchesAny(file, ignore));
}

/**
 * Map changed files to the workspace packages that contain them, using the
 * longest matching package directory. Files outside every package (root `.github`,
 * `eng`, the `core` submodule pointer, ...) map to nothing.
 */
export function mapFilesToPackages(
  files: string[],
  packages: Array<{ name: string; dir: string }>,
): Set<string> {
  // Exclude the repo-root package: its "directory" is "" and would match everything.
  const pkgs = packages.filter((p) => p.dir !== "" && p.dir !== ".");
  const result = new Set<string>();
  for (const file of files) {
    let best: { name: string; dir: string } | undefined;
    for (const pkg of pkgs) {
      if (file === pkg.dir || file.startsWith(pkg.dir + "/")) {
        if (!best || pkg.dir.length > best.dir.length) best = pkg;
      }
    }
    if (best) result.add(best.name);
  }
  return result;
}

/**
 * Decide which targets are affected. Pure: all git/pnpm I/O happens in the caller.
 *
 * @param affectedPackages Target package OR any graph-dependent of a meaningfully
 *   changed package (from the pnpm workspace graph).
 * @param changedFiles Full changed-file list (for `extra` paths and submodule).
 */
export function computeAffected(
  affectedPackages: Set<string>,
  changedFiles: string[],
  config: Config,
): Record<string, boolean> {
  const submoduleChanged = changedFiles.includes(SUBMODULE_PATH);
  const result: Record<string, boolean> = {};
  for (const [name, target] of Object.entries(config.targets)) {
    const extra = [...config.sharedExtra, ...(target.extra ?? [])];
    result[name] =
      affectedPackages.has(target.package) ||
      (target.coreSubmodule === true && submoduleChanged) ||
      changedFiles.some((file) => matchesAny(file, extra));
  }
  return result;
}

function getChangedFiles(base: string, head: string): string[] {
  return execFileSync("git", ["diff", "--name-only", base, head], { encoding: "utf8" })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getWorkspacePackages(): Array<{ name: string; dir: string }> {
  const out = runPnpm(["list", "-r", "--depth", "-1", "--json"]);
  const parsed = JSON.parse(out) as Array<{ name?: string; path?: string }>;
  const root = process.cwd();
  return parsed
    .filter((p): p is { name: string; path: string } => Boolean(p.name && p.path))
    .map((p) => ({ name: p.name, dir: relative(root, p.path).split("\\").join("/") }));
}

/** Expand meaningfully-changed packages to themselves plus their graph dependents. */
function getDependents(changedPackages: Set<string>): Set<string> {
  if (changedPackages.size === 0) return new Set();
  const args: string[] = [];
  for (const name of changedPackages) args.push("--filter", `...${name}`);
  args.push("list", "--depth", "-1", "--json");
  const out = runPnpm(args);
  const parsed = JSON.parse(out) as Array<{ name?: string }>;
  return new Set(parsed.map((p) => p.name).filter((n): n is string => Boolean(n)));
}

// CLI entry: run only when executed directly (not when imported by tests).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA || "HEAD";
  if (!base) {
    console.error("ERROR: BASE_SHA env var is required");
    process.exit(1);
  }

  const changedFiles = getChangedFiles(base, head);
  const meaningfulFiles = filterIgnored(changedFiles, CONFIG.ignore);
  const changedPackages = mapFilesToPackages(meaningfulFiles, getWorkspacePackages());
  const affectedPackages = getDependents(changedPackages);
  const affected = computeAffected(affectedPackages, changedFiles, CONFIG);

  console.log(`Base: ${base}`);
  console.log(`Head: ${head}`);
  console.log(`Changed files (${changedFiles.length}):`);
  for (const f of changedFiles) console.log(`  ${f}`);
  console.log(`Changed packages: ${[...changedPackages].join(", ") || "(none)"}`);
  console.log(`Affected packages: ${[...affectedPackages].join(", ") || "(none)"}`);
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
