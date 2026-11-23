import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { BenchmarkPlan, BenchmarkShard, Stats, Workload } from "./types.js";

const compileOncePath = fileURLToPath(new URL("./compile-once.js", import.meta.url));
const measureCompilerPath = fileURLToPath(new URL("./measure-compiler.js", import.meta.url));

export type CompilationMode = { kind: "compiler" } | { kind: "emitter"; emitter: string };

export function validateEmitterStats(stats: Stats, emitters: readonly string[]): void {
  for (const name of emitters) {
    const total = stats.runtime.emit.emitters[name]?.total;
    if (total === undefined || !Number.isFinite(total) || total < 0) {
      throw new Error(`Missing or invalid benchmark timing for emitter ${name}`);
    }
  }
}

/** A separate pipe keeps emitter/generator logs out of the structured result. */
export async function compileSpec(
  specDir: string,
  workerPath = compileOncePath,
  mode: CompilationMode = { kind: "compiler" },
): Promise<Stats> {
  return runWorker(specDir, [workerPath, specDir, JSON.stringify(mode)], (stats: Stats) => {
    if (!Number.isFinite(stats.runtime.total) || !stats.complexity) {
      throw new Error("Missing runtime or complexity metrics");
    }
    validateEmitterStats(stats, Object.keys(stats.runtime.emit.emitters));
  });
}

/** Warmups, measurements and noise retries share one isolated compiler process. */
export function measureCompiler(
  specDir: string,
  plan: BenchmarkPlan,
  workload: Workload,
  workerPath = measureCompilerPath,
): Promise<BenchmarkShard> {
  return runWorker(
    specDir,
    ["--expose-gc", workerPath, specDir, JSON.stringify({ plan, workload })],
    (shard: BenchmarkShard) => {
      if (
        shard.planId !== plan.id ||
        shard.workloadId !== workload.id ||
        shard.rawIterations.length < plan.compiler.iterations
      ) {
        throw new Error("Invalid compiler workload result");
      }
    },
  );
}

function runWorker<T>(specDir: string, args: string[], validate: (result: T) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      stdio: ["ignore", "pipe", "pipe", "pipe"],
    });
    let output = "";
    let logs = "";
    child.stdout!.on("data", (chunk) => {
      logs += chunk.toString();
      process.stderr.write(chunk);
    });
    child.stderr!.on("data", (chunk) => {
      logs += chunk.toString();
      process.stderr.write(chunk);
    });
    child.stdio[3]!.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (code !== 0) {
        reject(
          new Error(
            `Compilation failed for ${specDir} (exit ${code}, signal ${signal}):\n${logs.trim()}`,
          ),
        );
        return;
      }
      try {
        const result: T = JSON.parse(output);
        validate(result);
        resolve(result);
      } catch (error) {
        reject(
          new Error(`Invalid benchmark stats for ${specDir}:\n${logs.trim()}`, { cause: error }),
        );
      }
    });
  });
}
