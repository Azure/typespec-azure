/* eslint-disable no-console */
import { execFileSync } from "node:child_process";
import {
  closeSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  rmdirSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { inspectCSharpInstallation, linkCSharpEmitter } from "./csharp.js";
import { storeResults } from "./store-results.js";
import type { BenchmarkResult } from "./types.js";
import { DEFAULT_BRANCH, gitCommand } from "./utils.js";

export interface BackfillOptions {
  /** Starting commit, or number of recent first-parent commits. Defaults to 100. */
  from?: string;
  /** Ending commit, inclusive. Defaults to the source branch tip. */
  to?: string;
  /** Ref whose history to measure, independent of the harness checkout. */
  sourceBranch?: string;
  dataBranch?: string;
  resultsDir?: string;
  push?: boolean;
  /** Replace existing results, for example to add newly tracked emitters. */
  force?: boolean;
  iterations?: number;
  warmup?: number;
  emitterIterations?: number;
  emitterWarmup?: number;
  specs?: string;
  specsDir?: string;
}

/** Resolve once so a moving source branch cannot change the range during a run. */
export function resolveCommitRange(
  repoRoot: string,
  from: string,
  to: string | undefined,
  sourceBranch: string,
): string[] {
  const resolveRef = (ref: string) =>
    gitCommand(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], repoRoot);
  const end = resolveRef(to ?? sourceBranch);
  if (/^\d+$/.test(from)) {
    const count = Number(from);
    if (!Number.isSafeInteger(count) || count <= 0) {
      throw new Error("Backfill commit count must be a positive integer.");
    }
    return gitCommand(
      ["log", "--first-parent", "--reverse", `-${count}`, "--format=%H", end],
      repoRoot,
    ).split("\n");
  }
  const start = resolveRef(from);
  try {
    gitCommand(["merge-base", "--is-ancestor", start, end], repoRoot);
  } catch (cause) {
    throw new Error(`Backfill start ${start} must be an ancestor of ${end}.`, { cause });
  }
  const rest = gitCommand(
    ["log", "--first-parent", "--reverse", "--format=%H", `${start}..${end}`],
    repoRoot,
  );
  return [start, ...rest.split("\n").filter(Boolean)];
}

export async function withBenchmarkWorktree<T>(
  repoRoot: string,
  commit: string,
  action: (dir: string) => Promise<T>,
): Promise<T> {
  const temp = mkdtempSync(join(tmpdir(), "bench-backfill-worktree-"));
  const dir = join(temp, "source");
  gitCommand(["worktree", "add", "--detach", dir, commit], repoRoot);
  try {
    return await action(dir);
  } finally {
    gitCommand(["worktree", "remove", "--force", dir], repoRoot);
    rmdirSync(temp);
  }
}

/** Overlay the current harness before installing the historical workspace's dependencies. */
export function restoreBenchmark(source: string, repoRoot: string): void {
  const destination = join(repoRoot, "packages/benchmark");
  mkdirSync(destination, { recursive: true });
  for (const part of ["dist", "src", "specs", "external-spec", "scripts"]) {
    const target = join(destination, part);
    rmSync(target, { recursive: true, force: true });
    cpSync(join(source, part), target, { recursive: true });
  }
  for (const file of ["package.json", "tsconfig.json", "tsconfig.build.json", ".gitignore"]) {
    copyFileSync(join(source, file), join(destination, file));
  }
}

