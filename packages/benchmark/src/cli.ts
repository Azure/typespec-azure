#!/usr/bin/env node
/* eslint-disable no-console */

import { appendFile, readFile, readdir, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { backfill } from "./backfill.js";
import { compareBenchmarks, hasNotableChanges } from "./compare.js";
import {
  formatComparisonSummary,
  formatConsoleSummary,
  formatPrComment,
  formatRunSummary,
} from "./format-comment.js";
import { generateHistoryMain } from "./generate-history.js";
import { createBenchmarkPlan, runBenchmarks, runWorkload, type RunOptions } from "./run.js";
import { storeResults } from "./store-results.js";
import type { BenchmarkPlan, BenchmarkResult, BenchmarkShard } from "./types.js";
import { combineShards } from "./workloads.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultSpecsDir = resolve(__dirname, "..", "..", "specs");

function usage(): void {
  console.log(`
Usage: typespec-benchmark <command> [options]

Commands:
  run               Run benchmarks and output results as JSON
  plan              Prepare a portable workload plan and snapshot external specs
  run-workload      Measure one planned compiler or emitter workload
  merge             Combine every planned workload into a dashboard result
  compare           Compare two benchmark result files
  format            Format a comparison as a PR comment
  generate-history  Generate aggregated history.json from benchmark results
  store-results     Store benchmark results to the benchmark-data git branch
  backfill          Backfill benchmark data for historical commits

Run options:
  --specs-dir <dir>     Directory of benchmark specs: subdirectories with a main.tsp (local specs)
                        and/or with a spec.json (external specs) (default: built-in specs)
  --iterations <n>      Compilation-only measurements (default: 25)
  --warmup <n>          Compilation-only warmups (default: 3)
  --emitter-iterations <n>
                        Full-generation measurements per emitter (default: 3)
  --emitter-warmup <n>  Full-generation warmups per emitter (default: 1)
  --noise-cv-threshold <n>
                        Rerun when total-runtime coefficient of variation is above this value (e.g. 0.08 = 8%)
  --max-reruns <n>      Max rerun cycles when noise gate triggers (default: 0)
  --rerun-iterations <n>
                        Extra measured iterations per rerun (default: same as --iterations)
  --specs <name,...>    Comma-separated list of specific specs to run
  --commit <sha>        Git commit SHA to record
  --output <file>       Output file for results JSON (default: stdout)

Plan options:
  All run options, plus --github-output <file> to append the CI matrix output.

Run-workload options:
  --plan <file>        Prepared plan JSON
  --workload <id>      Workload ID from the plan
  --output <file>      Shard output JSON

Merge options:
  --plan <file>        Prepared plan JSON
  --shards-dir <dir>   Directory containing all workload shard JSON files
  --output <file>      Complete benchmark result JSON

Compare options:
  --baseline <file>     Baseline results JSON file
  --current <file>      Current results JSON file
  --threshold <n>       Percent threshold for notable changes (default: 5)
  --output <file>       Output file (default: stdout)
  --format <type>       Output format: "console" or "markdown" (default: console)
  --detailed            Show per-rule/per-emitter-step breakdown

Generate-history options:
  --dir <dir>           Read results from a directory instead of the benchmark-data git branch
  <output-file>         Output file path (default: stdout)

Store-results options:
  --results <file>      Path to the benchmark results JSON file
  --commit <sha>        Git commit SHA
  --branch <name>       Branch name for storing results (default: benchmark-data)
  --results-dir <dir>   Directory on the data branch to store results/history (default: results)

Backfill options:
  --from <sha|n>        Start point: a commit SHA or number of recent commits (default: 100)
  --to <sha>            End commit SHA, inclusive (default: HEAD of source branch)
  --source-branch <b>   Ref to read commits from (default: origin/main)
  --branch <name>       Branch for storing results (default: benchmark-data)
  --push                Publish each successful backfill result
  --force               Replace existing results instead of skipping them
  --results-dir <dir>   Data directory (default: results)
  --specs-dir <dir>     Directory containing benchmark specs (default: built-in specs)
  --iterations <n>      Compilation-only measurements per spec (default: 25)
  --warmup <n>          Compilation-only warmups (default: 3)
  --emitter-iterations <n>
                        Full-generation measurements per emitter (default: 3)
  --emitter-warmup <n>  Full-generation warmups per emitter (default: 1)
  --specs <name,...>    Comma-separated list of specific specs to run
`);
}

async function loadJson<T>(path: string): Promise<T> {
  const content = await readFile(resolve(path), "utf-8");
  return JSON.parse(content) as T;
}

async function outputResult(data: string, outputFile?: string): Promise<void> {
  if (outputFile) {
    await writeFile(resolve(outputFile), data, "utf-8");
    console.log(`Results written to ${outputFile}`);
  } else {
    console.log(data);
  }
}

async function writeGitHubSummary(markdown: string): Promise<void> {
  const summaryFile = process.env["GITHUB_STEP_SUMMARY"];
  if (!summaryFile) {
    return;
  }
  await appendFile(summaryFile, markdown + "\n", "utf-8");
  console.log("GitHub Actions job summary written.");
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        parsed[key] = next;
        i++;
      } else {
        parsed[key] = "true";
      }
    }
  }
  return parsed;
}

