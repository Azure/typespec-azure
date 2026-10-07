/* eslint-disable no-console */
import os from "node:os";
import { performance } from "node:perf_hooks";
import { aggregateDurations } from "./aggregate.js";
import { validateEmitterStats } from "./compile.js";
import { summarize } from "./statistics.js";
import type {
  BenchmarkPlan,
  BenchmarkResult,
  BenchmarkShard,
  BenchmarkSpec,
  NoiseGateInfo,
  RuntimeStats,
  Stats,
  Workload,
} from "./types.js";

export function createWorkloads(specs: BenchmarkSpec[]): Workload[] {
  const workloads: Workload[] = specs.flatMap((spec) => [
    { id: `${spec.name}-compiler`, spec: spec.name, kind: "compiler" as const },
    ...spec.emitters.map((emitter) => ({
      id: `${spec.name}-${emitter.replace(/[^a-zA-Z0-9-]/g, "-")}`,
      spec: spec.name,
      kind: "emitter" as const,
      emitter,
    })),
  ]);
  if (new Set(workloads.map((workload) => workload.id)).size !== workloads.length) {
    throw new Error("Duplicate workload IDs; spec and emitter names must be unique.");
  }
  return workloads;
}

export async function measureWorkload(
  plan: BenchmarkPlan,
  workload: Workload,
  compile: (workload: Workload) => Promise<Stats>,
): Promise<BenchmarkShard> {
  const sampling = workload.kind === "compiler" ? plan.compiler : plan.emitter;
  const started = performance.now();
  const label = `${workload.spec} / ${workload.kind === "compiler" ? "compiler" : workload.emitter}`;
  const run = async (message: string) => {
    console.log(`${label}: ${message}`);
    const start = performance.now();
    const stats = await compile(workload);
    console.log(`  completed in ${((performance.now() - start) / 1000).toFixed(1)}s`);
    return stats;
  };
  for (let i = 0; i < sampling.warmup; i++) {
    await run(`warmup ${i + 1}/${sampling.warmup}`);
  }
  const rawIterations: Stats[] = [];
  for (let i = 0; i < sampling.iterations; i++) {
    rawIterations.push(await run(`measurement ${i + 1}/${sampling.iterations}`));
  }
  let noiseGate: NoiseGateInfo | undefined;
  if (workload.kind === "compiler" && plan.compiler.noiseCvThreshold !== undefined) {
    const { noiseCvThreshold, maxReruns, rerunIterations } = plan.compiler;
    let rerunsPerformed = 0;
    while (
      rerunsPerformed < maxReruns &&
      summarize(rawIterations.map((stats) => stats.runtime.total)).cv > noiseCvThreshold
    ) {
      rerunsPerformed++;
      for (let i = 0; i < rerunIterations; i++) {
        rawIterations.push(await run(`compiler noise retry ${rerunsPerformed}, sample ${i + 1}`));
      }
    }
    noiseGate = {
      thresholdCv: noiseCvThreshold,
      maxReruns,
      rerunIterations,
      rerunsPerformed,
      triggered: rerunsPerformed > 0,
    };
  }
  return {
    planId: plan.id,
    workloadId: workload.id,
    runner: {
      os: `${os.platform()}-${os.release()}`,
      arch: os.arch(),
      nodeVersion: process.version,
    },
    rawIterations,
    warmup: sampling.warmup,
    elapsedMs: performance.now() - started,
    noiseGate,
  };
}

function averageRecord(records: Record<string, number>[]): Record<string, number> {
  const keys = new Set(records.flatMap((record) => Object.keys(record)));
  return Object.fromEntries(
    [...keys].map((key) => [key, aggregateDurations(records.map((record) => record[key] ?? 0))]),
  );
}

function averageCompilerStats(samples: Stats[]): Stats {
  const runtimes = samples.map((sample) => sample.runtime);
  const average = (get: (runtime: RuntimeStats) => number) => aggregateDurations(runtimes.map(get));
  return {
    complexity: {
      createdTypes: Math.round(
        samples.reduce((sum, s) => sum + s.complexity.createdTypes, 0) / samples.length,
      ),
      finishedTypes: Math.round(
        samples.reduce((sum, s) => sum + s.complexity.finishedTypes, 0) / samples.length,
      ),
    },
    runtime: {
      total: average((r) => r.total),
      loader: average((r) => r.loader),
      resolver: average((r) => r.resolver),
      checker: average((r) => r.checker),
      validation: {
        total: average((r) => r.validation.total),
        validators: averageRecord(runtimes.map((r) => r.validation.validators)),
      },
      linter: {
        total: average((r) => r.linter.total),
        rules: averageRecord(runtimes.map((r) => r.linter.rules)),
      },
      emit: { total: 0, emitters: {} },
    },
  };
}

