import { expect, it } from "vitest";
import { coefficientOfVariation, summarize } from "../src/statistics.js";

it("computes coefficient of variation", () => {
  const cv = coefficientOfVariation([100, 102, 98, 100]);
  expect(cv).toBeGreaterThan(0);
  expect(cv).toBeLessThan(0.02);
});

it("summarizes value distributions", () => {
  const summary = summarize([90, 100, 110]);
  expect(summary.sampleCount).toBe(3);
  expect(summary.mean).toBe(100);
  expect(summary.median).toBe(100);
  expect(summary.min).toBe(90);
  expect(summary.max).toBe(110);
});
