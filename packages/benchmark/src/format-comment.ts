import type { BenchmarkResult, ComparisonResult, MetricComparison, RuntimeStats } from "./types.js";

const DEFAULT_THRESHOLD = 5;

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
}

/** Color-code a time value based on thresholds: 🔴 slow, 🟡 moderate, 🟢 fast. */
function timeIndicator(ms: number, thresholds: readonly [number, number]): string {
  if (ms > thresholds[1]) return "🔴";
  if (ms > thresholds[0]) return "🟡";
  return "🟢";
}

/** Thresholds [yellow, red] aligned with the compiler's `--stats` output. */
const Thresholds = {
  stage: [200, 400] as const,
  lintRule: [10, 20] as const,
  validator: [10, 20] as const,
};

/** Pick the right threshold based on metric label. */
function thresholdsFor(label: string): readonly [number, number] {
  if (label.startsWith("linter/")) return Thresholds.lintRule;
  if (label.startsWith("validation/")) return Thresholds.validator;
  return Thresholds.stage;
}

function formatMsColored(ms: number, thresholds: readonly [number, number]): string {
  return `${timeIndicator(ms, thresholds)} ${formatMs(ms)}`;
}

function changeIndicator(percentChange: number, threshold: number): string {
  if (percentChange >= threshold) return "🔴";
  if (percentChange <= -threshold) return "🟢";
  return "";
}

