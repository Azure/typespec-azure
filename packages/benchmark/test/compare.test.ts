import { expect, it } from "vitest";
import { hasNotableChanges, isNotableMetricChange } from "../src/compare.js";
import { formatPrComment } from "../src/format-comment.js";
import type { ComparisonResult, MetricComparison } from "../src/types.js";

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
    createComparison([createMetric("linter/noisy-rule", 0.05, 0.06), createMetric("checker", 100, 106)]),
  ];

  const comment = formatPrComment(comparisons, "baseline123", "current123", { threshold: 5 });
  const topSummary = comment.split("<details>")[0];

  expect(topSummary).toContain("⚠️ **1 metric(s) regressed** above the +5% threshold:");
  expect(topSummary).toContain("| checker |");
  expect(topSummary).not.toContain("| &ensp;↳ linter/noisy-rule |");
});