function runOptions(args: Record<string, string>): RunOptions {
  const specsDir = args["specs-dir"] ?? defaultSpecsDir;
  const iterations = args["iterations"] !== undefined ? Number(args["iterations"]) : undefined;
  const warmup = args["warmup"] !== undefined ? Number(args["warmup"]) : undefined;
  const specs = args["specs"]?.split(",");
  const commit = args["commit"];
  const noiseCvThreshold =
    args["noise-cv-threshold"] !== undefined ? Number(args["noise-cv-threshold"]) : undefined;
  const maxReruns = args["max-reruns"] !== undefined ? Number(args["max-reruns"]) : undefined;
  const rerunIterations = args["rerun-iterations"] ? Number(args["rerun-iterations"]) : undefined;

  // A spec source is either a local spec directory (with main.tsp) or an
  // external spec directory (with spec.json). `--specs-dir` selects which set
  // to run; both kinds run uniformly and produce a single result file.
  return {
    specsDir,
    iterations,
    warmup,
    specs,
    commit,
    noiseCvThreshold,
    maxReruns,
    rerunIterations,
    emitterIterations:
      args["emitter-iterations"] !== undefined ? Number(args["emitter-iterations"]) : undefined,
    emitterWarmup:
      args["emitter-warmup"] !== undefined ? Number(args["emitter-warmup"]) : undefined,
  };
}

async function runCommand(args: Record<string, string>): Promise<void> {
  const result = await runBenchmarks(runOptions(args));
  await outputResult(JSON.stringify(result, null, 2), args["output"]);
  await writeGitHubSummary(formatRunSummary(result));
}

function required(args: Record<string, string>, key: string): string {
  if (!args[key]) throw new Error(`Missing --${key}`);
  return args[key];
}

async function planCommand(args: Record<string, string>): Promise<void> {
  const plan = await createBenchmarkPlan(runOptions(args));
  await outputResult(JSON.stringify(plan, null, 2), args["output"]);
  if (args["github-output"]) {
    await appendFile(
      args["github-output"],
      `matrix=${JSON.stringify({ include: plan.workloads })}\n`,
    );
  }
}

async function workloadCommand(args: Record<string, string>): Promise<void> {
  const plan = await loadJson<BenchmarkPlan>(required(args, "plan"));
  const shard = await runWorkload(plan, required(args, "workload"));
  await outputResult(JSON.stringify(shard, null, 2), args["output"]);
  await writeGitHubSummary(
    `## ${shard.workloadId}\n\n${shard.rawIterations.length} measurements + ${shard.warmup} warmups in ${(shard.elapsedMs / 60000).toFixed(1)} minutes.`,
  );
}