function formatPercent(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

// ── Metric flattening helpers ──────────────────────────────────────────────

interface FlatMetric {
  label: string;
  value: number;
}

/** Extract a flat list of labelled metrics from RuntimeStats. */
function flattenRuntime(rt: RuntimeStats): FlatMetric[] {
  const metrics: FlatMetric[] = [];

  metrics.push({ label: "total", value: rt.total });
  metrics.push({ label: "loader", value: rt.loader });
  metrics.push({ label: "resolver", value: rt.resolver });
  metrics.push({ label: "checker", value: rt.checker });

  metrics.push({ label: "validation", value: rt.validation.total });
  for (const [v, t] of Object.entries(rt.validation.validators).sort(([, a], [, b]) => b - a)) {
    metrics.push({ label: `validation/${v}`, value: t });
  }

  metrics.push({ label: "linter", value: rt.linter.total });
  for (const [r, t] of Object.entries(rt.linter.rules).sort(([, a], [, b]) => b - a)) {
    metrics.push({ label: `linter/${r}`, value: t });
  }

  metrics.push({ label: "emit", value: rt.emit.total });
  for (const [e, data] of Object.entries(rt.emit.emitters).sort(
    ([, a], [, b]) => b.total - a.total,
  )) {
    metrics.push({ label: `emit/${e}`, value: data.total });
  }

  return metrics;
}

/** Sort key to group metrics by category: stages first, then sub-metrics under their parent. */
function metricSortKey(label: string): string {
  const categoryOrder: Record<string, string> = {
    total: "0",
    loader: "1",
    resolver: "2",
    checker: "3",
    validation: "4",
    linter: "5",
    emit: "6",
  };

  const parts = label.split("/");
  const category = parts[0];
  const prefix = categoryOrder[category] ?? "9";
  // Parent categories sort before their children, children sort alphabetically
  if (parts.length === 1) return `${prefix}`;
  return `${prefix}/${parts.slice(1).join("/")}`;
}

/** Average flat metrics across multiple specs. Metrics are matched by label. */
function averageFlatMetrics(specMetrics: FlatMetric[][]): FlatMetric[] {
  const sums = new Map<string, { total: number; count: number }>();

  for (const metrics of specMetrics) {
    for (const m of metrics) {
      const entry = sums.get(m.label);
      if (entry) {
        entry.total += m.value;
        entry.count++;
      } else {
        sums.set(m.label, { total: m.value, count: 1 });
      }
    }
  }

  return [...sums.entries()]
    .sort(([a], [b]) => metricSortKey(a).localeCompare(metricSortKey(b)))
    .map(([label, entry]) => ({ label, value: entry.total / entry.count }));
}

/** Whether a metric is a sub-metric (indented in the table). */
function isSubMetric(label: string): boolean {
  return (
    label.startsWith("linter/") ||
    label.startsWith("validation/") ||
    (label.startsWith("emit/") && label !== "emit")
  );
}

/** Format a metric label for display, indenting sub-metrics. */
function displayLabel(label: string): string {
  if (label === "total") return "**total**";
  // cspell:ignore ensp
  if (isSubMetric(label)) return `&ensp;↳ ${label}`;
  return label;
}

const LEGEND =
  "> 🟢 Fast · 🟡 Moderate (stages >200ms, rules >10ms) · 🔴 Slow (stages >400ms, rules >20ms)";

// ── Public formatters ──────────────────────────────────────────────────────

export interface FormatOptions {
  /** Change threshold for highlighting (default: 5%). */
  threshold?: number;
  /** Only show metrics with notable changes. */
  changesOnly?: boolean;
}

/** Format comparison results as a GitHub PR comment markdown. */
export function formatPrComment(
  comparisons: ComparisonResult[],
  baselineCommit: string,
  currentCommit: string,
  options: FormatOptions = {},
): string {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const changesOnly = options.changesOnly ?? false;

  const lines: string[] = [];
  lines.push("## ⚡ Benchmark Results\n");
  lines.push(
    `Comparing [\`${currentCommit.slice(0, 7)}\`] against baseline [\`${baselineCommit.slice(0, 7)}\`]\n`,
  );

  // Average metrics across all specs
  const averaged = averageComparisonMetrics(comparisons);

  let metrics = averaged;
  if (changesOnly) {
    metrics = metrics.filter((m) => Math.abs(m.percentChange) >= threshold);
  }

  if (metrics.length === 0) {
    lines.push("_No notable changes._\n");
  } else {
    lines.push("| Metric | Baseline | Current | Change |");
    lines.push("|--------|----------|---------|--------|");
    for (const m of metrics) {
      const indicator = changeIndicator(m.percentChange, threshold);
      const changeStr = `${formatPercent(m.percentChange)} ${indicator}`.trim();
      const th = thresholdsFor(m.label);
      lines.push(
        `| ${displayLabel(m.label)} | ${formatMsColored(m.baseline, th)} | ${formatMsColored(m.current, th)} | ${changeStr} |`,
      );
    }
    lines.push("");
  }

  const specNames = comparisons.map((c) => c.specName).join(", ");
  lines.push(`> Averaged across ${comparisons.length} specs (${specNames}).`);
  lines.push(`> Threshold: changes > ±${threshold}% are highlighted.`);

  return lines.join("\n");
}

/** Average MetricComparisons across all ComparisonResults by label. */
function averageComparisonMetrics(comparisons: ComparisonResult[]): MetricComparison[] {
  const sums = new Map<
    string,
    { baseline: number; current: number; change: number; count: number }
  >();

  for (const comp of comparisons) {
    for (const m of comp.metrics) {
      const entry = sums.get(m.label);
      if (entry) {
        entry.baseline += m.baseline;
        entry.current += m.current;
        entry.change += m.change;
        entry.count++;
      } else {
        sums.set(m.label, {
          baseline: m.baseline,
          current: m.current,
          change: m.change,
          count: 1,
        });
      }
    }
  }

  return [...sums.entries()]
    .sort(([a], [b]) => metricSortKey(a).localeCompare(metricSortKey(b)))
    .map(([label, e]) => {
      const baseline = e.baseline / e.count;
      const current = e.current / e.count;
      const change = e.change / e.count;
      const percentChange = baseline === 0 ? (current === 0 ? 0 : 100) : (change / baseline) * 100;
      return { label, baseline, current, change, percentChange };
    });
}

/** Format comparison as a brief console summary. */
export function formatConsoleSummary(
  comparisons: ComparisonResult[],
  threshold: number = DEFAULT_THRESHOLD,
): string {
  const lines: string[] = [];
  const averaged = averageComparisonMetrics(comparisons);

  lines.push("\nBenchmark comparison (averaged across specs):");
  for (const m of averaged) {
    const indicator = changeIndicator(m.percentChange, threshold);
    const label = isSubMetric(m.label) ? `  ${m.label}` : m.label;
    lines.push(
      `  ${label.padEnd(50)} ${formatMs(m.baseline).padStart(10)} → ${formatMs(m.current).padStart(10)}  ${formatPercent(m.percentChange).padStart(8)} ${indicator}`,
    );
  }

  return lines.join("\n");
}

/** Format a standalone benchmark run as a GitHub Actions Job Summary. */
export function formatRunSummary(result: BenchmarkResult): string {
  const lines: string[] = [];
  lines.push("## ⚡ Benchmark Results\n");
  lines.push(`**Commit:** \`${result.commit.slice(0, 7)}\`  `);
  lines.push(`**Date:** ${result.timestamp}  `);
  lines.push(
    `**Runner:** ${result.runner.os}, Node ${result.runner.nodeVersion}, ${result.runner.arch}\n`,
  );

  const specs = Object.values(result.specs);
  const specNames = Object.keys(result.specs);
  const allFlat = specs.map((s) => flattenRuntime(s.stats.runtime));
  const averaged = averageFlatMetrics(allFlat);

  lines.push("| Metric | Avg Time |");
  lines.push("|--------|----------|");

  for (const m of averaged) {
    const th = thresholdsFor(m.label);
    const label = displayLabel(m.label);
    const time = formatMsColored(m.value, th);
    if (m.label === "total") {
      lines.push(`| ${label} | **${time}** |`);
    } else {
      lines.push(`| ${label} | ${time} |`);
    }
  }

  lines.push("");
  lines.push(`> Averaged across ${specs.length} specs (${specNames.join(", ")}).`);
  lines.push(LEGEND);

  return lines.join("\n");
}

/** Format a comparison as a GitHub Actions Job Summary. */
export function formatComparisonSummary(
  comparisons: ComparisonResult[],
  baselineCommit: string,
  currentCommit: string,
  threshold: number = DEFAULT_THRESHOLD,
): string {
  const lines: string[] = [];
  lines.push("## ⚡ Benchmark Comparison\n");
  lines.push(
    `Comparing [\`${currentCommit.slice(0, 7)}\`] against baseline [\`${baselineCommit.slice(0, 7)}\`]\n`,
  );

  const averaged = averageComparisonMetrics(comparisons);

  lines.push("| Metric | Baseline | Current | Change |");
  lines.push("|--------|----------|---------|--------|");
  for (const m of averaged) {
    const indicator = changeIndicator(m.percentChange, threshold);
    const changeStr = `${formatPercent(m.percentChange)} ${indicator}`.trim();
    const th = thresholdsFor(m.label);
    lines.push(
      `| ${displayLabel(m.label)} | ${formatMsColored(m.baseline, th)} | ${formatMsColored(m.current, th)} | ${changeStr} |`,
    );
  }
  lines.push("");

  const specNames = comparisons.map((c) => c.specName).join(", ");
  lines.push(`> Averaged across ${comparisons.length} specs (${specNames}).`);
  lines.push(`> Threshold: changes > ±${threshold}% are highlighted.`);
  lines.push(LEGEND);

  return lines.join("\n");
}