/** Refuse partial/mixed runs; only the complete planned matrix becomes dashboard data. */
export function combineShards(plan: BenchmarkPlan, shards: BenchmarkShard[]): BenchmarkResult {
  if (plan.specs.length === 0 || plan.workloads.length === 0)
    throw new Error("Empty benchmark plan.");
  const byId = new Map<string, BenchmarkShard>();
  const workloads = new Map(plan.workloads.map((workload) => [workload.id, workload]));
  for (const shard of shards) {
    if (shard.planId !== plan.id)
      throw new Error(`Shard ${shard.workloadId} belongs to another plan.`);
    if (byId.has(shard.workloadId)) throw new Error(`Duplicate shard ${shard.workloadId}`);
    const workload = workloads.get(shard.workloadId);
    if (!workload) throw new Error(`Unexpected shard ${shard.workloadId}`);
    const sampling = workload.kind === "compiler" ? plan.compiler : plan.emitter;
    const reruns = workload.kind === "compiler" ? (shard.noiseGate?.rerunsPerformed ?? 0) : 0;
    if (
      !Number.isInteger(reruns) ||
      reruns < 0 ||
      reruns > plan.compiler.maxReruns ||
      shard.warmup !== sampling.warmup ||
      shard.rawIterations.length !== sampling.iterations + reruns * plan.compiler.rerunIterations
    ) {
      throw new Error(`Incorrect sample count for ${shard.workloadId}`);
    }
    for (const sample of shard.rawIterations) {
      if (workload.kind === "emitter") {
        validateEmitterStats(sample, [workload.emitter]);
        if (Object.keys(sample.runtime.emit.emitters).length !== 1) {
          throw new Error(`Unexpected emitter timings in ${shard.workloadId}`);
        }
        if (
          Object.values(sample.runtime.emit.emitters[workload.emitter].steps).some(
            (value) => !Number.isFinite(value) || value < 0,
          )
        ) {
          throw new Error(`Invalid emitter step timing in ${shard.workloadId}`);
        }
      } else if (
        !Number.isFinite(sample.runtime.total) ||
        Object.keys(sample.runtime.emit.emitters).length > 0
      ) {
        throw new Error(`Invalid compilation-only stats in ${shard.workloadId}`);
      }
    }
    byId.set(shard.workloadId, shard);
  }
  for (const workload of plan.workloads) {
    if (!byId.has(workload.id)) throw new Error(`Missing shard ${workload.id}`);
  }
  const result: BenchmarkResult = {
    commit: plan.commit,
    commitTimestamp: plan.commitTimestamp,
    timestamp: new Date().toISOString(),
    runner: shards[0].runner,
    measurementMode: "split",
    externalEmitterVersions: plan.externalEmitterVersions,
    specs: {},
  };
  for (const spec of plan.specs) {
    const specWorkloads = plan.workloads.filter((workload) => workload.spec === spec.name);
    const compilerWorkload = specWorkloads.find((workload) => workload.kind === "compiler")!;
    const compiler = byId.get(compilerWorkload.id)!;
    const stats = averageCompilerStats(compiler.rawIterations);
    const emitterMeasurements: NonNullable<
      BenchmarkResult["specs"][string]["emitterMeasurements"]
    > = {};
    for (const workload of specWorkloads) {
      if (workload.kind !== "emitter") continue;
      const shard = byId.get(workload.id)!;
      const samples = shard.rawIterations.map(
        (sample) => sample.runtime.emit.emitters[workload.emitter],
      );
      const total = aggregateDurations(samples.map((sample) => sample.total));
      stats.runtime.emit.emitters[workload.emitter] = {
        total,
        steps: averageRecord(samples.map((sample) => sample.steps)),
      };
      stats.runtime.emit.total += total;
      emitterMeasurements[workload.emitter] = {
        iterations: samples.length,
        warmup: shard.warmup,
        rawIterations: samples,
        variability: summarize(samples.map((sample) => sample.total)),
        runner: shard.runner,
      };
    }
    result.specs[spec.name] = {
      name: spec.name,
      iterations: compiler.rawIterations.length,
      stats,
      rawIterations: compiler.rawIterations,
      emitterMeasurements,
      variability: {
        total: summarize(compiler.rawIterations.map((sample) => sample.runtime.total)),
        noiseGate: compiler.noiseGate,
      },
    };
  }
  return result;
}
