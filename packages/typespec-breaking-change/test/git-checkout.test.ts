import { execFile } from "child_process";
import { mkdtemp, mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  checkoutRevision,
  getRepoRoot,
  mapPathIntoWorktree,
  resolveCommitish,
} from "../src/cli/git-checkout.js";

const execFileAsync = promisify(execFile);

/**
 * These tests exercise the real `git` binary against a disposable scratch
 * repository (not mocks), because the whole point of this module is to
 * validate actual git worktree semantics — including cleanup — which mocking
 * child_process would not meaningfully cover.
 */
describe("git-checkout", () => {
  let repoRoot: string;
  let baseSha: string;
  let headSha: string;

  beforeEach(async () => {
    repoRoot = await mkdtemp(join(tmpdir(), "typespec-breaking-change-repo-"));
    await execFileAsync("git", ["init", "--initial-branch=main"], { cwd: repoRoot });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], { cwd: repoRoot });
    await execFileAsync("git", ["config", "user.name", "Test"], { cwd: repoRoot });
    // Disable line-ending translation so file contents round-trip byte-for-byte
    // through checkout on any platform (Windows defaults core.autocrlf to
    // convert LF -> CRLF on checkout, which would otherwise break the exact
    // content assertions below).
    await execFileAsync("git", ["config", "core.autocrlf", "false"], { cwd: repoRoot });

    const specDir = join(repoRoot, "specification", "widget");
    await mkdir(specDir, { recursive: true });
    await writeFile(join(specDir, "main.tsp"), "// base version\n");
    await execFileAsync("git", ["add", "."], { cwd: repoRoot });
    await execFileAsync("git", ["commit", "-m", "base"], { cwd: repoRoot });
    const base = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
    baseSha = base.stdout.trim();

    await writeFile(join(specDir, "main.tsp"), "// head version\n");
    await execFileAsync("git", ["commit", "-am", "head"], { cwd: repoRoot });
    const head = await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoRoot });
    headSha = head.stdout.trim();
  }, 30000);

  afterEach(async () => {
    // maxRetries/retryDelay work around transient EBUSY/ENOTEMPTY on Windows
    // when a just-exited git process hasn't yet released a file handle.
    await rm(repoRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });

  it("resolves the repo root from a nested path", async () => {
    const nestedPath = join(repoRoot, "specification", "widget", "main.tsp");
    const root = await getRepoRoot(nestedPath);
    // Compare realpath-insensitively: on some platforms tmpdir() is itself a
    // symlink (e.g. /tmp -> /private/tmp on macOS), so git's reported root
    // may differ from repoRoot only by that resolved prefix.
    expect(root.endsWith(await realBasename(repoRoot))).toBe(true);
  });

  it("resolves a branch name to its full commit SHA", async () => {
    const sha = await resolveCommitish("HEAD", repoRoot);
    expect(sha).toBe(headSha);

    const baseResolved = await resolveCommitish(baseSha.slice(0, 12), repoRoot);
    expect(baseResolved).toBe(baseSha);
  });

  it("rejects an unresolvable commitish", async () => {
    await expect(resolveCommitish("not-a-real-ref", repoRoot)).rejects.toThrow();
  });

  it("checks out a base revision into an isolated worktree without touching the caller's working tree", async () => {
    const specDir = join(repoRoot, "specification", "widget");
    const headContentPath = join(specDir, "main.tsp");

    const { worktreePath, cleanup } = await checkoutRevision(baseSha, repoRoot);
    try {
      const checkedOutPath = await mapPathIntoWorktree(specDir, repoRoot, worktreePath);
      const { readFile } = await import("fs/promises");
      const checkedOutContent = await readFile(join(checkedOutPath, "main.tsp"), "utf8");
      expect(checkedOutContent).toBe("// base version\n");

      // The caller's original working tree must be untouched (still head content).
      const headContent = await readFile(headContentPath, "utf8");
      expect(headContent).toBe("// head version\n");

      // The main repo's index/working tree must show no pending changes —
      // this is the exact index-consistency guarantee the ad hoc
      // `git checkout <sha> -- <path>` workflow logic did not provide.
      const status = await execFileAsync("git", ["status", "--porcelain"], { cwd: repoRoot });
      expect(status.stdout.trim()).toBe("");
    } finally {
      await cleanup();
    }

    // After cleanup, the worktree registration must be gone.
    const worktreeList = await execFileAsync("git", ["worktree", "list", "--porcelain"], {
      cwd: repoRoot,
    });
    expect(worktreeList.stdout).not.toContain(worktreePath);
  });

  it("supports checking out a branch name, not just a raw SHA", async () => {
    const { worktreePath, cleanup } = await checkoutRevision("main", repoRoot);
    try {
      const { readFile } = await import("fs/promises");
      const checkedOutPath = await mapPathIntoWorktree(
        join(repoRoot, "specification", "widget"),
        repoRoot,
        worktreePath,
      );
      const content = await readFile(join(checkedOutPath, "main.tsp"), "utf8");
      expect(content).toBe("// head version\n");
    } finally {
      await cleanup();
    }
  });

  it("cleanup is idempotent and safe to call more than once", async () => {
    const { cleanup } = await checkoutRevision(baseSha, repoRoot);
    await cleanup();
    await expect(cleanup()).resolves.toBeUndefined();
  });

  it("throws a descriptive error when the worktree add fails", async () => {
    await expect(checkoutRevision("deadbeef", repoRoot)).rejects.toThrow(/deadbeef/);
  });

  it("materializes only the requested sparsePaths, excluding unrelated folders", async () => {
    // Add a second, unrelated top-level folder so we can assert it's
    // excluded from the sparse checkout.
    const otherDir = join(repoRoot, "specification", "other-service");
    await mkdir(otherDir, { recursive: true });
    await writeFile(join(otherDir, "main.tsp"), "// other service\n");
    await execFileAsync("git", ["add", "."], { cwd: repoRoot });
    await execFileAsync("git", ["commit", "-m", "add other-service"], { cwd: repoRoot });
    const sha = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: repoRoot })).stdout.trim();

    const { worktreePath, cleanup } = await checkoutRevision(sha, repoRoot, {
      sparsePaths: ["specification/widget"],
    });
    try {
      const { readFile, stat } = await import("fs/promises");

      const widgetPath = join(worktreePath, "specification", "widget", "main.tsp");
      const widgetContent = await readFile(widgetPath, "utf8");
      expect(widgetContent).toBe("// head version\n");

      // The unrelated folder must NOT be materialized in the worktree — this
      // is the whole point of sparse-checkout: avoiding the cost of writing
      // out every file in the repository at the target revision.
      const otherPath = join(worktreePath, "specification", "other-service", "main.tsp");
      await expect(stat(otherPath)).rejects.toThrow();
    } finally {
      await cleanup();
    }
  }, 30000);

  it("cleans up a sparse-checkout worktree just as reliably as a full one", async () => {
    const { worktreePath, cleanup } = await checkoutRevision(baseSha, repoRoot, {
      sparsePaths: ["specification/widget"],
    });
    await cleanup();

    const worktreeList = await execFileAsync("git", ["worktree", "list", "--porcelain"], {
      cwd: repoRoot,
    });
    expect(worktreeList.stdout).not.toContain(worktreePath);
  }, 30000);
});

async function realBasename(path: string): Promise<string> {
  const { realpath } = await import("fs/promises");
  const resolved = await realpath(path);
  return resolved.split(/[\\/]/).filter(Boolean).pop() ?? resolved;
}
