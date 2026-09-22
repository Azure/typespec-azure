import { expect, it } from "vitest";
import {
  buildComparisonView,
  buildMetricView,
  getEmitterNames,
  trailingBaseline,
} from "../../../website/src/components/benchmarks/data.js";
import { buildHistory } from "../src/generate-history.js";
import type { BenchmarkResult, RuntimeStats } from "../src/types.js";

it("discovers all emitters while preserving gaps in legacy history", () => {
  const names = [
    "@azure-tools/typespec-autorest",
    "@typespec/openapi3",
    "@azure-tools/typespec-python",
    "@typespec/http-client-js",
    "@azure-tools/typespec-ts",
    "@azure-tools/typespec-java",
    "@azure-tools/typespec-go",
    "@azure-typespec/http-client-csharp",
    "@azure-tools/typespec-client-generator-core",
  ];
  const makeResult = (emitters: string[], timestamp: string): BenchmarkResult => {
    const runtime: RuntimeStats = {
      total: 10,
      loader: 1,
      resolver: 2,
      checker: 3,
      validation: { total: 4, validators: {} },
      linter: { total: 0, rules: {} },
      emit: {
        total: emitters.length * 20,
        emitters: Object.fromEntries(
          emitters.map((name) => [name, { total: 20, steps: { generate: 15 } }]),
        ),
      },
    };
    const stats = { runtime, complexity: { createdTypes: 1, finishedTypes: 1 } };
    return {
      commit: timestamp,
      timestamp,
      runner: { os: "test", arch: "test", nodeVersion: "test" },
      specs: {
        sample: { name: "sample", iterations: 1, stats, rawIterations: [stats] },
      },
    };
  };
  const history = buildHistory([
    {
      name: "legacy.json",
      content: JSON.stringify(makeResult([names[8]], "2026-01-01T00:00:00Z")),
    },
    {
      name: "current.json",
      content: JSON.stringify({
        ...makeResult(names, "2026-01-02T00:00:00Z"),
        measurementMode: "split",
      }),
    },
  ]);
  expect(history.entries[1].measurementMode).toBe("split");

  for (const spec of ["all", "sample"]) {
    const view = buildMetricView(history, spec, "all");
    expect(getEmitterNames(view.labels)).toEqual([...names].sort());
    for (const name of names) {
      expect(view.values[`emit/${name}`]).toEqual([name === names[8] ? 20 : null, 20]);
      expect(view.values[`emit/${name}/generate`]).toEqual([name === names[8] ? 15 : null, 15]);
    }
  }
});

it("does not interpret a sampling-method change as a performance regression", () => {
  const entries = [
    { commit: "legacy1", timestamp: "2026-01-01T00:00:00Z", metrics: { total: 100 } },
    { commit: "legacy2", timestamp: "2026-01-02T00:00:00Z", metrics: { total: 110 } },
    {
      commit: "split1",
      timestamp: "2026-01-03T00:00:00Z",
      measurementMode: "split" as const,
      metrics: { total: 20 },
    },
    {
      commit: "split2",
      timestamp: "2026-01-04T00:00:00Z",
      measurementMode: "split" as const,
      metrics: { total: 22 },
    },
  ].map((entry) => ({ ...entry, specMetrics: { sample: entry.metrics } }));
  const data = { generated: "now", labels: ["total"], entries };
  const single = buildMetricView(data, "sample", "all");
  expect(trailingBaseline(single.values.total, single.points)).toBe(20);
  const compare = buildComparisonView(data, "total", ["sample"], "all");
  expect(trailingBaseline(compare.values.sample, compare.points)).toBe(20);
  expect(trailingBaseline(single.values.total.slice(0, 3), single.points.slice(0, 3))).toBeNull();
  expect(trailingBaseline(single.values.total.slice(0, 2), single.points.slice(0, 2))).toBe(100);
});
