import type { ComparisonResult, MetricComparison } from "./types.js";

const DEFAULT_THRESHOLD = 5;

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${ms.toFixed(1)}ms`;
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

/** Whether a metric is a "top-level" metric (not a nested sub-metric). */
function isTopLevel(label: string): boolean {
  const parts = label.split("/");
  // Top-level: "total", "loader", "checker", "resolver", "validation", "linter", "emit"
  // Also top-level emitter entries: "emit/@azure-tools/typespec-autorest"
  return parts.length <= 1 || (parts[0] === "emit" && parts.length === 2);
}

export interface FormatOptions {
  /** Change threshold for highlighting (default: 5%). */
  threshold?: number;
  /** Show all metrics, not just top-level ones. */
  detailed?: boolean;
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
  const detailed = options.detailed ?? false;
  const changesOnly = options.changesOnly ?? false;

  const lines: string[] = [];
  lines.push("## ⚡ Benchmark Results\n");
  lines.push(
    `Comparing [\`${currentCommit.slice(0, 7)}\`] against baseline [\`${baselineCommit.slice(0, 7)}\`]\n`,
  );

  for (const comp of comparisons) {
    lines.push(`### ${comp.specName}\n`);

    // Complexity
    lines.push(
      `> Types: ${comp.complexity.createdTypes.current} created (was ${comp.complexity.createdTypes.baseline}), ${comp.complexity.finishedTypes.current} finished (was ${comp.complexity.finishedTypes.baseline})\n`,
    );

    let metrics: MetricComparison[] = comp.metrics;
    if (!detailed) {
      metrics = metrics.filter((m) => isTopLevel(m.label));
    }
    if (changesOnly) {
      metrics = metrics.filter((m) => Math.abs(m.percentChange) >= threshold);
    }

    if (metrics.length === 0) {
      lines.push("_No notable changes._\n");
      continue;
    }

    lines.push("| Metric | Baseline | Current | Change |");
    lines.push("|--------|----------|---------|--------|");

    for (const m of metrics) {
      const indicator = changeIndicator(m.percentChange, threshold);
      const changeStr = `${formatPercent(m.percentChange)} ${indicator}`.trim();
      lines.push(
        `| ${m.label} | ${formatMs(m.baseline)} | ${formatMs(m.current)} | ${changeStr} |`,
      );
    }

    lines.push("");
  }

  lines.push(
    `> Threshold: changes > ±${threshold}% are highlighted. Run with \`--detailed\` for per-rule breakdown.`,
  );

  return lines.join("\n");
}

/** Format comparison as a brief console summary. */
export function formatConsoleSummary(
  comparisons: ComparisonResult[],
  threshold: number = DEFAULT_THRESHOLD,
): string {
  const lines: string[] = [];

  for (const comp of comparisons) {
    lines.push(`\n${comp.specName}:`);

    const topLevel = comp.metrics.filter((m) => isTopLevel(m.label));
    for (const m of topLevel) {
      const indicator = changeIndicator(m.percentChange, threshold);
      lines.push(
        `  ${m.label.padEnd(30)} ${formatMs(m.baseline).padStart(10)} → ${formatMs(m.current).padStart(10)}  ${formatPercent(m.percentChange).padStart(8)} ${indicator}`,
      );
    }
  }

  return lines.join("\n");
}
