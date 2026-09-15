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
  /** Number of measured iterations (excluding warmup). */
  iterations: number;
  /** Averaged stats across measured iterations. */
  stats: Stats;
  /** Per-iteration raw stats. */
  rawIterations: Stats[];
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
  /**
   * ISO 8601 date the benchmarked commit landed.
   *
   * Distinct from `timestamp`: a backfill measures months of history in an
   * afternoon, so measurement time says nothing about where a point belongs on
   * a timeline. Absent when the commit could not be resolved.
   */
  commitDate?: string;
  /** Runner environment info. */
  runner: RunnerInfo;
  /**
   * Speed of this machine against a frozen reference workload, used to make
   * points measured on different runners comparable. Absent when calibration
   * could not run, and on points measured before calibration existed.
   */
  calibration?: CalibrationInfo;
  /** Per-spec benchmark results, keyed by spec name. */
  specs: Record<string, SpecBenchmarkResult>;
}

export interface RunnerInfo {
  os: string;
  nodeVersion: string;
  arch: string;
  /** CPU model, which varies between CI runners and drives most of the spread. */
  cpu?: string;
  /** Logical core count. */
  cores?: number;
}

/** Measurement of a frozen reference workload, used to normalize away machine speed. */
export interface CalibrationInfo {
  /** Pinned compiler release the reference was compiled with. */
  compilerVersion: string;
  /** Identifier of the frozen workload; changes invalidate cross-version comparison. */
  workload: string;
  /** Median reference compile time in ms on this machine. */
  total: number;
  /** Number of measured reference compiles. */
  iterations: number;
  /** Coefficient of variation across those compiles. */
  cv: number;
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
