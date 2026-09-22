/* eslint-disable no-console */
// cspell:ignore mktree
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateHistory } from "./generate-history.js";
import type { BenchmarkResult } from "./types.js";
import { DEFAULT_BRANCH, gitCommand } from "./utils.js";

export interface StoreResultsOptions {
  resultsFile: string;
  commit: string;
  branch?: string;
  /** Top-level data directory, e.g. results or external-results. */
  resultsDir?: string;
  repoDir?: string;
}

const BOT_IDENTITY = [
  "-c",
  "user.name=github-actions[bot]",
  "-c",
  "user.email=github-actions[bot]@users.noreply.github.com",
];

/** Store a result without rewinding latest or rebasing generated history files. */
export function storeResults(options: StoreResultsOptions): void {
  const { resultsFile, commit } = options;
  const branch = options.branch ?? DEFAULT_BRANCH;
  const resultsDirName = options.resultsDir ?? "results";
  const repo = options.repoDir ?? process.cwd();
  const git = (args: string[], cwd = repo) => gitCommand(args, cwd);
  git(["check-ref-format", `refs/heads/${branch}`]);
  if (!/^[\w-]+$/.test(resultsDirName) || !/^[\w-]+$/.test(commit)) {
    throw new Error("Invalid benchmark results directory or commit.");
  }
  const result = JSON.parse(readFileSync(resultsFile, "utf8")) as BenchmarkResult;
  if (result.commit !== commit || !Number.isFinite(Date.parse(result.timestamp))) {
    throw new Error(`Invalid commit or timestamp in ${resultsFile}`);
  }
  const temp = mkdtempSync(join(tmpdir(), "bench-data-"));
  const worktree = join(temp, "data");
  const remoteRef = `refs/remotes/origin/${branch}`;
  const fetchBranch = () => git(["fetch", "origin", `+refs/heads/${branch}:${remoteRef}`]);
  let ref: string;
  if (git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`])) {
    fetchBranch();
    ref = remoteRef;
  } else {
    ref = git([...BOT_IDENTITY, "commit-tree", git(["mktree"]), "-m", "Initialize benchmark data"]);
  }
  git(["worktree", "add", "--detach", worktree, ref]);
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const resultsDir = join(worktree, resultsDirName);
      mkdirSync(resultsDir, { recursive: true });
      copyFileSync(resultsFile, join(resultsDir, `${commit}.json`));
      const latestFile = join(resultsDir, "latest.json");
      const latest: BenchmarkResult | undefined = existsSync(latestFile)
        ? JSON.parse(readFileSync(latestFile, "utf8"))
        : undefined;
      if (
        !latest ||
        latest.commit === commit ||
        Date.parse(result.timestamp) >= Date.parse(latest.timestamp)
      ) {
        copyFileSync(resultsFile, latestFile);
      }
      writeFileSync(
        join(resultsDir, "history.json"),
        JSON.stringify(generateHistory({ dir: resultsDir }), null, 2),
      );
      git(["add", "--", `${resultsDirName}/`], worktree);
      git(
        [...BOT_IDENTITY, "commit", "-m", `Benchmark results (${resultsDirName}) for ${commit}`],
        worktree,
      );
      try {
        git(
          ["-c", "push.recurseSubmodules=no", "push", "origin", `HEAD:refs/heads/${branch}`],
          worktree,
        );
        console.log(`Stored ${commit} on ${branch} (${resultsDirName}).`);
        return;
      } catch (cause) {
        if (attempt === 5) {
          throw new Error(`Failed to publish ${commit} after ${attempt} attempts.`, { cause });
        }
        console.log(
          `Push failed (attempt ${attempt}); regenerating history on the latest data branch.`,
        );
        fetchBranch();
        git(["checkout", "--detach", "--force", remoteRef], worktree);
      }
    }
  } finally {
    git(["worktree", "remove", "--force", worktree]);
    rmdirSync(temp);
  }
}
