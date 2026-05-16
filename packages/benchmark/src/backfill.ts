/* eslint-disable no-console */
import { execSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_BRANCH, exec, execOk, git, gitSilent, listExistingResults } from "./utils.js";

export interface BackfillOptions {
  /** Starting point: a commit SHA, or a number of recent commits to include. Defaults to 100. */
  from?: string;
  /** Ending commit SHA (inclusive). Defaults to HEAD of the source branch. */
  to?: string;
  /** Branch to read commits from. */
  sourceBranch?: string;
  /** Branch name for storing results. */
  dataBranch?: string;
  /** Whether to push results to the remote at the end. */
  push?: boolean;
  /** Number of measured iterations per spec. Forwarded to the run command. */
  iterations?: number;
  /** Number of warmup iterations. Forwarded to the run command. */
  warmup?: number;
  /** Comma-separated list of specific specs to run. Forwarded to the run command. */
  specs?: string;
  /** Directory containing benchmark specs. Forwarded to the run command. */
  specsDir?: string;
}

const DEFAULT_FROM = "100";

const TYPESPEC_PACKAGES = [
  "compiler",
  "openapi",
  "openapi3",
  "http",
  "rest",
  "versioning",
  "xml",
  "json-schema",
  "events",
  "streams",
  "sse",
];

const AZURE_PACKAGES = [
  "typespec-azure-core",
  "typespec-azure-resource-manager",
  "typespec-autorest",
  "typespec-client-generator-core",
  "typespec-azure-rulesets",
];

const BUILD_FILTER = [
  "@typespec/compiler",
  "@azure-tools/typespec-azure-core",
  "@azure-tools/typespec-azure-resource-manager",
  "@azure-tools/typespec-autorest",
  "@typespec/openapi3",
  "@azure-tools/typespec-client-generator-core",
  "@azure-tools/typespec-azure-rulesets",
]
  .map((p) => `--filter "${p}"`)
  .join(" ");

/** Restore the saved benchmark package into the repo with symlinks to workspace packages. */
function restoreBenchmark(repoRoot: string, savedBenchmark: string): void {
  const benchDir = join(repoRoot, "packages/benchmark");
  rmSync(benchDir, { recursive: true, force: true });
  mkdirSync(benchDir, { recursive: true });

  cpSync(join(savedBenchmark, "dist"), join(benchDir, "dist"), { recursive: true });
  cpSync(join(savedBenchmark, "specs"), join(benchDir, "specs"), { recursive: true });
  copyFileSync(join(savedBenchmark, "package.json"), join(benchDir, "package.json"));

  // Create node_modules with symlinks to workspace packages
  const tspModules = join(benchDir, "node_modules/@typespec");
  const azModules = join(benchDir, "node_modules/@azure-tools");
  mkdirSync(tspModules, { recursive: true });
  mkdirSync(azModules, { recursive: true });

  for (const pkg of TYPESPEC_PACKAGES) {
    const target = join(repoRoot, "core/packages", pkg);
    if (existsSync(target)) {
      symlinkSync(target, join(tspModules, pkg));
    }
  }

  for (const pkg of AZURE_PACKAGES) {
    const target = join(repoRoot, "packages", pkg);
    if (existsSync(target)) {
      symlinkSync(target, join(azModules, pkg));
    }
  }
}

/** Resolve a commit range from the from/to options. Returns commits oldest-first. */
function resolveCommitRange(from: string, to: string | undefined, sourceBranch: string): string[] {
  const isNumber = /^\d+$/.test(from);

  if (isNumber) {
    // `from` is a count — get the last N commits up to `to` (or branch HEAD)
    const endpoint = to ?? sourceBranch;
    const commitLog = git(
      `--no-pager log ${endpoint} --oneline -${from} --format="%H"`,
    );
    return commitLog.split("\n").filter(Boolean).reverse();
  }

  // `from` is a commit SHA — get the range from..to
  const endpoint = to ?? sourceBranch;
  const commitLog = git(
    `--no-pager log ${from}..${endpoint} --format="%H"`,
  );
  // Also include the `from` commit itself
  const commits = commitLog.split("\n").filter(Boolean).reverse();
  commits.unshift(from);
  return commits;
}

