import { expect, it } from "vitest";
import {
  buildComparisonView,
  buildMetricView,
  buildRows,
  detectChanges,
  getEmitterNames,
  trailingBaseline,
} from "../../../website/src/components/benchmarks/data.js";
import type { HistoryEntry } from "../../../website/src/components/benchmarks/types.js";
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
  const history = buildHistory(
    [
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
    ],
    () =>
      new Map([
        ["2026-01-01T00:00:00Z", { timestamp: "2026-01-01T00:00:00Z", order: 0 }],
        ["2026-01-02T00:00:00Z", { timestamp: "2026-01-02T00:00:00Z", order: 1 }],
      ]),
  );
  expect(history.entries[1].measurementMode).toBe("split");
  expect(history.entries[1].specMetadata?.sample.iterations).toBe(1);
  expect(history.entries[1].specMetadata?.sample.runner.nodeVersion).toBe("test");

  for (const spec of ["all", "sample"]) {
    const view = buildMetricView(history, spec, "all");
    expect(getEmitterNames(view.labels)).toEqual([...names].sort());
    for (const name of names) {
      expect(view.values[`emit/${name}`]).toEqual([name === names[8] ? 20 : null, 20]);
      expect(view.values[`emit/${name}/generate`]).toEqual([name === names[8] ? 15 : null, 15]);
    }
  }
});

it("uses only matching hardware and input revisions for dashboard baselines", () => {
  const entry = (commit: string, total: number): HistoryEntry => ({
    commit,
    timestamp: "2026-10-15T00:00:00Z",
    measurementMode: "split-warm",
    metrics: { total },
    specMetrics: { sample: { total } },
    runner: { os: "linux-6.17", arch: "x64", nodeVersion: "v24.15.0", cpuModel: "CPU A" },
    specSources: { sample: { repository: "repo", commit: "corpus-a", path: "sample" } },
  });
  const entries = [
    entry("matching", 10),
    entry("cpu", 100),
    entry("source", 1000),
    entry("latest", 20),
  ];
  entries[1].runner!.cpuModel = "CPU B";
  entries[2].specSources!.sample.commit = "corpus-b";
  const data = { generated: "now", labels: ["total"], entries };
  for (const spec of ["all", "sample"]) {
    expect(buildRows(buildMetricView(data, spec, "all"), ["total"])[0].baseline).toBe(10);
  }
  expect(
    buildRows(buildComparisonView(data, "total", ["sample"], "all"), ["sample"])[0].baseline,
  ).toBe(10);
});

it("keeps noisy compiler samples visible without reporting them as regressions", () => {
  const runner = { os: "linux", arch: "x64", nodeVersion: "v24.15.0" };
  const entries: HistoryEntry[] = [10, 100].map((total, index) => ({
    commit: String(index),
    timestamp: "2026-10-15T00:00:00Z",
    measurementMode: "split-warm",
    metrics: { total },
    specMetrics: { sample: { total } },
    specMetadata: {
      sample: {
        runner,
        emitterRunners: {},
        iterations: 25,
        warmup: 3,
        totalCv: 0.01,
        linterCv: index === 0 ? 0.01 : 0.2,
        noiseThreshold: 0.1,
      },
    },
  }));
  const rows = buildRows(
    buildMetricView({ generated: "now", labels: ["total"], entries }, "sample", "all"),
    ["total"],
  );
  expect(rows[0].values).toEqual([10, 100]);
  expect(rows[0].latest).toBe(100);
  expect(rows[0].baseline).toBeNull();
  expect(detectChanges(rows)).toEqual({ improvements: [], regressions: [] });
});

it("uses each emitter's runner and C# version, not the compiler runner, for emitter comparisons", () => {
  const compiler = { os: "linux", arch: "x64", nodeVersion: "v24.15.0", cpuModel: "compiler" };
  const emitter = "emit/@azure-typespec/http-client-csharp";
  const entries: HistoryEntry[] = [10, 100, 1000, 20].map((total, index) => ({
    commit: String(index),
    timestamp: "2026-10-15T00:00:00Z",
    measurementMode: "split-warm",
    metrics: { [emitter]: total },
    specMetrics: { sample: { [emitter]: total } },
    externalEmitterVersions: { csharp: index === 2 ? "other" : "pinned" },
    specMetadata: {
      sample: {
        runner: { ...compiler, cpuModel: String(index) },
        emitterRunners: {
          "@azure-typespec/http-client-csharp": {
            ...compiler,
            cpuModel: index === 1 ? "other" : "emitter",
          },
        },
        iterations: 25,
      },
    },
  }));
  const rows = buildRows(
    buildMetricView({ generated: "now", labels: [emitter], entries }, "sample", "all"),
    [emitter],
  );
  expect(rows[0].baseline).toBe(10);
});

it("anchors the baseline to the last non-null metric's method, not the last run's method", () => {
  const data = {
    generated: "now",
    labels: ["total"],
    entries: [
      {
        commit: "split",
        timestamp: "2026-01-01T00:00:00Z",
        measurementMode: "split" as const,
        metrics: { total: 10 },
      },
      { commit: "legacy", timestamp: "2026-01-02T00:00:00Z", metrics: { total: 100 } },
      {
        commit: "missing",
        timestamp: "2026-01-03T00:00:00Z",
        measurementMode: "split" as const,
        metrics: {},
      },
    ],
  };
  const rows = buildRows(buildMetricView(data, "all", "all"), ["total"]);
  expect(rows[0].latest).toBe(100);
  expect(rows[0].baseline).toBeNull();
  expect(rows[0].delta).toBeNull();
  expect(detectChanges(rows)).toEqual({ regressions: [], improvements: [] });
});

it("uses the last non-null metric's timestamp for the trailing window", () => {
  const points = [1, 2, 20, 21, 22, 23].map((day) => ({
    commit: String(day),
    timestamp: `2026-01-${String(day).padStart(2, "0")}T00:00:00Z`,
  }));
  points.push({ commit: "missing", timestamp: "2026-03-01T00:00:00Z" });
  expect(trailingBaseline([1000, 1000, 10, 20, 30, 40, null], points)).toBe(20);
  expect(trailingBaseline([null, null], points.slice(0, 2))).toBeNull();
});

it("uses commit time for chart dates and ranges while preserving measurement time", () => {
  const measured = new Date().toISOString();
  const committed = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
  const data = {
    generated: measured,
    labels: ["total"],
    entries: [
      {
        commit: "commit",
        timestamp: measured,
        commitTimestamp: committed,
        metrics: { total: 10 },
        specMetrics: { sample: { total: 10 } },
      },
    ],
  };
  expect(buildMetricView(data, "all", "all").points[0].timestamp).toBe(committed);
  expect(buildComparisonView(data, "total", ["sample"], "all").points[0].timestamp).toBe(committed);
  expect(buildMetricView(data, "all", "30d").points).toEqual([]);
  expect(data.entries[0].timestamp).toBe(measured);
});

it("fails explicitly when source metadata cannot be recovered", () => {
  expect(() =>
    buildHistory(
      [
        {
          name: "result.json",
          content: JSON.stringify({
            commit: "missing",
            timestamp: "2026-09-22T00:00:00Z",
            specs: {},
          }),
        },
      ],
      () => new Map(),
    ),
  ).toThrow(/Missing source commit metadata/);
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