async function mergeCommand(args: Record<string, string>): Promise<void> {
  const plan = await loadJson<BenchmarkPlan>(required(args, "plan"));
  const dir = resolve(required(args, "shards-dir"));
  const shards = await Promise.all(
    (await readdir(dir))
      .filter((name) => name.endsWith(".json"))
      .map((name) => loadJson<BenchmarkShard>(resolve(dir, name))),
  );
  const result = combineShards(plan, shards);
  await outputResult(JSON.stringify(result, null, 2), args["output"]);
  await writeGitHubSummary(formatRunSummary(result));
}

async function compareCommand(args: Record<string, string>): Promise<void> {
  const baselineFile = args["baseline"];
  const currentFile = args["current"];
  if (!baselineFile || !currentFile) {
    console.error("Error: --baseline and --current are required for compare command");
    process.exit(1);
  }

  const threshold = args["threshold"] ? parseFloat(args["threshold"]) : undefined;
  const format = args["format"] ?? "console";
  const outputFile = args["output"];

  const baseline = await loadJson<BenchmarkResult>(baselineFile);
  const current = await loadJson<BenchmarkResult>(currentFile);
  const comparisons = compareBenchmarks(baseline, current, { threshold });

  let output: string;
  if (format === "markdown") {
    output = formatPrComment(comparisons, baseline.commit, current.commit, {
      threshold,
    });
  } else {
    output = formatConsoleSummary(comparisons, threshold);
  }

  if (hasNotableChanges(comparisons, threshold)) {
    console.error("Notable performance changes detected!");
  }

  await outputResult(output, outputFile);
  await writeGitHubSummary(
    formatComparisonSummary(comparisons, baseline.commit, current.commit, threshold),
  );
}

function storeResultsCommand(args: Record<string, string>): void {
  const resultsFile = args["results"];
  const commit = args["commit"];
  if (!resultsFile || !commit) {
    console.error("Error: --results and --commit are required for store-results command");
    process.exit(1);
  }
  storeResults({
    resultsFile,
    commit,
    branch: args["branch"],
    resultsDir: args["results-dir"],
  });
}

async function backfillCommand(args: Record<string, string>): Promise<void> {
  await backfill({
    from: args["from"],
    to: args["to"],
    sourceBranch: args["source-branch"],
    dataBranch: args["branch"],
    push: args["push"] === "true",
    force: args["force"] === "true",
    resultsDir: args["results-dir"],
    iterations: args["iterations"] ? parseInt(args["iterations"], 10) : undefined,
    warmup: args["warmup"] ? parseInt(args["warmup"], 10) : undefined,
    emitterIterations:
      args["emitter-iterations"] !== undefined ? Number(args["emitter-iterations"]) : undefined,
    emitterWarmup:
      args["emitter-warmup"] !== undefined ? Number(args["emitter-warmup"]) : undefined,
    specs: args["specs"],
    specsDir: args["specs-dir"],
  });
}

async function main(): Promise<void> {
  const rawArgs = process.argv.slice(2);
  const command = rawArgs[0];

  if (!command || command === "--help" || command === "-h") {
    usage();
    return;
  }

  const args = parseArgs(rawArgs.slice(1));

  switch (command) {
    case "run":
      await runCommand(args);
      break;
    case "plan":
      await planCommand(args);
      break;
    case "run-workload":
      await workloadCommand(args);
      break;
    case "merge":
      await mergeCommand(args);
      break;
    case "compare":
      await compareCommand(args);
      break;
    case "generate-history":
      // Pass args after the command name: [node, cli.js, generate-history, ...rest]
      generateHistoryMain(["", "", ...process.argv.slice(3)]);
      break;
    case "store-results":
      storeResultsCommand(args);
      break;
    case "backfill":
      await backfillCommand(args);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      usage();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
