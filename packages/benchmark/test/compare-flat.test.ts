import { expect, it } from "vitest";
import { compareFlatMetrics } from "../src/compare.js";
import { flattenRuntime } from "../src/generate-history.js";
import type { RuntimeStats } from "../src/types.js";

function emptyRuntime(): RuntimeStats {
  return {
    total: 0,
    loader: 0,
    resolver: 0,
    checker: 0,
    validation: { total: 0, validators: {} },
    linter: { total: 0, rules: {} },
    emit: { total: 0, emitters: {} },
  };
}

it("compareFlatMetrics treats scoped labels as opaque keys", () => {
  // Scoped package names contain a slash; they must be compared as whole labels,
  // never split into a fake `@azure-tools` / `@typespec` metric.
  const baseline = {
    "emit/@azure-tools/typespec-client-generator-core": 100,
    "emit/@typespec/openapi3": 50,
    "emit/@typespec/openapi3/write": 10,
  };
  const current = {
    "emit/@azure-tools/typespec-client-generator-core": 110,
    "emit/@typespec/openapi3": 50,
    "emit/@typespec/openapi3/write": 12,
  };

  const metrics = compareFlatMetrics(baseline, current);
  const byLabel = Object.fromEntries(metrics.map((m) => [m.label, m]));

  expect(Object.keys(byLabel).sort()).toEqual([
    "emit/@azure-tools/typespec-client-generator-core",
    "emit/@typespec/openapi3",
    "emit/@typespec/openapi3/write",
  ]);
  // No phantom "@azure-tools" / "@typespec" labels.
  expect(metrics.some((m) => m.label === "emit/@azure-tools")).toBe(false);
  expect(metrics.some((m) => m.label === "emit/@typespec")).toBe(false);

  const tcgc = byLabel["emit/@azure-tools/typespec-client-generator-core"];
  expect(tcgc.baseline).toBe(100);
  expect(tcgc.current).toBe(110);
});

it("compareFlatMetrics defaults missing values to 0 on either side", () => {
  const metrics = compareFlatMetrics({ checker: 100 }, { loader: 20 });
  const byLabel = Object.fromEntries(metrics.map((m) => [m.label, m]));
  expect(byLabel["loader"]).toMatchObject({ baseline: 0, current: 20 });
  expect(byLabel["checker"]).toMatchObject({ baseline: 100, current: 0 });
});

it("flattenRuntime keeps scoped emitter names intact and reversible via compare", () => {
  const runtime = emptyRuntime();
  runtime.emit.emitters = {
    "@azure-tools/typespec-client-generator-core": { total: 100, steps: {} },
    "@typespec/openapi3": { total: 50, steps: { compute: 40, write: 10 } },
    "local-emitter": { total: 5, steps: {} },
  };

  const flat = flattenRuntime(runtime);

  expect(flat["emit/@azure-tools/typespec-client-generator-core"]).toBe(100);
  expect(flat["emit/@typespec/openapi3"]).toBe(50);
  expect(flat["emit/@typespec/openapi3/write"]).toBe(10);
  expect(flat["emit/local-emitter"]).toBe(5);

  // Comparing a flat map against itself yields zero change for every label.
  const metrics = compareFlatMetrics(flat, flat);
  expect(metrics.every((m) => m.change === 0)).toBe(true);
});
