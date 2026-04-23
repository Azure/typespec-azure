#!/usr/bin/env node
/* eslint-disable no-console */

import { readFile, writeFile } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { compareBenchmarks, hasNotableChanges } from "./compare.js";
import { formatConsoleSummary, formatPrComment } from "./format-comment.js";
import { runBenchmarks } from "./run.js";
import type { BenchmarkResult } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultSpecsDir = resolve(__dirname, "..", "..", "specs");

function usage(): void {
  console.log(`
Usage: typespec-benchmark <command> [options]

Commands:
  run       Run benchmarks and output results as JSON
  compare   Compare two benchmark result files
  format    Format a comparison as a PR comment

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
  --changes-only        Only show metrics with notable changes
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
  const detailed = args["detailed"] === "true";
  const changesOnly = args["changes-only"] === "true";
  const outputFile = args["output"];

  const baseline = await loadJson<BenchmarkResult>(baselineFile);
  const current = await loadJson<BenchmarkResult>(currentFile);
  const comparisons = compareBenchmarks(baseline, current, { threshold });

  let output: string;
  if (format === "markdown") {
    output = formatPrComment(comparisons, baseline.commit, current.commit, {
      threshold,
      detailed,
      changesOnly,
    });
  } else {
    output = formatConsoleSummary(comparisons, threshold);
  }

  if (hasNotableChanges(comparisons, threshold)) {
    console.error("Notable performance changes detected!");
  }

  await outputResult(output, outputFile);
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
