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
}

/** Store benchmark results to an orphan git branch and push. */
export function storeResults(options: StoreResultsOptions): void {
  const { resultsFile, commit } = options;
  const branch = options.branch ?? DEFAULT_BRANCH;
  const worktreeDir = "/tmp/bench-data";

  if (!existsSync(resultsFile)) {
    throw new Error(`Results file not found: ${resultsFile}`);
  }

  // Configure git
  git('config user.name "github-actions[bot]"');
  git('config user.email "github-actions[bot]@users.noreply.github.com"');

  // Set up worktree for the benchmark-data branch
  const branchExists = gitSilent(`ls-remote --exit-code --heads origin ${branch}`);
  if (branchExists) {
    git(`fetch origin ${branch}`);
    git(`worktree add ${worktreeDir} origin/${branch}`);
  } else {
    git(`worktree add --detach ${worktreeDir}`);
    git(`checkout --orphan ${branch}`, worktreeDir);
    gitSilent("rm -rf .", worktreeDir);
    mkdirSync(join(worktreeDir, "results"), { recursive: true });

    const readmeContent =
      "# Benchmark Data\n\nThis branch stores TypeSpec benchmark results. Do not merge into main.\n";
    writeFileSync(join(worktreeDir, "README.md"), readmeContent);

    git("add README.md", worktreeDir);
    git('commit -m "Initialize benchmark-data branch"', worktreeDir);
  }

  // Copy results
  const resultsDir = join(worktreeDir, "results");
  mkdirSync(resultsDir, { recursive: true });
  copyFileSync(resultsFile, join(resultsDir, `${commit}.json`));
  copyFileSync(resultsFile, join(resultsDir, "latest.json"));

  // Generate aggregated history
  const history = generateHistory({ dir: resultsDir });
  writeFileSync(join(resultsDir, "history.json"), JSON.stringify(history, null, 2));

  // Commit and push
  git("add results/", worktreeDir);
  git(`commit -m "Benchmark results for ${commit}"`, worktreeDir);
  git(`push origin HEAD:${branch}`, worktreeDir);

  console.log(`Benchmark results stored on ${branch} branch for commit ${commit}`);
}
