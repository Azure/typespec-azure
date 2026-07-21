/* eslint-disable no-console */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generateHistory } from "./generate-history.js";
import { DEFAULT_BRANCH, git, gitSilent } from "./utils.js";

export interface StoreResultsOptions {
  /** Path to the benchmark results JSON file. */
  resultsFile: string;
  /** Git commit SHA. */
  commit: string;
  /** Branch name for storing results. */
  branch?: string;
  /**
   * Top-level directory (on the data branch) to store results and history in.
   * Defaults to "results". Use a distinct directory (e.g. "external-results")
   * to keep a group of specs separate from the main baseline.
   */
  resultsDir?: string;
}

/** Store benchmark results to an orphan git branch and push. */
export function storeResults(options: StoreResultsOptions): void {
  const { resultsFile, commit } = options;
  const branch = options.branch ?? DEFAULT_BRANCH;
  const resultsDirName = options.resultsDir ?? "results";
  const worktreeDir = "/tmp/bench-data";

  if (!existsSync(resultsFile)) {
    throw new Error(`Results file not found: ${resultsFile}`);
  }

  // Configure git
  git('config user.name "github-actions[bot]"');
  git('config user.email "github-actions[bot]@users.noreply.github.com"');

  try {
    // Set up worktree for the benchmark-data branch
    const branchExists = gitSilent(`ls-remote --exit-code --heads origin ${branch}`);
    if (branchExists) {
      git(`fetch origin ${branch}`);
      git(`worktree add ${worktreeDir} origin/${branch}`);
    } else {
      git(`worktree add --detach ${worktreeDir}`);
      git(`checkout --orphan ${branch}`, worktreeDir);
      gitSilent("rm -rf .", worktreeDir);

      const readmeContent =
        "# Benchmark Data\n\nThis branch stores TypeSpec benchmark results. Do not merge into main.\n";
      writeFileSync(join(worktreeDir, "README.md"), readmeContent);

      git("add README.md", worktreeDir);
      git('commit -m "Initialize benchmark-data branch"', worktreeDir);
    }

    // Results and history live under `<resultsDir>/` (default "results"); a
    // distinct directory keeps a spec group separate from the main baseline.
    const resultsDir = join(worktreeDir, resultsDirName);
    mkdirSync(resultsDir, { recursive: true });
    copyFileSync(resultsFile, join(resultsDir, `${commit}.json`));
    copyFileSync(resultsFile, join(resultsDir, "latest.json"));

    // Generate aggregated history
    const history = generateHistory({ dir: resultsDir });
    writeFileSync(join(resultsDir, "history.json"), JSON.stringify(history, null, 2));

    // Commit and push
    git(`add ${resultsDirName}/`, worktreeDir);
    git(`commit -m "Benchmark results (${resultsDirName}) for ${commit}"`, worktreeDir);
    pushWithRetry(branch, worktreeDir);

    console.log(
      `Benchmark results stored on ${branch} branch for commit ${commit} (dir: ${resultsDirName})`,
    );
  } finally {
    gitSilent(`worktree remove ${worktreeDir} --force`);
  }
}

/**
 * Push to the data branch, retrying on non-fast-forward rejection. Multiple
 * benchmark workflows (e.g. main and external) may push to the same branch
 * concurrently; since each writes a distinct results directory, rebasing our
 * commit onto the latest remote branch and retrying resolves the race cleanly.
 */
function pushWithRetry(branch: string, worktreeDir: string, attempts = 5): void {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (gitSilent(`push origin HEAD:${branch}`, worktreeDir)) {
      return;
    }
    if (attempt === attempts) {
      throw new Error(`Failed to push to ${branch} after ${attempts} attempts`);
    }
    console.log(
      `Push to ${branch} rejected (attempt ${attempt}); rebasing on latest and retrying...`,
    );
    git(`fetch origin ${branch}`, worktreeDir);
    git(`rebase origin/${branch}`, worktreeDir);
  }
}
