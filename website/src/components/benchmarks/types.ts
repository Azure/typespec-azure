/** Shared types for the benchmark dashboard. */

/** A single benchmark run, as stored on the `benchmark-data` branch. */
export interface HistoryEntry {
  commit: string;
  timestamp: string;
  /** Metrics averaged across every spec in the run. */
  metrics: Record<string, number>;
  /** Per-spec metrics (spec name → flat metrics). */
  specMetrics?: Record<string, Record<string, number>>;
}

/** The `history.json` payload. */
export interface HistoryData {
  generated: string;
  labels: string[];
  specNames?: string[];
  entries: HistoryEntry[];
}

/** Which benchmark corpus is being viewed. */
export type Dataset = "main" | "external";

/** Top level content sections. */
export type Tab = "overview" | "linter" | "validation" | "emitters";

/** Trailing window applied to the history. */
export type TimeRange = "30d" | "90d" | "all";

/** One position on the x axis: the run behind each column of values. */
export interface ChartPoint {
  commit: string;
  timestamp: string;
}

/** A named line, with values aligned to the current `ChartPoint[]`. */
export interface Series {
  /** Raw metric label, used as a stable identity. */
  key: string;
  /** Display name. */
  label: string;
  data: (number | null)[];
  color: string;
}

/**
 * The history reduced to the current filters: a fixed set of x positions plus
 * a column of values per metric label. Every consumer reads from this shape so
 * the two datasets stay on one code path.
 */
export interface MetricView {
  generated: string;
  /** Every metric label present after filtering. */
  labels: string[];
  points: ChartPoint[];
  /** Metric label → values aligned with `points`. */
  values: Record<string, (number | null)[]>;
}

/** A metric summarized for the table, cards and change panel. */
export interface MetricRow {
  /** Raw metric label. */
  key: string;
  /** Display name, prefixes stripped. */
  name: string;
  latest: number | null;
  /** Median over the trailing baseline window, excluding the latest run. */
  baseline: number | null;
  /** `latest - baseline`, in ms. */
  delta: number | null;
  /** `delta / baseline`, as a fraction. */
  deltaRatio: number | null;
  /** Fraction of the parent metric this accounts for, if a parent exists. */
  share: number | null;
  /** Full value column, for the sparkline. */
  values: (number | null)[];
}
