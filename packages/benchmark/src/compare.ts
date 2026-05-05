import type { BenchmarkResult, ComparisonResult, MetricComparison, RuntimeStats } from "./types.js";

const DEFAULT_THRESHOLD = 5; // percent

export interface CompareOptions {
  /** Percentage threshold for highlighting changes (default: 5%). */
  threshold?: number;
}

function createMetric(label: string, baseline: number, current: number): MetricComparison {
  const change = current - baseline;
  const percentChange = baseline === 0 ? (current === 0 ? 0 : 100) : (change / baseline) * 100;
  return { label, baseline, current, change, percentChange };
}

function extractRuntimeMetrics(
  baselineRuntime: RuntimeStats,
  currentRuntime: RuntimeStats,
  prefix: string = "",
): MetricComparison[] {
  const metrics: MetricComparison[] = [];

  metrics.push(createMetric(`${prefix}total`, baselineRuntime.total, currentRuntime.total));
  metrics.push(createMetric(`${prefix}loader`, baselineRuntime.loader, currentRuntime.loader));
  metrics.push(
    createMetric(`${prefix}resolver`, baselineRuntime.resolver, currentRuntime.resolver),
  );
  metrics.push(createMetric(`${prefix}checker`, baselineRuntime.checker, currentRuntime.checker));

  // Validation
  metrics.push(
    createMetric(
      `${prefix}validation`,
      baselineRuntime.validation.total,
      currentRuntime.validation.total,
    ),
  );
  const allValidators = new Set([
    ...Object.keys(baselineRuntime.validation.validators),
    ...Object.keys(currentRuntime.validation.validators),
  ]);
  for (const v of [...allValidators].sort()) {
    metrics.push(
      createMetric(
        `${prefix}validation/${v}`,
        baselineRuntime.validation.validators[v] ?? 0,
        currentRuntime.validation.validators[v] ?? 0,
      ),
    );
  }

  // Linter rules
  metrics.push(
    createMetric(`${prefix}linter`, baselineRuntime.linter.total, currentRuntime.linter.total),
  );
  const allRules = new Set([
    ...Object.keys(baselineRuntime.linter.rules),
    ...Object.keys(currentRuntime.linter.rules),
  ]);
  for (const r of [...allRules].sort()) {
    metrics.push(
      createMetric(
        `${prefix}linter/${r}`,
        baselineRuntime.linter.rules[r] ?? 0,
        currentRuntime.linter.rules[r] ?? 0,
      ),
    );
  }

  // Emitters
  metrics.push(
    createMetric(`${prefix}emit`, baselineRuntime.emit.total, currentRuntime.emit.total),
  );
  const allEmitters = new Set([
    ...Object.keys(baselineRuntime.emit.emitters),
    ...Object.keys(currentRuntime.emit.emitters),
  ]);
  for (const e of [...allEmitters].sort()) {
    const baseEmitter = baselineRuntime.emit.emitters[e];
    const currEmitter = currentRuntime.emit.emitters[e];
    metrics.push(
      createMetric(`${prefix}emit/${e}`, baseEmitter?.total ?? 0, currEmitter?.total ?? 0),
    );
    const allSteps = new Set([
      ...Object.keys(baseEmitter?.steps ?? {}),
      ...Object.keys(currEmitter?.steps ?? {}),
    ]);
    for (const s of [...allSteps].sort()) {
      metrics.push(
        createMetric(
          `${prefix}emit/${e}/${s}`,
          baseEmitter?.steps[s] ?? 0,
          currEmitter?.steps[s] ?? 0,
        ),
      );
    }
  }

  return metrics;
}

/** Compare two benchmark results and return per-spec comparisons. */
export function compareBenchmarks(
  baseline: BenchmarkResult,
  current: BenchmarkResult,
  options: CompareOptions = {},
): ComparisonResult[] {
  const results: ComparisonResult[] = [];
  const allSpecs = new Set([...Object.keys(baseline.specs), ...Object.keys(current.specs)]);

  for (const specName of [...allSpecs].sort()) {
    const baseSpec = baseline.specs[specName];
    const currSpec = current.specs[specName];

    if (!baseSpec || !currSpec) {
      // Spec only exists in one run — skip comparison
      continue;
    }

    const metrics = extractRuntimeMetrics(baseSpec.stats.runtime, currSpec.stats.runtime);

    results.push({
      specName,
      metrics,
      complexity: {
        createdTypes: {
          baseline: baseSpec.stats.complexity.createdTypes,
          current: currSpec.stats.complexity.createdTypes,
        },
        finishedTypes: {
          baseline: baseSpec.stats.complexity.finishedTypes,
          current: currSpec.stats.complexity.finishedTypes,
        },
      },
    });
  }

  return results;
}

/** Check if any comparison has notable changes above threshold. */
export function hasNotableChanges(
  comparisons: ComparisonResult[],
  threshold: number = DEFAULT_THRESHOLD,
): boolean {
  for (const comp of comparisons) {
    for (const m of comp.metrics) {
      if (Math.abs(m.percentChange) >= threshold) {
        return true;
      }
    }
  }
  return false;
}
