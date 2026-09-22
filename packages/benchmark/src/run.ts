/* eslint-disable no-console */
import { NodeHost, formatDiagnostic, resolveCompilerOptions } from "@typespec/compiler";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import { compileSpec } from "./compile.js";
import { inspectCSharpInstallation } from "./csharp.js";
import {
  EXTERNAL_SPEC_CONFIG,
  loadExternalSpecConfig,
  resolveExternalSpecs,
} from "./external-specs.js";
import type { BenchmarkPlan, BenchmarkResult, BenchmarkShard } from "./types.js";
import { gitCommand } from "./utils.js";
import { combineShards, createWorkloads, measureWorkload } from "./workloads.js";

export interface RunOptions {
  specsDir: string;
  /** Compilation-only sampling. */
  iterations?: number;
  warmup?: number;
  /** Full-generation sampling, independent of compiler noise retries. */
  emitterIterations?: number;
  emitterWarmup?: number;
  specs?: string[];
  commit?: string;
  noiseCvThreshold?: number;
  maxReruns?: number;
  rerunIterations?: number;
}

function count(value: number, name: string, minimum: number): number {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${name} must be an integer >= ${minimum}.`);
  }
  return value;
}

/** Snapshot external sources once; every CI workload consumes this same prepared checkout. */
export async function createBenchmarkPlan(options: RunOptions): Promise<BenchmarkPlan> {
  const root = gitCommand(["rev-parse", "--show-toplevel"]);
  const specsDir = resolve(options.specsDir);
  const includes = (name: string) => !options.specs?.length || options.specs.includes(name);
  const dirs = (await readdir(specsDir, { withFileTypes: true })).filter((entry) =>
    entry.isDirectory(),
  );
  const local = dirs
    .filter((entry) => includes(entry.name) && existsSync(join(specsDir, entry.name, "main.tsp")))
    .map((entry) => ({ name: entry.name, dir: join(specsDir, entry.name) }));
  const external = dirs
    .filter((entry) => existsSync(join(specsDir, entry.name, EXTERNAL_SPEC_CONFIG)))
    .map((entry) => loadExternalSpecConfig(join(specsDir, entry.name)))
    .filter((config) => includes(config.name));
  const sources = [...local, ...resolveExternalSpecs(external)].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  if (sources.length === 0) throw new Error(`No benchmark specs found in ${specsDir}`);
  const specs: BenchmarkPlan["specs"] = [];
  for (const source of sources) {
    const [config, diagnostics] = await resolveCompilerOptions(NodeHost, {
      entrypoint: join(source.dir, "main.tsp"),
      cwd: source.dir,
    });
    if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
      throw new Error(diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n"));
    }
    const dir = relative(root, source.dir);
    if (dir.startsWith("..") || isAbsolute(dir))
      throw new Error("Benchmark sources must be inside the repository.");
    specs.push({ name: source.name, dir, emitters: config.emit ?? [] });
  }
  if (new Set(specs.map((spec) => spec.name)).size !== specs.length) {
    throw new Error("Benchmark spec names must be unique.");
  }
  const iterations = count(options.iterations ?? 25, "iterations", 1);
  if (
    options.noiseCvThreshold !== undefined &&
    (!Number.isFinite(options.noiseCvThreshold) || options.noiseCvThreshold < 0)
  )
    throw new Error("noise-cv-threshold must be a nonnegative finite number.");
  return {
    id: randomUUID(),
    commit: options.commit ?? gitCommand(["rev-parse", "HEAD"]),
    specs,
    workloads: createWorkloads(specs),
    compiler: {
      iterations,
      warmup: count(options.warmup ?? 3, "warmup", 0),
      noiseCvThreshold: options.noiseCvThreshold,
      maxReruns: count(options.maxReruns ?? 0, "max-reruns", 0),
      rerunIterations: count(options.rerunIterations ?? iterations, "rerun-iterations", 1),
    },
    emitter: {
      iterations: count(options.emitterIterations ?? 3, "emitter-iterations", 1),
      warmup: count(options.emitterWarmup ?? 1, "emitter-warmup", 0),
    },
    externalEmitterVersions: specs.some((spec) =>
      spec.emitters.includes("@azure-typespec/http-client-csharp"),
    )
      ? inspectCSharpInstallation(join(root, "packages/benchmark"))
      : undefined,
  };
}

export async function runWorkload(
  plan: BenchmarkPlan,
  workloadId: string,
): Promise<BenchmarkShard> {
  const workload = plan.workloads.find((item) => item.id === workloadId);
  if (!workload) throw new Error(`Unknown workload ${workloadId}`);
  const spec = plan.specs.find((item) => item.name === workload.spec)!;
  const root = gitCommand(["rev-parse", "--show-toplevel"]);
  const currentCommit = gitCommand(["rev-parse", "HEAD"]);
  if (plan.commit !== currentCommit) {
    throw new Error(
      `Workload checkout ${currentCommit} does not match plan commit ${plan.commit}.`,
    );
  }
  if (workload.kind === "emitter" && workload.emitter === "@azure-typespec/http-client-csharp") {
    const versions = inspectCSharpInstallation(join(root, "packages/benchmark"));
    for (const [name, version] of Object.entries(versions)) {
      if (plan.externalEmitterVersions?.[name] !== version) {
        throw new Error(`C# package ${name} differs from the prepared plan.`);
      }
    }
  }
  return measureWorkload(plan, workload, (item) =>
    compileSpec(
      join(root, spec.dir),
      undefined,
      item.kind === "compiler" ? { kind: "compiler" } : { kind: "emitter", emitter: item.emitter },
    ),
  );
}

/** Local runs are serial; CI distributes the same plan across independent jobs. */
export async function runBenchmarks(options: RunOptions): Promise<BenchmarkResult> {
  const plan = await createBenchmarkPlan(options);
  const shards: BenchmarkShard[] = [];
  for (const workload of plan.workloads) shards.push(await runWorkload(plan, workload.id));
  return combineShards(plan, shards);
}
