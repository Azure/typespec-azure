/**
 * Mirror of the compiler's Stats interface.
 * We define our own since the compiler's Stats types are @internal.
 */
export interface Stats {
  complexity: ComplexityStats;
  runtime: RuntimeStats;
}

export interface ComplexityStats {
  createdTypes: number;
  finishedTypes: number;
}

export interface RuntimeStats {
  total: number;
  loader: number;
  resolver: number;
  checker: number;
  validation: {
    total: number;
    validators: Record<string, number>;
  };
  linter: {
    total: number;
    rules: Record<string, number>;
  };
  emit: {
    total: number;
    emitters: Record<
      string,
      {
        total: number;
        steps: Record<string, number>;
      }
    >;
  };
}

export interface MetricVariability {
  mean: number;
  median: number;
  stdDev: number;
  cv: number;
  min: number;
  max: number;
  sampleCount: number;
}

export interface NoiseGateInfo {
  thresholdCv: number;
  maxReruns: number;
  rerunIterations: number;
  rerunsPerformed: number;
  triggered: boolean;
}

/** Benchmark result for a single spec across multiple iterations. */
export interface SpecBenchmarkResult {
  /** The spec name (directory name). */
  name: string;
  /** Number of compiler measurements (all phases in legacy results), excluding warmup. */
  iterations: number;
  /** Averaged stats across measured iterations. */
  stats: Stats;
  /** Compiler-only samples in split mode; legacy samples also contain emission. */
  rawIterations: Stats[];
  /** Independently sampled full-generation emitters in split-mode results. */
  emitterMeasurements?: Record<string, EmitterMeasurement>;
  /** Variability summary for measured iterations. */
  variability?: {
    total: MetricVariability;
    noiseGate?: NoiseGateInfo;
  };
}

/** Complete benchmark result set. */
export interface BenchmarkResult {
  /** Git commit SHA that was benchmarked. */
  commit: string;
  /** ISO 8601 timestamp of when the benchmark was run. */
  timestamp: string;
  /** Runner environment info. */
  runner: RunnerInfo;
  /** Split runs measure compilation and each emitter in separate processes. */
  measurementMode?: "split";
  /** Published C# packages used by this run; absent in older results or non-C# runs. */
  externalEmitterVersions?: Record<string, string>;
  /** Per-spec benchmark results, keyed by spec name. */
  specs: Record<string, SpecBenchmarkResult>;
}

export interface EmitterMeasurement {
  iterations: number;
  warmup: number;
  rawIterations: RuntimeStats["emit"]["emitters"][string][];
  variability: MetricVariability;
  runner: RunnerInfo;
}

export type Workload =
  | { id: string; spec: string; kind: "compiler" }
  | { id: string; spec: string; kind: "emitter"; emitter: string };

export interface BenchmarkSpec {
  name: string;
  /** Path relative to the repository root, portable between CI jobs. */
  dir: string;
  emitters: string[];
}

export interface BenchmarkPlan {
  id: string;
  commit: string;
  specs: BenchmarkSpec[];
  workloads: Workload[];
  compiler: {
    iterations: number;
    warmup: number;
    noiseCvThreshold?: number;
    maxReruns: number;
    rerunIterations: number;
  };
  emitter: { iterations: number; warmup: number };
  externalEmitterVersions?: Record<string, string>;
}

export interface BenchmarkShard {
  planId: string;
  workloadId: string;
  runner: RunnerInfo;
  rawIterations: Stats[];
  warmup: number;
  elapsedMs: number;
  noiseGate?: NoiseGateInfo;
}

export interface RunnerInfo {
  os: string;
  nodeVersion: string;
  arch: string;
}

/** A single metric comparison between baseline and current. */
export interface MetricComparison {
  /** Label for the metric (e.g., "checker", "linter/@azure-tools/typespec-azure-core/auth-required"). */
  label: string;
  /** Baseline value in ms. */
  baseline: number;
  /** Current value in ms. */
  current: number;
  /** Absolute change in ms. */
  change: number;
  /** Percent change (positive = slower). */
  percentChange: number;
}

/** Comparison result between two benchmark runs. */
export interface ComparisonResult {
  /** Spec name. */
  specName: string;
  /** Overall metrics. */
  metrics: MetricComparison[];
  /** Complexity stats comparison. */
  complexity: {
    createdTypes: { baseline: number; current: number };
    finishedTypes: { baseline: number; current: number };
  };
}
