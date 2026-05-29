#!/usr/bin/env node
/* eslint-disable no-console */

import { appendFile, readFile, writeFile } from "fs/promises";
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
import { runBenchmarks } from "./run.js";
import { storeResults } from "./store-results.js";
import type { BenchmarkResult } from "./types.js";
import { uploadPrComment } from "./upload-pr-comment.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultSpecsDir = resolve(__dirname, "..", "..", "specs");

function usage(): void {
  console.log(`
Usage: typespec-benchmark <command> [options]

Commands:
  run               Run benchmarks and output results as JSON
  compare           Compare two benchmark result files
  format            Format a comparison as a PR comment
  generate-history  Generate aggregated history.json from benchmark results
  store-results     Store benchmark results to the benchmark-data git branch
  upload-pr-comment Fetch baseline, compare, and generate PR comment artifacts
  backfill          Backfill benchmark data for historical commits

Run options:
  --specs-dir <dir>     Directory containing benchmark specs (default: built-in specs)
  --iterations <n>      Number of measured iterations (default: 5)
  --warmup <n>          Number of warmup iterations (default: 1)
  --specs <name,...>    Comma-separated list of specific specs to run
  --commit <sha>        Git commit SHA to record
  --output <file>       Output file for results JSON (default: stdout)

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

Upload-pr-comment options:
  --results <file>      Path to the current benchmark results JSON file
  --pr-number <n>       Pull request number
  --output-dir <dir>    Output directory for artifacts
  --branch <name>       Branch name for fetching baseline (default: benchmark-data)
  --threshold <n>       Percent threshold for notable changes (default: 5)

Backfill options:
  --from <sha|n>        Start point: a commit SHA or number of recent commits (default: 100)
  --to <sha>            End commit SHA, inclusive (default: HEAD of source branch)
  --source-branch <b>   Branch to read commits from (default: main)
  --branch <name>       Branch for storing results (default: benchmark-data)
  --push                Push results to remote after backfill
  --specs-dir <dir>     Directory containing benchmark specs (default: built-in specs)
  --iterations <n>      Number of measured iterations per spec (default: 5)
  --warmup <n>          Number of warmup iterations (default: 1)
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

async function runCommand(args: Record<string, string>): Promise<void> {
  const specsDir = args["specs-dir"] ?? defaultSpecsDir;
  const iterations = args["iterations"] ? parseInt(args["iterations"], 10) : undefined;
  const warmup = args["warmup"] ? parseInt(args["warmup"], 10) : undefined;
  const specs = args["specs"]?.split(",");
  const commit = args["commit"];
  const outputFile = args["output"];

  const result = await runBenchmarks({
    specsDir,
    iterations,
    warmup,
    specs,
    commit,
  });

  await outputResult(JSON.stringify(result, null, 2), outputFile);
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
  });
}

function uploadPrCommentCommand(args: Record<string, string>): void {
  const resultsFile = args["results"];
  const prNumber = args["pr-number"];
  const outputDir = args["output-dir"];
  if (!resultsFile || !prNumber || !outputDir) {
    console.error(
      "Error: --results, --pr-number, and --output-dir are required for upload-pr-comment command",
    );
    process.exit(1);
  }
  uploadPrComment({
    resultsFile,
    prNumber,
    outputDir,
    branch: args["branch"],
    threshold: args["threshold"] ? parseFloat(args["threshold"]) : undefined,
  });
}

function backfillCommand(args: Record<string, string>): void {
  backfill({
    from: args["from"],
    to: args["to"],
    sourceBranch: args["source-branch"],
    dataBranch: args["branch"],
    push: args["push"] === "true",
    iterations: args["iterations"] ? parseInt(args["iterations"], 10) : undefined,
    warmup: args["warmup"] ? parseInt(args["warmup"], 10) : undefined,
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
    case "upload-pr-comment":
      uploadPrCommentCommand(args);
      break;
    case "backfill":
      backfillCommand(args);
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
