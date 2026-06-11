/* eslint-disable no-console */
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { aggregateDurations } from "./aggregate.js";
import { compareBenchmarks, hasNotableChanges } from "./compare.js";
import {
  formatComparisonSummary,
  formatConsoleSummary,
  formatPrComment,
} from "./format-comment.js";
import type { BenchmarkResult, RuntimeStats, SpecBenchmarkResult } from "./types.js";
import { DEFAULT_BRANCH } from "./utils.js";
import type { HistoryData } from "./generate-history.js";

export interface UploadPrCommentOptions {
  /** Path to the current benchmark results JSON file. */
  resultsFile: string;
  /** PR number. */
  prNumber: string;
  /** Output directory for artifacts (comment.md + pr-number.txt). */
  outputDir: string;
  /** Branch name for fetching baseline results. */
  branch?: string;
  /** Percent threshold for notable changes. */
  threshold?: number;
  /** Number of latest entries to use for rolling baseline. */
  baselineWindow?: number;
}

interface BaselineResult {
  baseline: BenchmarkResult;
  label: string;
}

function unflattenRuntime(flat: Record<string, number>): RuntimeStats {
  const runtime: RuntimeStats = {
    total: flat["total"] ?? 0,
    loader: flat["loader"] ?? 0,
    resolver: flat["resolver"] ?? 0,
    checker: flat["checker"] ?? 0,
    validation: { total: flat["validation"] ?? 0, validators: {} },
    linter: { total: flat["linter"] ?? 0, rules: {} },
    emit: { total: flat["emit"] ?? 0, emitters: {} },
  };

  for (const [label, value] of Object.entries(flat)) {
    if (label.startsWith("validation/")) {
      runtime.validation.validators[label.replace("validation/", "")] = value;
      continue;
    }
    if (label.startsWith("linter/")) {
      runtime.linter.rules[label.replace("linter/", "")] = value;
      continue;
    }
    if (!label.startsWith("emit/")) {
      continue;
    }

    const parts = label.split("/");
    if (parts.length < 2) {
      continue;
    }

    const emitterName = parts[1];
    runtime.emit.emitters[emitterName] ??= { total: 0, steps: {} };
    if (parts.length === 2) {
      runtime.emit.emitters[emitterName].total = value;
    } else if (parts.length > 2) {
      const stepName = parts.slice(2).join("/");
      runtime.emit.emitters[emitterName].steps[stepName] = value;
    }
  }

  return runtime;
}

function aggregateSpecFromHistory(
  specName: string,
  entries: HistoryData["entries"],
  currentSpec: SpecBenchmarkResult,
): SpecBenchmarkResult | undefined {
  const samplesByMetric = new Map<string, number[]>();
  for (const entry of entries) {
    const metrics = entry.specMetrics[specName];
    if (!metrics) continue;
    for (const [label, value] of Object.entries(metrics)) {
      const samples = samplesByMetric.get(label);
      if (samples) {
        samples.push(value);
      } else {
        samplesByMetric.set(label, [value]);
      }
    }
  }

  if (samplesByMetric.size === 0) {
    return undefined;
  }

  const aggregated: Record<string, number> = {};
  for (const [label, samples] of samplesByMetric) {
    aggregated[label] = aggregateDurations(samples);
  }

  return {
    ...currentSpec,
    stats: {
      ...currentSpec.stats,
      runtime: unflattenRuntime(aggregated),
    },
  };
}

function buildRollingBaseline(
  history: HistoryData,
  current: BenchmarkResult,
  baselineWindow: number,
): BaselineResult | undefined {
  const window = Math.max(1, baselineWindow);
  const entries = history.entries.slice(-window);
  if (entries.length === 0) {
    return undefined;
  }

  const specs: Record<string, SpecBenchmarkResult> = {};
  for (const [specName, currentSpec] of Object.entries(current.specs)) {
    const rollingSpec = aggregateSpecFromHistory(specName, entries, currentSpec);
    if (!rollingSpec) {
      continue;
    }
    specs[specName] = rollingSpec;
  }

  if (Object.keys(specs).length === 0) {
    return undefined;
  }

  const firstCommit = entries[0]?.commit.slice(0, 7) ?? "unknown";
  const lastCommit = entries[entries.length - 1]?.commit.slice(0, 7) ?? "unknown";
  return {
    baseline: {
      ...current,
      commit: `rolling:${firstCommit}..${lastCommit}`,
      timestamp: new Date().toISOString(),
      specs,
    },
    label: `rolling baseline (${entries.length} main run${entries.length > 1 ? "s" : ""})`,
  };
}

