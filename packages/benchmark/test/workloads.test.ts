import { describe, expect, it, vi } from "vitest";
import type { BenchmarkPlan, BenchmarkShard, Stats, Workload } from "../src/types.js";
import { combineShards, createWorkloads, measureWorkload } from "../src/workloads.js";

const runner = { os: "test", arch: "test", nodeVersion: "test" };
function stats(total: number, emitter?: string, emission = 100): Stats {
  return {
    complexity: { createdTypes: 1, finishedTypes: 1 },
    runtime: {
      total,
      loader: total,
      resolver: 0,
      checker: 0,
      validation: { total: 0, validators: {} },
      linter: { total: 0, rules: {} },
      emit: {
        total: emitter ? emission : 0,
        emitters: emitter
          ? { [emitter]: { total: emission, steps: { generate: emission - 1 } } }
          : {},
      },
    },
  };
}
function plan(): BenchmarkPlan {
  const specs = [{ name: "sample", dir: "sample", emitters: ["sdk"] }];
  return {
    id: "plan",
    commit: "commit",
    commitTimestamp: "2026-09-22T00:00:00Z",
    specs,
    workloads: createWorkloads(specs),
    compiler: { iterations: 3, warmup: 1, noiseCvThreshold: 0.1, maxReruns: 1, rerunIterations: 2 },
    emitter: { iterations: 3, warmup: 1 },
  };
}

it("creates one compiler workload and one workload for each configured emitter", () => {
  const workloads = createWorkloads([
    { name: "compute", dir: "compute", emitters: ["js", "csharp"] },
    { name: "network", dir: "network", emitters: ["csharp"] },
  ]);
  expect(
    workloads.map((workload) => [
      workload.spec,
      workload.kind === "emitter" ? workload.emitter : "compiler",
    ]),
  ).toEqual([
    ["compute", "compiler"],
    ["compute", "js"],
    ["compute", "csharp"],
    ["network", "compiler"],
    ["network", "csharp"],
  ]);
  expect(new Set(workloads.map((workload) => workload.id)).size).toBe(5);
});

it("retries compiler noise without invoking an emitter", async () => {
  const p = plan();
  let call = 0;
  const compile = vi.fn(async (workload: Workload) => {
    expect(workload.kind).toBe("compiler");
    return stats(++call % 2 === 0 ? 1 : 100);
  });
  const shard = await measureWorkload(p, p.workloads[0], compile);
  expect(compile).toHaveBeenCalledTimes(6);
  expect(shard.rawIterations).toHaveLength(5);
  expect(shard.noiseGate?.rerunsPerformed).toBe(1);
});

it("keeps the requested 25 compiler measurements and 3 warmups", async () => {
  const p = plan();
  p.compiler = { iterations: 25, warmup: 3, maxReruns: 0, rerunIterations: 10 };
  const compile = vi.fn(async () => stats(10));
  const shard = await measureWorkload(p, p.workloads[0], compile);
  expect(compile).toHaveBeenCalledTimes(28);
  expect(shard.rawIterations).toHaveLength(25);
});

it("uses only emitter sampling, regardless of compiler sampling and noise settings", async () => {
  const p = plan();
  p.compiler.iterations = 25;
  p.compiler.warmup = 3;
  let call = 0;
  const compile = vi.fn(async (workload: Workload) => {
    expect(workload.kind).toBe("emitter");
    return stats(++call % 2 === 0 ? 1 : 1000, "sdk");
  });
  const shard = await measureWorkload(p, p.workloads[1], compile);
  expect(compile).toHaveBeenCalledTimes(4);
  expect(shard.rawIterations).toHaveLength(3);
  expect(shard.noiseGate).toBeUndefined();
});

describe("combining independently sampled workloads", () => {
  function shards(p: BenchmarkPlan): BenchmarkShard[] {
    return p.workloads.map((workload) => ({
      planId: p.id,
      workloadId: workload.id,
      runner,
      warmup: 1,
      elapsedMs: 1000,
      rawIterations:
        workload.kind === "compiler"
          ? [stats(10), stats(20), stats(30)]
          : [stats(999, "sdk", 100), stats(999, "sdk", 200), stats(999, "sdk", 900)],
    }));
  }
  it("keeps compiler samples separate, aggregates emitter samples, and preserves dashboard metrics", () => {
    const p = plan();
    const result = combineShards(p, shards(p));
    const spec = result.specs.sample;
    expect(result.measurementMode).toBe("split");
    expect(spec.stats.runtime.total).toBe(20);
    expect(spec.stats.runtime.emit).toEqual({
      total: 200,
      emitters: { sdk: { total: 200, steps: { generate: 199 } } },
    });
    expect(spec.iterations).toBe(3);
    expect(spec.rawIterations.every((sample) => sample.runtime.emit.total === 0)).toBe(true);
    expect(spec.emitterMeasurements?.sdk.iterations).toBe(3);
    expect(spec.emitterMeasurements?.sdk.variability.sampleCount).toBe(3);
  });
  it("refuses to publish missing, duplicated, or unrelated shards", () => {
    const p = plan();
    const complete = shards(p);
    expect(() => combineShards(p, complete.slice(1))).toThrow(/Missing/);
    expect(() => combineShards(p, [...complete, complete[0]])).toThrow(/Duplicate/);
    expect(() => combineShards(p, [{ ...complete[0], planId: "other" }, complete[1]])).toThrow(
      /plan/,
    );
  });
  it("rejects missing emitter timings rather than filling them with zero", () => {
    const p = plan();
    const complete = shards(p);
    complete[1].rawIterations = [stats(1), stats(2), stats(3)];
    expect(() => combineShards(p, complete)).toThrow(/sdk/);
  });
  it("rejects incorrect sample counts and invalid steps", () => {
    const p = plan();
    const complete = shards(p);
    complete[1].rawIterations.pop();
    expect(() => combineShards(p, complete)).toThrow(/sample count/);
    const invalid = shards(p);
    invalid[1].rawIterations[0].runtime.emit.emitters.sdk.steps.generate = NaN;
    expect(() => combineShards(p, invalid)).toThrow(/step timing/);
  });
});
