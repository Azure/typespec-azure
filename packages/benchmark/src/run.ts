import { compile, NodeHost, resolveCompilerOptions } from "@typespec/compiler";
import { execSync } from "child_process";
import { readdir } from "fs/promises";
import os from "os";
import { join, resolve } from "path";
import type {
  BenchmarkResult,
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
}

/** Discover benchmark spec directories under the given path. */
async function discoverSpecs(specsDir: string, filter?: string[]): Promise<string[]> {
  const entries = await readdir(specsDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  if (filter && filter.length > 0) {
    return dirs.filter((d) => filter.includes(d));
  }
  return dirs;
}

/** Compile a single spec and return its stats. */
async function compileSpec(specDir: string): Promise<Stats> {
  const mainFile = join(specDir, "main.tsp");
  const [options, diagnostics] = await resolveCompilerOptions(NodeHost, {
    entrypoint: mainFile,
    cwd: specDir,
  });
  if (diagnostics.length > 0) {
    const msgs = diagnostics.map((d) => `  ${d.message}`).join("\n");
    console.warn(`  Warnings resolving options for ${specDir}:\n${msgs}`);
  }

  const program = await compile(NodeHost, mainFile, {
    ...options,
    outputDir: join(specDir, "tsp-output"),
  });

  if (program.hasError()) {
    const errorDiags = program.diagnostics
      .filter((d) => d.severity === "error")
      .map((d) => `  ${d.message}`)
      .join("\n");
    throw new Error(`Compilation failed for ${specDir}:\n${errorDiags}`);
  }

  // program.stats is @internal but available at runtime
  const stats = (program as any).stats as Stats;

  // The compiler doesn't always set runtime.total — compute it from parts
  if (!stats.runtime.total) {
    stats.runtime.total =
      (stats.runtime.loader ?? 0) +
      (stats.runtime.resolver ?? 0) +
      (stats.runtime.checker ?? 0) +
      (stats.runtime.validation?.total ?? 0) +
      (stats.runtime.linter?.total ?? 0) +
      (stats.runtime.emit?.total ?? 0);
  }

  return stats;
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
  const n = runtimes.length;
  const avg = (accessor: (r: RuntimeStats) => number) =>
    runtimes.reduce((s, r) => s + accessor(r), 0) / n;

  // Average validation
  const validatorKeys = new Set<string>();
  for (const r of runtimes) {
    for (const k of Object.keys(r.validation.validators)) {
      validatorKeys.add(k);
    }
  }
  const validators: Record<string, number> = {};
  for (const k of validatorKeys) {
    validators[k] = runtimes.reduce((s, r) => s + (r.validation.validators[k] ?? 0), 0) / n;
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
    rules[k] = runtimes.reduce((s, r) => s + (r.linter.rules[k] ?? 0), 0) / n;
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
      steps[k] = runtimes.reduce((s, r) => s + (r.emit.emitters[name]?.steps[k] ?? 0), 0) / n;
    }
    emitters[name] = {
      total: runtimes.reduce((s, r) => s + (r.emit.emitters[name]?.total ?? 0), 0) / n,
      steps,
    };
  }

  return {
    total: avg((r) => r.total),
    loader: avg((r) => r.loader),
    resolver: avg((r) => r.resolver),
    checker: avg((r) => r.checker),
    validation: {
      total: avg((r) => r.validation.total),
      validators,
    },
    linter: {
      total: avg((r) => r.linter.total),
      rules,
    },
    emit: {
      total: avg((r) => r.emit.total),
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

    specs[specName] = {
      name: specName,
      iterations,
      stats: averageStats(rawIterations),
      rawIterations,
    };

    console.log(`    Total: ${specs[specName].stats.runtime.total.toFixed(1)}ms (avg)`);
  }

  const commit = getGitCommit(options.commit);

  return {
    commit,
    timestamp: new Date().toISOString(),
    runner: getRunnerInfo(),
    specs,
  };
}