function fetchBaseline(branch: string, current: BenchmarkResult, baselineWindow: number): BaselineResult | undefined {
  try {
    const hasRemote = (() => {
      try {
        execSync(`git ls-remote --exit-code --heads origin ${branch}`, { stdio: "ignore" });
        return true;
      } catch {
        return false;
      }
    })();

    if (!hasRemote) {
      return undefined;
    }

    execSync(`git fetch origin ${branch}`, { stdio: "ignore" });
    try {
      const historyContent = execSync(`git show origin/${branch}:results/history.json`, {
        encoding: "utf-8",
        maxBuffer: 50_000_000,
      });
      const history = JSON.parse(historyContent) as HistoryData;
      const rollingBaseline = buildRollingBaseline(history, current, baselineWindow);
      if (rollingBaseline) {
        return rollingBaseline;
      }
    } catch {
      // ignore and fallback to latest.json
    }

    const latestContent = execSync(`git show origin/${branch}:results/latest.json`, {
      encoding: "utf-8",
      maxBuffer: 50_000_000,
    });
    return {
      baseline: JSON.parse(latestContent) as BenchmarkResult,
      label: "latest main benchmark",
    };
  } catch {
    return undefined;
  }
}

function generateNoBaselineComment(): string {
  return [
    "## ⚡ Benchmark Results",
    "",
    "No baseline found on the `benchmark-data` branch. Benchmark results will be stored after merging to `main`.",
    "",
  ].join("\n");
}

/** Generate PR comment artifacts (comment markdown + PR number file). */
export function uploadPrComment(options: UploadPrCommentOptions): void {
  const { resultsFile, prNumber, outputDir } = options;
  const branch = options.branch ?? DEFAULT_BRANCH;
  const threshold = options.threshold;
  const baselineWindow = options.baselineWindow ?? 20;

  if (!existsSync(resultsFile)) {
    throw new Error(`Results file not found: ${resultsFile}`);
  }

  const current = JSON.parse(readFileSync(resolve(resultsFile), "utf-8")) as BenchmarkResult;
  const baselineResult = fetchBaseline(branch, current, baselineWindow);

  mkdirSync(outputDir, { recursive: true });

  let commentMarkdown: string;
  let githubSummary: string | undefined;

  if (baselineResult) {
    const { baseline, label } = baselineResult;
    const comparisons = compareBenchmarks(baseline, current, { threshold });
    commentMarkdown = formatPrComment(comparisons, `${baseline.commit} (${label})`, current.commit, {
      threshold,
    });
    githubSummary = formatComparisonSummary(
      comparisons,
      `${baseline.commit} (${label})`,
      current.commit,
      threshold,
    );

    // Also print console summary
    console.log(formatConsoleSummary(comparisons, threshold));

    if (hasNotableChanges(comparisons, threshold)) {
      console.error("Notable performance changes detected!");
    }
  } else {
    console.log("No baseline found — generating placeholder comment.");
    commentMarkdown = generateNoBaselineComment();
  }

  writeFileSync(join(outputDir, "benchmark-comment.md"), commentMarkdown);
  writeFileSync(join(outputDir, "benchmark-pr-number.txt"), prNumber);

  // Write GitHub Actions job summary if available
  const summaryFile = process.env["GITHUB_STEP_SUMMARY"];
  if (summaryFile && githubSummary) {
    appendFileSync(summaryFile, githubSummary + "\n", "utf-8");
    console.log("GitHub Actions job summary written.");
  }

  console.log(`PR comment artifacts written to ${outputDir}`);
}
