/* eslint-disable no-console */
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { aggregateDurations } from "./aggregate.js";
import { compareFlatMetrics, hasNotableChanges } from "./compare.js";
import {
  formatComparisonSummary,
  formatConsoleSummary,
  formatPrComment,
} from "./format-comment.js";
import { flattenRuntime, type HistoryData } from "./generate-history.js";
import type { BenchmarkResult, ComparisonResult } from "./types.js";
import { DEFAULT_BRANCH } from "./utils.js";

export interface UploadPrCommentOptions {
  /** Path to the current benchmark results JSON file. */
  resultsFile: string;
  /** PR number. */
  prNumber: string;
  /** Output directory for artifacts (comment.md + pr-number.txt). */
  outputDir: string;
  /** Branch name for fetching baseline results. */
  branch?: string;
  /** Directory on the data branch holding the baseline (default: "results"). */
  resultsDir?: string;
  /** Percent threshold for notable changes. */
  threshold?: number;
  /** Number of latest entries to use for rolling baseline. */
  baselineWindow?: number;
  /** Heading title for the comment (default: "⚡ Benchmark Results"). */
  title?: string;
  /** Comment markdown file name written to outputDir (default: "benchmark-comment.md"). */
  commentFile?: string;
}

/** Baseline metrics per spec (spec name → flat label → ms) plus provenance. */
type FlatMetrics = Record<string, number>;
interface FlatBaseline {
  specs: Record<string, FlatMetrics>;
  commit: string;
  label: string;
}

/** Aggregate a spec's flat metrics across history entries (label → ms). */
function aggregateSpecFromHistory(
  specName: string,
  entries: HistoryData["entries"],
): FlatMetrics | undefined {
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

  const aggregated: FlatMetrics = {};
  for (const [label, samples] of samplesByMetric) {
    aggregated[label] = aggregateDurations(samples);
  }
  return aggregated;
}

function buildRollingBaseline(
  history: HistoryData,
  current: BenchmarkResult,
  baselineWindow: number,
): FlatBaseline | undefined {
  const window = Math.max(1, baselineWindow);
  const entries = history.entries.slice(-window);
  if (entries.length === 0) {
    return undefined;
  }

  const specs: Record<string, FlatMetrics> = {};
  for (const specName of Object.keys(current.specs)) {
    const aggregated = aggregateSpecFromHistory(specName, entries);
    if (aggregated) {
      specs[specName] = aggregated;
    }
  }

  if (Object.keys(specs).length === 0) {
    return undefined;
  }

  const firstCommit = entries[0]?.commit.slice(0, 7) ?? "unknown";
  const lastCommit = entries[entries.length - 1]?.commit.slice(0, 7) ?? "unknown";
  return {
    specs,
    commit: `rolling-baseline-${firstCommit}-${lastCommit}`,
    label: `rolling baseline (${entries.length} main run${entries.length > 1 ? "s" : ""})`,
  };
}

function fetchBaseline(
  branch: string,
  resultsDir: string,
  current: BenchmarkResult,
  baselineWindow: number,
): FlatBaseline | undefined {
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
      const historyContent = execSync(`git show origin/${branch}:${resultsDir}/history.json`, {
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

    const latestContent = execSync(`git show origin/${branch}:${resultsDir}/latest.json`, {
      encoding: "utf-8",
      maxBuffer: 50_000_000,
    });
    const latest = JSON.parse(latestContent) as BenchmarkResult;
    const specs: Record<string, FlatMetrics> = {};
    for (const [specName, spec] of Object.entries(latest.specs)) {
      specs[specName] = flattenRuntime(spec.stats.runtime);
    }
    return { specs, commit: latest.commit, label: "latest main benchmark" };
  } catch {
    return undefined;
  }
}

function generateNoBaselineComment(title: string): string {
  return [
    `## ${title}`,
    "",
    "No baseline found on the `benchmark-data` branch. Benchmark results will be stored after merging to `main`.",
    "",
  ].join("\n");
}

/** Generate PR comment artifacts (comment markdown + PR number file). */
export function uploadPrComment(options: UploadPrCommentOptions): void {
  const { resultsFile, prNumber, outputDir } = options;
  const branch = options.branch ?? DEFAULT_BRANCH;
  const resultsDir = options.resultsDir ?? "results";
  const threshold = options.threshold;
  const baselineWindow = options.baselineWindow ?? 20;
  const title = options.title ?? "⚡ Benchmark Results";
  const commentFile = options.commentFile ?? "benchmark-comment.md";

  if (!existsSync(resultsFile)) {
    throw new Error(`Results file not found: ${resultsFile}`);
  }

  const current = JSON.parse(readFileSync(resolve(resultsFile), "utf-8")) as BenchmarkResult;
  const baseline = fetchBaseline(branch, resultsDir, current, baselineWindow);

  mkdirSync(outputDir, { recursive: true });

  let commentMarkdown: string;
  let githubSummary: string | undefined;

  if (baseline) {
    // Compare current vs baseline at the flat-label level: labels are opaque
    // keys, so scoped emitter/rule names are compared as-is (no parsing).
    const comparisons: ComparisonResult[] = [];
    for (const specName of Object.keys(current.specs).sort()) {
      const baselineFlat = baseline.specs[specName];
      if (!baselineFlat) {
        continue;
      }
      const currentSpec = current.specs[specName];
      comparisons.push({
        specName,
        metrics: compareFlatMetrics(baselineFlat, flattenRuntime(currentSpec.stats.runtime)),
        complexity: {
          createdTypes: {
            baseline: currentSpec.stats.complexity.createdTypes,
            current: currentSpec.stats.complexity.createdTypes,
          },
          finishedTypes: {
            baseline: currentSpec.stats.complexity.finishedTypes,
            current: currentSpec.stats.complexity.finishedTypes,
          },
        },
      });
    }

    const baselineLabel = `${baseline.commit} (${baseline.label})`;
    commentMarkdown = formatPrComment(comparisons, baselineLabel, current.commit, {
      threshold,
      title,
    });
    githubSummary = formatComparisonSummary(comparisons, baselineLabel, current.commit, threshold);

    // Also print console summary
    console.log(formatConsoleSummary(comparisons, threshold));

    if (hasNotableChanges(comparisons, threshold)) {
      console.error("Notable performance changes detected!");
    }
  } else {
    console.log("No baseline found — generating placeholder comment.");
    commentMarkdown = generateNoBaselineComment(title);
  }

  writeFileSync(join(outputDir, commentFile), commentMarkdown);
  writeFileSync(join(outputDir, "benchmark-pr-number.txt"), prNumber);

  // Write GitHub Actions job summary if available
  const summaryFile = process.env["GITHUB_STEP_SUMMARY"];
  if (summaryFile && githubSummary) {
    appendFileSync(summaryFile, githubSummary + "\n", "utf-8");
    console.log("GitHub Actions job summary written.");
  }

  console.log(`PR comment artifacts written to ${outputDir}`);
}
