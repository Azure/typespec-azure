/* eslint-disable no-console */
// cspell:ignore mktree
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateHistory } from "./generate-history.js";
import type { BenchmarkResult } from "./types.js";
import { DEFAULT_BRANCH, gitCommand, withTemporaryWorktree } from "./utils.js";

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
export async function storeResults(options: StoreResultsOptions): Promise<void> {
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
  const remoteRef = `refs/remotes/origin/${branch}`;
  const fetchBranch = () => git(["fetch", "origin", `+refs/heads/${branch}:${remoteRef}`]);
  let ref: string;
  if (git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`])) {
    fetchBranch();
    ref = remoteRef;
  } else {
    ref = git([...BOT_IDENTITY, "commit-tree", git(["mktree"]), "-m", "Initialize benchmark data"]);
  }
  await withTemporaryWorktree(repo, ref, async (worktree) => {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const resultsDir = join(worktree, resultsDirName);
      mkdirSync(resultsDir, { recursive: true });
      const storedFile = join(resultsDir, `${commit}.json`);
      writeFileSync(storedFile, JSON.stringify(result, null, 2));
      const history = generateHistory({ dir: resultsDir, repoDir: repo });
      const stored = history.entries.find((entry) => entry.commit === commit);
      if (!stored) throw new Error(`Result for ${commit} could not be included in history.`);
      result.commitTimestamp = stored.commitTimestamp;
      writeFileSync(storedFile, JSON.stringify(result, null, 2));

      const latest = history.entries[history.entries.length - 1];
      const latestResult: BenchmarkResult = JSON.parse(
        readFileSync(join(resultsDir, `${latest.commit}.json`), "utf8"),
      );
      latestResult.commitTimestamp = latest.commitTimestamp;
      writeFileSync(join(resultsDir, "latest.json"), JSON.stringify(latestResult, null, 2));
      writeFileSync(join(resultsDir, "history.json"), JSON.stringify(history, null, 2));
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
  });
}