export function backfill(options: BackfillOptions = {}): void {
  const from = options.from ?? DEFAULT_FROM;
  const sourceBranch = options.sourceBranch ?? "main";
  const dataBranch = options.dataBranch ?? DEFAULT_BRANCH;
  const shouldPush = options.push ?? false;

  // Build flags to forward to `cli.js run`
  const runFlags: string[] = [];
  if (options.iterations !== undefined) runFlags.push(`--iterations ${options.iterations}`);
  if (options.warmup !== undefined) runFlags.push(`--warmup ${options.warmup}`);
  if (options.specs) runFlags.push(`--specs ${options.specs}`);
  if (options.specsDir) runFlags.push(`--specs-dir "${options.specsDir}"`);
  const runFlagsStr = runFlags.join(" ");

  const repoRoot = git("rev-parse --show-toplevel");
  const resultsDir = join(tmpdir(), `bench-backfill-${Date.now()}`);
  const savedBenchmark = join(tmpdir(), `bench-saved-${Date.now()}`);
  const currentBranch = git("rev-parse --abbrev-ref HEAD");

  mkdirSync(resultsDir, { recursive: true });
  mkdirSync(savedBenchmark, { recursive: true });

  console.log("=== Benchmark Backfill ===");
  console.log(`From: ${from}${options.to ? `, To: ${options.to}` : ""}`);
  console.log(`Results dir: ${resultsDir}`);
  console.log("");

  // Step 1: Build and save the benchmark package on the current branch
  console.log("Building benchmark package on current branch...");
  exec(`pnpm -r --filter "@azure-tools/typespec-benchmark..." build`, { cwd: repoRoot });

  cpSync(join(repoRoot, "packages/benchmark/dist"), join(savedBenchmark, "dist"), {
    recursive: true,
  });
  cpSync(join(repoRoot, "packages/benchmark/specs"), join(savedBenchmark, "specs"), {
    recursive: true,
  });
  copyFileSync(
    join(repoRoot, "packages/benchmark/package.json"),
    join(savedBenchmark, "package.json"),
  );
  console.log(`Saved benchmark CLI to ${savedBenchmark}\n`);

  // Step 2: Resolve commit range (oldest first)
  const commits = resolveCommitRange(from, options.to, sourceBranch);
  console.log(`Found ${commits.length} commits to process\n`);

  // Check which commits already have results
  if (gitSilent("fetch origin " + dataBranch)) {
    // fetched successfully
  }
  const existingResults = listExistingResults(dataBranch);

  // Stash uncommitted changes
  let stashed = false;
  if (
    !execOk("git diff --quiet", { cwd: repoRoot }) ||
    !execOk("git diff --cached --quiet", { cwd: repoRoot })
  ) {
    console.log("Stashing uncommitted changes...");
    git('stash push -m "backfill-benchmark-stash" --quiet');
    stashed = true;
  }

  const cleanup = () => {
    console.log("\nCleaning up...");
    rmSync(join(repoRoot, "packages/benchmark"), { recursive: true, force: true });
    gitSilent("checkout -- pnpm-lock.yaml");
    gitSilent(`checkout ${currentBranch} --force --quiet`);
    gitSilent("submodule update --init --recursive --quiet");
    if (stashed) {
      gitSilent("stash pop --quiet");
    }
    console.log(`Results saved in: ${resultsDir}`);
  };

  // Step 3: Process each commit
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  try {
    for (let i = 0; i < commits.length; i++) {
      const sha = commits[i];
      const shortSha = sha.slice(0, 7);
      const progress = `[${i + 1}/${commits.length}]`;

      if (existingResults.has(sha)) {
        console.log(`${progress} ${shortSha} — already has results, skipping`);
        skipped++;
        continue;
      }

      process.stdout.write(`${progress} ${shortSha} — `);

      rmSync(join(repoRoot, "packages/benchmark"), { recursive: true, force: true });
      gitSilent("checkout -- pnpm-lock.yaml");

      if (!gitSilent(`checkout ${sha} --force --quiet`)) {
        console.log("checkout failed, skipping");
        failed++;
        continue;
      }

      if (!gitSilent("submodule update --init --recursive --quiet")) {
        console.log("submodule update failed, skipping");
        failed++;
        continue;
      }

      if (!execOk("pnpm install --frozen-lockfile --quiet", { cwd: repoRoot })) {
        if (!execOk("pnpm install --quiet", { cwd: repoRoot })) {
          console.log("install failed, skipping");
          failed++;
          continue;
        }
      }

      if (!execOk(`pnpm -r ${BUILD_FILTER} build`, { cwd: repoRoot })) {
        console.log("build failed, skipping");
        failed++;
        continue;
      }

      restoreBenchmark(repoRoot, savedBenchmark);

      const benchmarkCli = join(repoRoot, "packages/benchmark/dist/src/cli.js");
      const defaultSpecsDir = join(repoRoot, "packages/benchmark/specs");
      const resultFile = join(resultsDir, `${sha}.json`);
      const benchLog = join(resultsDir, `${sha}.log`);

      // Use --specs-dir from runFlags if provided, otherwise use the saved specs
      const specsFlag = options.specsDir ? "" : `--specs-dir "${defaultSpecsDir}"`;

      try {
        execSync(
          `node "${benchmarkCli}" run ${specsFlag} --output "${resultFile}" ${runFlagsStr}`.trim(),
          { cwd: repoRoot, stdio: ["ignore", "ignore", "ignore"] },
        );
        console.log("done ✓");
        succeeded++;
      } catch {
        console.log(`benchmark failed (see ${benchLog})`);
        failed++;
        rmSync(resultFile, { force: true });
      }
    }
  } finally {
    cleanup();
  }

  console.log("\n=== Backfill Complete ===");
  console.log(`Succeeded: ${succeeded}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);

  // Step 4: Push results to benchmark-data branch
  const newResults = readdirSync(resultsDir).filter((f) => f.endsWith(".json"));
  if (newResults.length === 0) {
    console.log("\nNo new results to push.");
    return;
  }

  console.log(`\nCommitting ${newResults.length} result(s) to ${dataBranch} branch...`);

  // Switch to benchmark-data branch
  if (gitSilent(`rev-parse --verify origin/${dataBranch}`)) {
    gitSilent(`checkout origin/${dataBranch} --force --quiet`);
    gitSilent(`checkout -B ${dataBranch} --quiet`);
  } else {
    git(`checkout --orphan ${dataBranch} --quiet`);
    gitSilent("rm -rf . --quiet");
  }

  mkdirSync("results", { recursive: true });
  for (const file of newResults) {
    copyFileSync(join(resultsDir, file), join("results", file));
  }

  // Update latest.json to the most recent result
  const sorted = newResults.sort();
  if (sorted.length > 0) {
    copyFileSync(join(resultsDir, sorted[sorted.length - 1]), "results/latest.json");
  }

  git("add results/");
  const commitMsg = `benchmark: backfill results for ${succeeded} commits`;
  gitSilent(`commit -m "${commitMsg}" --quiet`);
  console.log(`Results committed to ${dataBranch} branch.`);

  if (shouldPush) {
    git(`push origin ${dataBranch}`);
    console.log(`Pushed to origin/${dataBranch}.`);
  } else {
    console.log(`Run 'git push origin ${dataBranch}' to push to remote.`);
  }

  // Return to original branch
  gitSilent(`checkout ${currentBranch} --force --quiet`);
  gitSilent("submodule update --init --recursive --quiet");
}