export async function backfill(options: BackfillOptions = {}): Promise<void> {
  const repoRoot = gitCommand(["rev-parse", "--show-toplevel"]);
  const source = join(repoRoot, "packages/benchmark");
  const commits = resolveCommitRange(
    repoRoot,
    options.from ?? "100",
    options.to,
    options.sourceBranch ?? "origin/main",
  );
  const branch = options.dataBranch ?? DEFAULT_BRANCH;
  const resultsDir = options.resultsDir ?? "results";
  gitCommand(["check-ref-format", `refs/heads/${branch}`], repoRoot);
  const specsPath = relative(repoRoot, resolve(options.specsDir ?? join(source, "specs")));
  if (specsPath.startsWith("..") || isAbsolute(specsPath)) {
    throw new Error("Backfill specs must be inside the source repository.");
  }

  const existing = new Set<string>();
  if (
    !options.force &&
    gitCommand(["ls-remote", "--heads", "origin", `refs/heads/${branch}`], repoRoot)
  ) {
    gitCommand(["fetch", "origin", branch], repoRoot);
    for (const file of gitCommand(
      ["ls-tree", "-r", "--name-only", `origin/${branch}`, "--", `${resultsDir}/`],
      repoRoot,
    ).split("\n")) {
      existing.add(file.slice(resultsDir.length + 1).replace(/\.json$/, ""));
    }
  }
  const pending = commits.filter((commit) => !existing.has(commit));
  console.log(`Backfill: ${pending.length} commits, ${commits.length - pending.length} skipped.`);
  if (pending.length === 0) return;

  inspectCSharpInstallation(source);
  const output = mkdtempSync(join(tmpdir(), "bench-backfill-results-"));
  console.log(`Results and logs: ${output}`);
  let failed = 0;
  await withBenchmarkWorktree(repoRoot, pending[0], async (worktree) => {
    const benchmarkDir = join(worktree, "packages/benchmark");
    for (const [index, sha] of pending.entries()) {
      const logFile = join(output, `${sha}.log`);
      const log = openSync(logFile, "w");
      const run = (command: string, args: string[]) => {
        writeFileSync(log, `$ ${command} ${args.join(" ")}\n`);
        execFileSync(command, args, {
          cwd: worktree,
          stdio: ["ignore", log, log],
          shell: process.platform === "win32" && command === "pnpm",
        });
      };
      console.log(`[${index + 1}/${pending.length}] ${sha.slice(0, 7)} (log: ${logFile})`);
      try {
        run("git", ["checkout", "--detach", "--force", sha]);
        run("git", ["submodule", "update", "--init", "--recursive"]);
        restoreBenchmark(source, worktree);
        run("pnpm", ["install", "--no-frozen-lockfile"]);
        run("pnpm", ["-r", "--filter", "@azure-tools/typespec-benchmark^...", "build"]);

        // Keep one published C# version across the whole backfill, but resolve its peers
        // through each historical workspace rather than the harness checkout.
        if (!existsSync(join(benchmarkDir, ".emitters"))) {
          cpSync(join(source, ".emitters"), join(benchmarkDir, ".emitters"), { recursive: true });
        }
        await linkCSharpEmitter(benchmarkDir);
        inspectCSharpInstallation(benchmarkDir);

        const resultFile = join(output, `${sha}.json`);
        const args = [
          join(benchmarkDir, "dist/src/cli.js"),
          "run",
          "--specs-dir",
          join(worktree, specsPath),
          "--commit",
          sha,
          "--output",
          resultFile,
        ];
        if (options.iterations !== undefined) args.push("--iterations", String(options.iterations));
        if (options.warmup !== undefined) args.push("--warmup", String(options.warmup));
        if (options.emitterIterations !== undefined)
          args.push("--emitter-iterations", String(options.emitterIterations));
        if (options.emitterWarmup !== undefined)
          args.push("--emitter-warmup", String(options.emitterWarmup));
        if (options.specs) args.push("--specs", options.specs);
        run(process.execPath, args);

        const result = JSON.parse(readFileSync(resultFile, "utf8")) as BenchmarkResult;
        result.timestamp = gitCommand(["show", "-s", "--format=%cI", sha], repoRoot);
        writeFileSync(resultFile, JSON.stringify(result, null, 2));
        if (options.push) {
          storeResults({
            resultsFile: resultFile,
            commit: sha,
            branch,
            resultsDir,
            repoDir: repoRoot,
          });
        }
        console.log(`  ${sha.slice(0, 7)} completed.`);
      } catch (error) {
        failed++;
        console.error(`  ${sha.slice(0, 7)} failed:`, error);
        console.error(readFileSync(logFile, "utf8").slice(-12_000));
      } finally {
        closeSync(log);
      }
    }
  });
  if (failed > 0) {
    throw new Error(`${failed}/${pending.length} backfill commits failed. See logs in ${output}`);
  }
  console.log(`Backfill complete. Results and logs: ${output}`);
}
