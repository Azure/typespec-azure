import type { BenchmarkResult, ComparisonResult, MetricComparison } from "./types.js";

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

/** Format a standalone benchmark run as a GitHub Actions Job Summary. */
export function formatRunSummary(result: BenchmarkResult): string {
  const lines: string[] = [];
  lines.push("## ⚡ Benchmark Results\n");
  lines.push(`**Commit:** \`${result.commit.slice(0, 7)}\`  `);
  lines.push(`**Date:** ${result.timestamp}  `);
  lines.push(
    `**Runner:** ${result.runner.os}, Node ${result.runner.nodeVersion}, ${result.runner.arch}\n`,
  );

  for (const [specName, spec] of Object.entries(result.specs)) {
    lines.push(`### ${specName}\n`);
    lines.push(
      `> ${spec.iterations} iteration(s) · ${spec.stats.complexity.createdTypes} types created · ${spec.stats.complexity.finishedTypes} types finished\n`,
    );

    lines.push("| Stage | Time |");
    lines.push("|-------|------|");
    lines.push(`| **Total** | **${formatMs(spec.stats.runtime.total)}** |`);
    lines.push(`| Loader | ${formatMs(spec.stats.runtime.loader)} |`);
    lines.push(`| Resolver | ${formatMs(spec.stats.runtime.resolver)} |`);
    lines.push(`| Checker | ${formatMs(spec.stats.runtime.checker)} |`);
    lines.push(`| Validation | ${formatMs(spec.stats.runtime.validation.total)} |`);
    lines.push(`| Linter | ${formatMs(spec.stats.runtime.linter.total)} |`);
    lines.push(`| Emit | ${formatMs(spec.stats.runtime.emit.total)} |`);
    lines.push("");

    // Linter rules detail in a collapsible section
    const ruleEntries = Object.entries(spec.stats.runtime.linter.rules).sort(
      ([, a], [, b]) => b - a,
    );
    if (ruleEntries.length > 0) {
      lines.push("<details>");
      lines.push("<summary>Linter rules breakdown</summary>\n");
      lines.push("| Rule | Time |");
      lines.push("|------|------|");
      for (const [rule, time] of ruleEntries) {
        lines.push(`| ${rule} | ${formatMs(time)} |`);
      }
      lines.push("\n</details>\n");
    }

    // Emitter detail
    const emitterEntries = Object.entries(spec.stats.runtime.emit.emitters).sort(
      ([, a], [, b]) => b.total - a.total,
    );
    if (emitterEntries.length > 0) {
      lines.push("<details>");
      lines.push("<summary>Emitter breakdown</summary>\n");
      lines.push("| Emitter | Time |");
      lines.push("|---------|------|");
      for (const [emitter, data] of emitterEntries) {
        lines.push(`| ${emitter} | ${formatMs(data.total)} |`);
      }
      lines.push("\n</details>\n");
    }
  }

  return lines.join("\n");
}

/** Format a comparison as a GitHub Actions Job Summary (detailed with collapsible sections). */
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

  for (const comp of comparisons) {
    lines.push(`### ${comp.specName}\n`);
    lines.push(
      `> Types: ${comp.complexity.createdTypes.current} created (was ${comp.complexity.createdTypes.baseline}), ${comp.complexity.finishedTypes.current} finished (was ${comp.complexity.finishedTypes.baseline})\n`,
    );

    // Top-level table
    const topLevel = comp.metrics.filter((m) => isTopLevel(m.label));
    lines.push("| Metric | Baseline | Current | Change |");
    lines.push("|--------|----------|---------|--------|");
    for (const m of topLevel) {
      const indicator = changeIndicator(m.percentChange, threshold);
      const changeStr = `${formatPercent(m.percentChange)} ${indicator}`.trim();
      lines.push(
        `| ${m.label} | ${formatMs(m.baseline)} | ${formatMs(m.current)} | ${changeStr} |`,
      );
    }
    lines.push("");

    // Detailed breakdown in collapsible
    const detailed = comp.metrics.filter((m) => !isTopLevel(m.label));
    if (detailed.length > 0) {
      lines.push("<details>");
      lines.push("<summary>Detailed breakdown</summary>\n");
      lines.push("| Metric | Baseline | Current | Change |");
      lines.push("|--------|----------|---------|--------|");
      for (const m of detailed) {
        const indicator = changeIndicator(m.percentChange, threshold);
        const changeStr = `${formatPercent(m.percentChange)} ${indicator}`.trim();
        lines.push(
          `| ${m.label} | ${formatMs(m.baseline)} | ${formatMs(m.current)} | ${changeStr} |`,
        );
      }
      lines.push("\n</details>\n");
    }
  }

  lines.push(`> Threshold: changes > ±${threshold}% are highlighted.`);
  return lines.join("\n");
}
