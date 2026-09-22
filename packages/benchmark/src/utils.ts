// cspell:ignore topo
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const DEFAULT_BRANCH = "benchmark-data";

export function gitCommand(args: string[], cwd?: string, input = ""): string {
  return execFileSync("git", args, {
    cwd,
    input,
    encoding: "utf8",
    maxBuffer: 50_000_000,
  }).trim();
}

export async function withTemporaryWorktree<T>(
  repoRoot: string,
  commit: string,
  action: (dir: string) => T | Promise<T>,
): Promise<T> {
  const temp = mkdtempSync(join(tmpdir(), "bench-worktree-"));
  const dir = join(temp, "worktree");
  let added = false;
  try {
    gitCommand(["worktree", "add", "--detach", dir, commit], repoRoot);
    added = true;
    return await action(dir);
  } finally {
    if (added) gitCommand(["worktree", "remove", "--force", dir], repoRoot);
    rmdirSync(temp);
  }
}

export function getCommitTimestamp(commit: string, repoDir?: string): string {
  return gitCommand(
    ["show", "-s", "--no-show-signature", "--format=%cI", "--end-of-options", `${commit}^{commit}`],
    repoDir,
  );
}

export interface CommitMetadata {
  timestamp: string;
  /** Oldest-first topological order, independent of equal or skewed commit clocks. */
  order: number;
}

/** Recover source metadata for legacy results too, never substituting measurement time. */
export function getCommitMetadata(
  commits: string[],
  repoDir?: string,
): Map<string, CommitMetadata> {
  const requested = [...new Set(commits)].sort();
  if (requested.length === 0) return new Map();
  for (const commit of requested) {
    if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(commit)) {
      throw new Error(`Expected a full source commit SHA, got ${commit}`);
    }
  }
  if (gitCommand(["rev-parse", "--is-shallow-repository"], repoDir) === "true") {
    process.stderr.write("Fetching full source history to order benchmark commits.\n");
    gitCommand(["fetch", "--unshallow", "--no-tags", "origin"], repoDir);
  }
  const input = requested.join("\n") + "\n";
  const objects = gitCommand(
    ["cat-file", "--batch-check=%(objectname) %(objecttype)"],
    repoDir,
    input,
  ).split("\n");
  const missing = objects
    .filter((line) => line.endsWith(" missing"))
    .map((line) => line.split(" ")[0]);
  for (let i = 0; i < missing.length; i += 100) {
    process.stderr.write("Fetching source commits referenced by published benchmark results.\n");
    gitCommand(["fetch", "--no-tags", "origin", ...missing.slice(i, i + 100)], repoDir);
  }
  const log = gitCommand(
    [
      "log",
      "--topo-order",
      "--reverse",
      "--no-show-signature",
      "--no-decorate",
      "--format=%H%x00%cI",
      "--stdin",
    ],
    repoDir,
    input,
  );
  const wanted = new Set(requested);
  const metadata = new Map<string, CommitMetadata>();
  for (const [order, line] of log.split("\n").entries()) {
    const [commit, timestamp] = line.split("\0");
    if (!wanted.has(commit)) continue;
    if (!Number.isFinite(Date.parse(timestamp)))
      throw new Error(`Invalid source timestamp for ${commit}`);
    metadata.set(commit, { timestamp, order });
  }
  for (const commit of requested) {
    if (!metadata.has(commit)) throw new Error(`Missing source commit metadata for ${commit}`);
  }
  return metadata;
}
