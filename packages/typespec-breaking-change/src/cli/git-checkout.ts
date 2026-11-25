import { execFile } from "child_process";
import { mkdtemp, rm, stat, symlink } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, relative, resolve } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface CheckoutResult {
  /** Absolute path to the checked-out worktree root. */
  worktreePath: string;
  /**
   * Remove the worktree and its temporary directory. Callers MUST call this
   * (ideally in a `finally` block) once analysis of the checked-out revision
   * is complete.
   */
  cleanup: () => Promise<void>;
}

/**
 * Return the absolute path of the git repository's working-tree root for
 * `anyPathInRepo`, which may be a file or a directory.
 */
export async function getRepoRoot(anyPathInRepo: string): Promise<string> {
  const dir = await directoryOf(anyPathInRepo);
  const { stdout } = await execFileAsync("git", ["rev-parse", "--show-toplevel"], { cwd: dir });
  return resolve(stdout.trim());
}

/**
 * Resolve `commitish` (a SHA, branch, tag, or other git revision expression)
 * to a full commit SHA within the git repository containing `repoPath`.
 */
export async function resolveCommitish(commitish: string, repoPath: string): Promise<string> {
  const dir = await directoryOf(repoPath);
  const { stdout } = await execFileAsync(
    "git",
    ["rev-parse", "--verify", `${commitish}^{commit}`],
    { cwd: dir },
  );
  return stdout.trim();
}

export interface CheckoutOptions {
  /**
   * Repository-relative directory path(s) to materialize, in `git
   * sparse-checkout --cone` format (e.g. `"specification/widget"`). When
   * provided, only these paths (plus top-level repo files, per cone-mode
   * semantics) are written to disk — critical for large monorepos where a
   * full checkout of every file at the target revision would be far slower
   * than the analysis itself. When omitted, the entire repository is
   * checked out (fine for small repos, e.g. in tests).
   */
  sparsePaths?: string[];
}

/**
 * Check out `commitish` into an isolated, disposable git worktree so that a
 * base revision can be analyzed without mutating the caller's working tree
 * or index.
 *
 * This uses `git worktree add --detach`, which is safe to run alongside other
 * operations against the same repository — unlike an in-place
 * `git checkout <sha> -- <path>` (as CI workflows have historically done),
 * which mutates the shared working tree AND index for the affected path and
 * must be manually, carefully unwound afterward.
 *
 * By default `git worktree add` materializes every file in the repository at
 * `commitish`. For a large monorepo (e.g. azure-rest-api-specs, with tens of
 * thousands of spec files) that is prohibitively slow when only one spec
 * folder is actually needed. Pass `sparsePaths` to scope the checkout with
 * `git sparse-checkout --cone` so only the relevant folder(s) are written.
 *
 * @param commitish - Any git revision expression (SHA, branch, tag, etc.)
 * @param repoPath - Any path inside the git repository to check out from.
 * @param options - See {@link CheckoutOptions}.
 * @returns The worktree root path and a cleanup function. Callers MUST call
 *   `cleanup()` (ideally in a `finally` block) to remove the worktree,
 *   otherwise it will be left on disk as an orphaned temp directory and a
 *   registered git worktree.
 */
