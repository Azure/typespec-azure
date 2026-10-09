import { expect, it } from "vitest";
import { compareBenchmarks, hasNotableChanges, isNotableMetricChange } from "../src/compare.js";
import { formatPrComment } from "../src/format-comment.js";
import type { BenchmarkResult, ComparisonResult, MetricComparison } from "../src/types.js";

function createMetric(label: string, baseline: number, current: number): MetricComparison {
  const change = current - baseline;
  const percentChange = baseline === 0 ? (current === 0 ? 0 : 100) : (change / baseline) * 100;
  return { label, baseline, current, change, percentChange };
}

function createComparison(metrics: MetricComparison[]): ComparisonResult {
  return {
    specName: "sample",
    metrics,
    complexity: {
      createdTypes: { baseline: 1, current: 1 },
      finishedTypes: { baseline: 1, current: 1 },
    },
  };
}

it("ignores tiny absolute changes even when percent change is high", () => {
  const tinyMetric = createMetric("linter/rule", 0.05, 0.06);
  expect(isNotableMetricChange(tinyMetric, 5)).toBe(false);
});

it("respects a custom minimum absolute threshold", () => {
  const metric = createMetric("checker", 100, 100.6);
  expect(isNotableMetricChange(metric, 0.5, 0.5)).toBe(true);
  expect(isNotableMetricChange(metric, 0.5, 1)).toBe(false);
});

it("detects notable changes when percent and absolute deltas are both large enough", () => {
  const notableMetric = createMetric("checker", 100, 106);
  const comparisons = [createComparison([notableMetric])];
  expect(hasNotableChanges(comparisons, 5)).toBe(true);
});

it("excludes metrics below minimum absolute threshold from regression summary", () => {
  const comparisons = [
    createComparison([
      createMetric("linter/noisy-rule", 0.05, 0.06),
      createMetric("checker", 100, 106),
    ]),
  ];

  const comment = formatPrComment(comparisons, "baseline123", "current123", { threshold: 5 });
  const topSummary = comment.split("<details>")[0];

  expect(topSummary).toContain("⚠️ **1 metric(s) regressed** above the +5% threshold:");
  expect(topSummary).toContain("| checker |");
  expect(topSummary).not.toContain("linter/noisy-rule");
});

it("keeps descriptive baseline labels in comments", () => {
  const comparisons = [createComparison([createMetric("checker", 100, 99)])];
  const comment = formatPrComment(
    comparisons,
    "rolling:abc1234..def5678 (rolling baseline (20 main runs))",
    "1234567890abcdef",
    { threshold: 5 },
  );

  expect(comment).toContain("rolling baseline (20 main runs)");
  expect(comment).toContain("<code>1234567</code>");
});

function result(total: number, measurementMode?: "split"): BenchmarkResult {
  const stats = {
    complexity: { createdTypes: 1, finishedTypes: 1 },
    runtime: {
      total,
      loader: total,
      resolver: 0,
      checker: 0,
      validation: { total: 0, validators: {} },
      linter: { total: 0, rules: {} },
      emit: { total: 0, emitters: {} },
    },
  };
  return {
    commit: "commit",
    timestamp: "2026-09-22T00:00:00Z",
    measurementMode,
    runner: { os: "test", arch: "test", nodeVersion: "test" },
    specs: { sample: { name: "sample", iterations: 1, stats, rawIterations: [stats] } },
  };
}

it("rejects incompatible measurement methods in either comparison direction", () => {
  expect(() => compareBenchmarks(result(100), result(20, "split"))).toThrow(
    /incompatible measurement/i,
  );
  expect(() => compareBenchmarks(result(20, "split"), result(100))).toThrow(
    /incompatible measurement/i,
  );
});

it.each([undefined, "split"] as const)("still compares matching %s measurements", (mode) => {
  const comparison = compareBenchmarks(result(100, mode), result(120, mode));
  expect(comparison[0].metrics.find((metric) => metric.label === "total")?.percentChange).toBe(20);
});
