import type {
  ChartPoint,
  HistoryData,
  HistoryEntry,
  MetricRow,
  MetricView,
  TimeRange,
} from "./types.js";

// ─── Label helpers ────────────────────────────────────────────────────────────

/** Strip common prefixes so legends and tables stay narrow. */
export function shortLabel(label: string): string {
  return label
    .replace(/^linter\//, "")
    .replace(/^validation\//, "")
    .replace(/^emit\//, "")
    .replace(/@azure-tools\/typespec-azure-core\//, "azure-core/")
    .replace(/@azure-tools\/typespec-azure-resource-manager\//, "arm/")
    .replace(/@azure-tools\/typespec-autorest/, "autorest")
    .replace(/@typespec\/openapi3/, "openapi3")
    .replace(/@typespec\//, "");
}

/** Discover emitter names from labels of the form `emit/<emitter-name>`. */
export function getEmitterNames(labels: string[]): string[] {
  const names = new Set<string>();
  for (const label of labels) {
    if (!label.startsWith("emit/")) continue;
    const parts = label.slice("emit/".length).split("/");
    if (parts[0].startsWith("@") && parts.length >= 2) {
      names.add(`${parts[0]}/${parts[1]}`);
    } else if (parts.length >= 1) {
      names.add(parts[0]);
    }
  }
  return [...names].sort();
}

/** Does this emitter report a per-step breakdown? */
export function emitterHasSteps(labels: string[], emitterName: string): boolean {
  const prefix = `emit/${emitterName}/`;
  return labels.some((l) => l.startsWith(prefix));
}

/**
 * The compilation stages, in pipeline order.
 *
 * `emit` is deliberately excluded: emitters run an order of magnitude longer
 * than the compile stages, so charting them together flattens everything else,
 * and `total` does not include emit time, which would make a share column
 * exceed 100%. Emitters have their own tab.
 */
export const STAGE_LABELS = ["total", "loader", "resolver", "checker", "validation", "linter"];

/** Stages plus emit, surfaced as headline numbers where scale does not matter. */
export const SUMMARY_LABELS = [...STAGE_LABELS, "emit"];

/** Roll-up metrics, excluded from change detection so their parts rank instead. */
const AGGREGATE_LABELS = new Set(SUMMARY_LABELS);

/** Is this metric an aggregate rather than an individual measurement? */
export function isAggregate(label: string): boolean {
  return AGGREGATE_LABELS.has(label);
}

// ─── Building the filtered view ───────────────────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000;

function withinRange(entries: HistoryEntry[], range: TimeRange): HistoryEntry[] {
  if (range === "all") return entries;
  const days = range === "30d" ? 30 : 90;
  const cutoff = Date.now() - days * DAY_MS;
  return entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
}

/** Read the metric bag a spec selection refers to. `all` means the averaged bag. */
function metricsFor(entry: HistoryEntry, spec: string): Record<string, number> {
  if (spec === "all") return entry.metrics;
  return entry.specMetrics?.[spec] ?? {};
}

/**
 * Reduce the history to the current spec + time filters.
 *
 * Both the in-repo baseline and the Azure services corpus share the same
 * `HistoryData` shape, so they produce the same `MetricView` and every
 * downstream component works on either without branching.
 */
export function buildMetricView(data: HistoryData, spec: string, range: TimeRange): MetricView {
  const entries = withinRange(data.entries, range);
  const points: ChartPoint[] = entries.map((e) => ({ commit: e.commit, timestamp: e.timestamp }));

  const labels = new Set<string>();
  for (const entry of entries) {
    for (const label of Object.keys(metricsFor(entry, spec))) labels.add(label);
  }

  const values: Record<string, (number | null)[]> = {};
  for (const label of labels) {
    values[label] = entries.map((e) => metricsFor(e, spec)[label] ?? null);
  }

  return {
    generated: data.generated,
    labels: [...labels].sort(),
    points,
    values,
  };
}

/**
 * Reduce the history to a single metric compared across every spec, so one
 * chart can answer "which spec is slowest for this emitter?".
 */
export function buildComparisonView(
  data: HistoryData,
  metricKey: string,
  specNames: string[],
  range: TimeRange,
): MetricView {
  const entries = withinRange(data.entries, range);
  const points: ChartPoint[] = entries.map((e) => ({ commit: e.commit, timestamp: e.timestamp }));

  const values: Record<string, (number | null)[]> = {};
  for (const spec of specNames) {
    values[spec] = entries.map((e) => e.specMetrics?.[spec]?.[metricKey] ?? null);
  }

  return { generated: data.generated, labels: [...specNames], points, values };
}

/** All spec names present in the data, whether or not the file lists them. */
export function collectSpecNames(data: HistoryData): string[] {
  if (data.specNames && data.specNames.length > 0) return data.specNames;
  const names = new Set<string>();
  for (const entry of data.entries) {
    for (const name of Object.keys(entry.specMetrics ?? {})) names.add(name);
  }
  return [...names].sort();
}

// ─── Statistics ───────────────────────────────────────────────────────────────

/** Median of the given samples, or null when there are none. */
export function median(samples: number[]): number | null {
  if (samples.length === 0) return null;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Days of history used as the comparison baseline for a metric. */
export const BASELINE_DAYS = 7;

/** Minimum number of samples before the baseline window is widened. */
const MIN_BASELINE_SAMPLES = 3;

/** Fallback sample count when the trailing window is too sparse. */
const FALLBACK_BASELINE_SAMPLES = 10;

/**
 * Median of the runs preceding the latest one.
 *
 * Comparing against the immediately previous commit made every number swing on
 * run-to-run jitter, so the baseline is a median over a trailing window
 * instead. If that window is too sparse to be meaningful it widens to a fixed
 * number of preceding runs.
 */
export function trailingBaseline(values: (number | null)[], points: ChartPoint[]): number | null {
  if (values.length < 2) return null;

  const latestTime = new Date(points[points.length - 1].timestamp).getTime();
  const cutoff = latestTime - BASELINE_DAYS * DAY_MS;

  const windowed: number[] = [];
  for (let i = 0; i < values.length - 1; i++) {
    const value = values[i];
    if (value === null) continue;
    if (new Date(points[i].timestamp).getTime() >= cutoff) windowed.push(value);
  }
  if (windowed.length >= MIN_BASELINE_SAMPLES) return median(windowed);

  const recent: number[] = [];
  for (let i = values.length - 2; i >= 0 && recent.length < FALLBACK_BASELINE_SAMPLES; i--) {
    const value = values[i];
    if (value !== null) recent.push(value);
  }
  return median(recent);
}

/** Last non-null value in a column. */
export function latestValue(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i] !== null) return values[i];
  }
  return null;
}

/**
 * Summarize metrics for the table, cards and change panel.
 *
 * `parentKey` turns on the share column, expressing each row as a fraction of
 * its aggregate (for example each linter rule as a share of total lint time).
 */
export function buildRows(view: MetricView, keys: string[], parentKey?: string): MetricRow[] {
  const parentLatest = parentKey ? latestValue(view.values[parentKey] ?? []) : null;

  return keys.map((key) => {
    const values = view.values[key] ?? [];
    const latest = latestValue(values);
    const baseline = trailingBaseline(values, view.points);
    const delta = latest !== null && baseline !== null ? latest - baseline : null;
    const deltaRatio = delta !== null && baseline ? delta / baseline : null;
    // The aggregate itself is not a share of anything.
    const share =
      key !== parentKey && latest !== null && parentLatest !== null && parentLatest > 0
        ? latest / parentLatest
        : null;

    return { key, name: shortLabel(key), latest, baseline, delta, deltaRatio, share, values };
  });
}

/** Rank rows by latest value, slowest first. */
export function bySlowest(rows: MetricRow[]): MetricRow[] {
  return [...rows].sort((a, b) => (b.latest ?? -1) - (a.latest ?? -1));
}

/** Movements smaller than this (in ms) are treated as measurement noise. */
export const NOISE_FLOOR_MS = 0.5;

/** Movements smaller than this (as a fraction) are treated as measurement noise. */
export const NOISE_FLOOR_RATIO = 0.05;

export interface Changes {
  regressions: MetricRow[];
  improvements: MetricRow[];
}

/**
 * Split rows into meaningful regressions and improvements.
 *
 * A movement has to clear both an absolute and a relative floor to show up:
 * sub-millisecond rules swing by large percentages, and big aggregates drift by
 * a millisecond or two, and neither is worth reporting.
 */
export function detectChanges(rows: MetricRow[], limit = 5): Changes {
  const significant = rows.filter(
    (row) =>
      row.delta !== null &&
      row.deltaRatio !== null &&
      Math.abs(row.delta) >= NOISE_FLOOR_MS &&
      Math.abs(row.deltaRatio) >= NOISE_FLOOR_RATIO,
  );

  const regressions = significant
    .filter((r) => r.delta! > 0)
    .sort((a, b) => b.delta! - a.delta!)
    .slice(0, limit);

  const improvements = significant
    .filter((r) => r.delta! < 0)
    .sort((a, b) => a.delta! - b.delta!)
    .slice(0, limit);

  return { regressions, improvements };
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Format a duration with a precision that suits its magnitude. */
export function formatMs(value: number | null): string {
  if (value === null) return "—";
  if (value >= 100) return `${value.toFixed(0)} ms`;
  if (value >= 1) return `${value.toFixed(1)} ms`;
  return `${value.toFixed(2)} ms`;
}

/** Signed percentage, using a true minus sign to match the ms column. */
export function formatPercent(ratio: number | null): string {
  if (ratio === null) return "—";
  const percent = ratio * 100;
  const sign = percent > 0 ? "+" : percent < 0 ? "−" : "";
  return `${sign}${Math.abs(percent).toFixed(1)}%`;
}

export function formatShare(ratio: number | null): string {
  if (ratio === null) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatDate(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