export async function checkoutRevision(
  commitish: string,
  repoPath: string,
  options: CheckoutOptions = {},
): Promise<CheckoutResult> {
  const repoRoot = await getRepoRoot(repoPath);
  const sha = await resolveCommitish(commitish, repoRoot);
  const worktreeRoot = resolve(await mkdtemp(join(tmpdir(), "typespec-breaking-change-base-")));

  // `git worktree add` refuses to create a worktree at a path that already
  // exists (even if empty), so remove the directory mkdtemp just created and
  // let `worktree add` recreate it.
  await rm(worktreeRoot, { recursive: true, force: true });

  const sparsePaths = options.sparsePaths?.filter((p) => p.length > 0) ?? [];

  try {
    // With sparse paths requested, skip the default full checkout
    // (--no-checkout) and materialize files only after sparse-checkout
    // patterns are configured, so we never pay the cost of writing out the
    // whole repository just to immediately narrow it down.
    const addArgs = ["worktree", "add", "--detach"];
    if (sparsePaths.length > 0) {
      addArgs.push("--no-checkout");
    }
    addArgs.push(worktreeRoot, sha);
    await execFileAsync("git", addArgs, { cwd: repoRoot });

    if (sparsePaths.length > 0) {
      await execFileAsync("git", ["sparse-checkout", "init", "--cone"], { cwd: worktreeRoot });
      await execFileAsync("git", ["sparse-checkout", "set", ...sparsePaths], {
        cwd: worktreeRoot,
      });
      // `sparse-checkout set` only updates the skip-worktree bits and the
      // sparse-checkout patterns file; because the worktree was created with
      // --no-checkout (nothing materialized yet), we still need to populate
      // the working tree from the index ourselves. `read-tree -mu HEAD`
      // (unlike `checkout HEAD -- .`) respects the sparse-checkout patterns,
      // so only the requested paths are written to disk.
      await execFileAsync("git", ["read-tree", "-mu", "HEAD"], { cwd: worktreeRoot });
    }

    // The checked-out revision is git-tracked source only — it has no
    // `node_modules`, since dependencies are never committed to the repo.
    // Without this, compiling the checked-out revision fails to resolve
    // every npm import (e.g. `@typespec/http`, `@typespec/versioning`) and
    // silently produces an empty, diagnostics-only Program instead of
    // throwing — which callers can easily mistake for "nothing to compare"
    // rather than "compilation was completely broken". Link the caller's
    // own `node_modules` into the worktree root so the checked-out revision
    // resolves dependencies exactly like the caller's own working tree does.
    await linkNodeModulesIfPresent(repoRoot, worktreeRoot);
  } catch (error) {
    // Best-effort cleanup of the partially-created worktree before
    // surfacing the error, so a failed checkout doesn't also leak a
    // worktree registration.
    await execFileAsync("git", ["worktree", "remove", "--force", worktreeRoot], {
      cwd: repoRoot,
    }).catch(() => undefined);
    await rm(worktreeRoot, { recursive: true, force: true }).catch(() => undefined);

    throw new Error(
      `Failed to check out revision "${commitish}" (resolved to ${sha}) as a git worktree: ` +
        `${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let cleanedUp = false;
  const cleanup = async (): Promise<void> => {
    if (cleanedUp) {
      return;
    }
    cleanedUp = true;
    try {
      await execFileAsync("git", ["worktree", "remove", "--force", worktreeRoot], {
        cwd: repoRoot,
      });
    } catch {
      // The worktree metadata may already be gone or corrupted (e.g. the
      // process was killed mid-checkout) — fall back to a plain directory
      // removal, then let `git worktree prune` reconcile stale metadata.
      await rm(worktreeRoot, { recursive: true, force: true });
      await execFileAsync("git", ["worktree", "prune"], { cwd: repoRoot }).catch(() => undefined);
    }
  };

  return { worktreePath: worktreeRoot, cleanup };
}

/**
 * Given a path within a checked-out revision's worktree and the corresponding
 * path in the caller's original working tree (both must live in the same
 * repository), compute the equivalent path inside `worktreePath`.
 */
export async function mapPathIntoWorktree(
  originalPath: string,
  repoPath: string,
  worktreePath: string,
): Promise<string> {
  const repoRoot = await getRepoRoot(repoPath);
  const relativePath = relative(repoRoot, resolve(originalPath));
  return join(worktreePath, relativePath);
}

/**
 * Best-effort: symlink `<repoRoot>/node_modules` into `<worktreeRoot>/node_modules`
 * so that a checked-out revision (which has no dependencies of its own, since
 * `node_modules` is never git-tracked) can still resolve npm imports during
 * TypeSpec compilation. Silently does nothing if the caller's repo has no
 * `node_modules` (e.g. isolated test fixtures) or if the worktree already has
 * one (e.g. `sparsePaths` happened to include a checked-in `node_modules`).
 */
async function linkNodeModulesIfPresent(repoRoot: string, worktreeRoot: string): Promise<void> {
  const sourceNodeModules = join(repoRoot, "node_modules");
  const targetNodeModules = join(worktreeRoot, "node_modules");

  const sourceExists = await stat(sourceNodeModules)
    .then(() => true)
    .catch(() => false);
  if (!sourceExists) {
    return;
  }

  const targetExists = await stat(targetNodeModules)
    .then(() => true)
    .catch(() => false);
  if (targetExists) {
    return;
  }

  // "junction" is honored only on Windows (and ignored elsewhere, where a
  // regular directory symlink is created) — passing it unconditionally lets
  // this work without an elevated/developer-mode symlink privilege on
  // Windows, which a plain "dir" symlink would otherwise require.
  await symlink(sourceNodeModules, targetNodeModules, "junction").catch(() => undefined);
}

async function directoryOf(path: string): Promise<string> {
  const resolved = resolve(path);
  const stats = await stat(resolved);
  return stats.isDirectory() ? resolved : dirname(resolved);
}
