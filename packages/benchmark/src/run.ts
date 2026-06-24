/* eslint-disable no-console */
import { execSync, spawn } from "child_process";
import { readdir } from "fs/promises";
import os from "os";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { aggregateDurations } from "./aggregate.js";
import { summarize } from "./statistics.js";
import type {
  BenchmarkResult,
  NoiseGateInfo,
  RunnerInfo,
  RuntimeStats,
  SpecBenchmarkResult,
  Stats,
} from "./types.js";

const DEFAULT_ITERATIONS = 5;
const DEFAULT_WARMUP = 1;

export interface RunOptions {
  /** Directory containing benchmark specs (subdirectories). */
  specsDir: string;
  /** Number of measured iterations per spec. */
  iterations?: number;
  /** Number of warmup iterations. */
  warmup?: number;
  /** Specific spec names to run (if empty, runs all). */
  specs?: string[];
  /** Git commit SHA to record. */
  commit?: string;
  /** If set, rerun a spec when total-runtime coefficient of variation exceeds threshold. */
  noiseCvThreshold?: number;
  /** Max number of rerun cycles for noisy specs. */
  maxReruns?: number;
  /** Number of additional measured iterations on each rerun (default: iterations). */
  rerunIterations?: number;
}

/** Discover benchmark spec directories under the given path. */
async function discoverSpecs(specsDir: string, filter?: string[]): Promise<string[]> {
  const entries = await readdir(specsDir, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
  if (filter && filter.length > 0) {
    return dirs.filter((d) => filter.includes(d));
  }
  return dirs;
}

const compileOncePath = fileURLToPath(new URL("./compile-once.js", import.meta.url));

/** Compile a single spec in an isolated process and return its stats. */
async function compileSpec(specDir: string): Promise<Stats> {
  return await new Promise<Stats>((resolveResult, reject) => {
    const child = spawn(process.execPath, [compileOncePath, specDir], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Compilation process exited with code ${code}`));
        return;
      }
      try {
        resolveResult(JSON.parse(stdout) as Stats);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse benchmark stats output: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
      }
    });
  });
}

/** Average multiple Stats objects. */
function averageStats(statsList: Stats[]): Stats {
  const n = statsList.length;
  if (n === 0) throw new Error("No stats to average");
  if (n === 1) return statsList[0];

  const avgRuntime = averageRuntimeStats(statsList.map((s) => s.runtime));

  return {
    complexity: {
      createdTypes: Math.round(statsList.reduce((s, x) => s + x.complexity.createdTypes, 0) / n),
      finishedTypes: Math.round(statsList.reduce((s, x) => s + x.complexity.finishedTypes, 0) / n),
    },
    runtime: avgRuntime,
  };
}

function averageRuntimeStats(runtimes: RuntimeStats[]): RuntimeStats {
  const aggregate = (accessor: (r: RuntimeStats) => number) =>
    aggregateDurations(runtimes.map((r) => accessor(r)));

  // Average validation
  const validatorKeys = new Set<string>();
  for (const r of runtimes) {
    for (const k of Object.keys(r.validation.validators)) {
      validatorKeys.add(k);
    }
  }
  const validators: Record<string, number> = {};
  for (const k of validatorKeys) {
    validators[k] = aggregateDurations(runtimes.map((r) => r.validation.validators[k] ?? 0));
  }

  // Average linter rules
  const ruleKeys = new Set<string>();
  for (const r of runtimes) {
    for (const k of Object.keys(r.linter.rules)) {
      ruleKeys.add(k);
    }
  }
  const rules: Record<string, number> = {};
  for (const k of ruleKeys) {
    rules[k] = aggregateDurations(runtimes.map((r) => r.linter.rules[k] ?? 0));
  }

  // Average emitters
  const emitterNames = new Set<string>();
  for (const r of runtimes) {
    for (const k of Object.keys(r.emit.emitters)) {
      emitterNames.add(k);
    }
  }
  const emitters: RuntimeStats["emit"]["emitters"] = {};
  for (const name of emitterNames) {
    const stepKeys = new Set<string>();
    for (const r of runtimes) {
      const em = r.emit.emitters[name];
      if (em) {
        for (const k of Object.keys(em.steps)) {
          stepKeys.add(k);
        }
      }
    }
    const steps: Record<string, number> = {};
    for (const k of stepKeys) {
      steps[k] = aggregateDurations(runtimes.map((r) => r.emit.emitters[name]?.steps[k] ?? 0));
    }
    emitters[name] = {
      total: aggregateDurations(runtimes.map((r) => r.emit.emitters[name]?.total ?? 0)),
      steps,
    };
  }

  return {
    total: aggregate((r) => r.total),
    loader: aggregate((r) => r.loader),
    resolver: aggregate((r) => r.resolver),
    checker: aggregate((r) => r.checker),
    validation: {
      total: aggregate((r) => r.validation.total),
      validators,
    },
    linter: {
      total: aggregate((r) => r.linter.total),
      rules,
    },
    emit: {
      total: aggregate((r) => r.emit.total),
      emitters,
    },
  };
}

function getRunnerInfo(): RunnerInfo {
  return {
    os: `${os.platform()}-${os.release()}`,
    nodeVersion: process.version,
    arch: os.arch(),
  };
}

function getGitCommit(providedCommit?: string): string {
  if (providedCommit) return providedCommit;
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

/** Run benchmarks for all discovered specs. */
export async function runBenchmarks(options: RunOptions): Promise<BenchmarkResult> {
  const specsDir = resolve(options.specsDir);
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const warmup = options.warmup ?? DEFAULT_WARMUP;

  const specNames = await discoverSpecs(specsDir, options.specs);
  if (specNames.length === 0) {
    throw new Error(`No benchmark specs found in ${specsDir}`);
  }

  console.log(
    `Running benchmarks: ${specNames.length} spec(s), ${warmup} warmup + ${iterations} iterations each`,
  );

  const specs: Record<string, SpecBenchmarkResult> = {};
  const noiseCvThreshold = options.noiseCvThreshold;
  const maxReruns = options.maxReruns ?? 0;
  const rerunIterations = options.rerunIterations ?? iterations;

  for (const specName of specNames) {
    const specDir = join(specsDir, specName);
    console.log(`\n  Benchmarking: ${specName}`);

    // Warmup
    for (let i = 0; i < warmup; i++) {
      console.log(`    Warmup ${i + 1}/${warmup}...`);
      await compileSpec(specDir);
    }

    // Measured iterations
    const rawIterations: Stats[] = [];
    for (let i = 0; i < iterations; i++) {
      console.log(`    Iteration ${i + 1}/${iterations}...`);
      const stats = await compileSpec(specDir);
      rawIterations.push(stats);
    }

    let rerunsPerformed = 0;
    if (noiseCvThreshold !== undefined && maxReruns > 0 && rerunIterations > 0) {
      for (let rerun = 0; rerun < maxReruns; rerun++) {
        const totalSummary = summarize(rawIterations.map((x) => x.runtime.total));
        if (totalSummary.cv <= noiseCvThreshold) {
          break;
        }

        rerunsPerformed++;
        console.log(
          `    Noise gate triggered (CV ${(totalSummary.cv * 100).toFixed(1)}% > ${(noiseCvThreshold * 100).toFixed(1)}%), running ${rerunIterations} extra iteration(s)...`,
        );
        for (let i = 0; i < rerunIterations; i++) {
          console.log(`    Rerun iteration ${i + 1}/${rerunIterations}...`);
          const stats = await compileSpec(specDir);
          rawIterations.push(stats);
        }
      }
    }

    const totalSummary = summarize(rawIterations.map((x) => x.runtime.total));
    const noiseGateInfo: NoiseGateInfo | undefined =
      noiseCvThreshold === undefined
        ? undefined
        : {
            thresholdCv: noiseCvThreshold,
            maxReruns,
            rerunIterations,
            rerunsPerformed,
            triggered: rerunsPerformed > 0,
          };

    specs[specName] = {
      name: specName,
      iterations: rawIterations.length,
      stats: averageStats(rawIterations),
      rawIterations,
      variability: {
        total: totalSummary,
        noiseGate: noiseGateInfo,
      },
    };

    console.log(
      `    Total: ${specs[specName].stats.runtime.total.toFixed(1)}ms (avg), CV ${(totalSummary.cv * 100).toFixed(1)}%`,
    );
  }

  const commit = getGitCommit(options.commit);

  return {
    commit,
    timestamp: new Date().toISOString(),
    runner: getRunnerInfo(),
    specs,
  };
}
