/* eslint-disable no-console */
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { compareBenchmarks, hasNotableChanges } from "./compare.js";
import {
  formatComparisonSummary,
  formatConsoleSummary,
  formatPrComment,
} from "./format-comment.js";
import type { BenchmarkResult } from "./types.js";
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
  /** Percent threshold for notable changes. */
  threshold?: number;
}

function fetchBaseline(branch: string): BenchmarkResult | undefined {
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
    const content = execSync(`git show origin/${branch}:results/latest.json`, {
      encoding: "utf-8",
      maxBuffer: 50_000_000,
    });
    return JSON.parse(content) as BenchmarkResult;
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

  if (!existsSync(resultsFile)) {
    throw new Error(`Results file not found: ${resultsFile}`);
  }

  const current = JSON.parse(readFileSync(resolve(resultsFile), "utf-8")) as BenchmarkResult;
  const baseline = fetchBaseline(branch);

  mkdirSync(outputDir, { recursive: true });

  let commentMarkdown: string;
  let githubSummary: string | undefined;

  if (baseline) {
    const comparisons = compareBenchmarks(baseline, current, { threshold });
    commentMarkdown = formatPrComment(comparisons, baseline.commit, current.commit, { threshold });
    githubSummary = formatComparisonSummary(
      comparisons,
      baseline.commit,
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
