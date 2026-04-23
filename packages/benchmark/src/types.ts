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
}

/** Complete benchmark result set. */
export interface BenchmarkResult {
  /** Git commit SHA that was benchmarked. */
  commit: string;
  /** ISO 8601 timestamp of when the benchmark was run. */
  timestamp: string;
  /** Runner environment info. */
  runner: RunnerInfo;
  /** Per-spec benchmark results, keyed by spec name. */
  specs: Record<string, SpecBenchmarkResult>;
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
