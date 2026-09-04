/* eslint-disable no-console */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { median } from "./statistics.js";
import type { BenchmarkResult, RunnerInfo, RuntimeStats, SpecBenchmarkResult } from "./types.js";
import { DEFAULT_BRANCH, listResultBlobs, readBlobs } from "./utils.js";

/**
 * Schema version of `history.json`.
 *
 * Result files gained fields over time with no way to tell which ones a given
 * file predates, so consumers had to guess. This lets them check instead.
 *
 * 1. Metrics only.
 * 2. Adds `runner` and `quality` to every entry.
 */
export const HISTORY_VERSION = 2;

/** Why a point may not be comparable with the ones around it. */
export type EntryFlag =
  /** Far enough from its neighbors to be a contended runner, not a change. */
  | "outlier"
  /** Averaged over too few iterations to separate signal from noise. */
  | "low-iterations"
  /** Measured on a different platform than the rest of the series. */
  | "foreign-runner";

/** How much weight a single point deserves. */
export interface EntryQuality {
  /** Measured iterations, lowest across the specs in this run. */
  iterations: number;
  /** Spread of `total`, highest across the specs. Null if the run predates it. */
  cv: number | null;
  /** Empty when the point is directly comparable with its neighbors. */
  flags: EntryFlag[];
}

/** A single entry in the aggregated history. */
export interface HistoryEntry {
  commit: string;
  timestamp: string;
  /** Averaged metrics across all specs */
  metrics: Record<string, number>;
  /** Per-spec metrics (spec name → flat metrics) */
  specMetrics: Record<string, Record<string, number>>;
  /**
   * Machine the run was measured on.
   *
   * Node and runner image changes move these numbers by more than most real
   * regressions do, so a point is only meaningful alongside its environment.
   */
  runner?: RunnerInfo;
  quality: EntryQuality;
}

/** The full history.json structure. */
export interface HistoryData {
  /** See {@link HISTORY_VERSION}. */
  version: number;
  generated: string;
  labels: string[];
  /** All spec names found across all entries */
  specNames: string[];
  entries: HistoryEntry[];
}

/** Flatten RuntimeStats into a flat record of label → ms. */
function flattenRuntime(rt: RuntimeStats): Record<string, number> {
  const flat: Record<string, number> = {};
  flat["total"] = rt.total ?? 0;
  flat["loader"] = rt.loader ?? 0;
  flat["resolver"] = rt.resolver ?? 0;
  flat["checker"] = rt.checker ?? 0;

  if (rt.validation) {
    flat["validation"] = rt.validation.total ?? 0;
    for (const [name, ms] of Object.entries(rt.validation.validators ?? {})) {
      flat[`validation/${name}`] = ms;
    }
  }
  if (rt.linter) {
    flat["linter"] = rt.linter.total ?? 0;
    for (const [name, ms] of Object.entries(rt.linter.rules ?? {})) {
      flat[`linter/${name}`] = ms;
    }
  }
  if (rt.emit) {
    flat["emit"] = rt.emit.total ?? 0;
    for (const [name, emitter] of Object.entries(rt.emit.emitters ?? {})) {
      flat[`emit/${name}`] = emitter.total ?? 0;
      for (const [step, ms] of Object.entries(emitter.steps ?? {})) {
        flat[`emit/${name}/${step}`] = ms;
      }
    }
  }
  return flat;
}

/** Average flat metrics across multiple specs. */
function averageAcrossSpecs(specs: Record<string, SpecBenchmarkResult>): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const spec of Object.values(specs)) {
    const flat = flattenRuntime(spec.stats.runtime);
    for (const [label, ms] of Object.entries(flat)) {
      sums[label] = (sums[label] ?? 0) + ms;
      counts[label] = (counts[label] ?? 0) + 1;
    }
  }
  const avg: Record<string, number> = {};
  for (const label of Object.keys(sums)) {
    avg[label] = sums[label] / counts[label];
  }
  return avg;
}

/** Runs averaged over fewer iterations than this are too coarse to compare. */
const MIN_TRUSTWORTHY_ITERATIONS = 5;

/** Neighbors weighed when deciding whether a point is an isolated spike. */
const OUTLIER_WINDOW = 11;

/**
 * How far from its neighbors a point has to sit to be called a spike.
 *
 * Deliberately far beyond any plausible regression: the point of this flag is
 * to catch a contended runner, not to second-guess real changes. A shift that
 * persists moves the neighboring median with it and is never flagged.
 */
const OUTLIER_RATIO = 2;

/** Summarize how much weight a run's numbers deserve. */
function measureQuality(specs: Record<string, SpecBenchmarkResult>): EntryQuality {
  const results = Object.values(specs);
  const spreads = results
    .map((spec) => spec.variability?.total.cv)
    .filter((cv): cv is number => cv !== undefined);

  return {
    // The weakest spec sets the confidence for the run as a whole.
    iterations: results.length > 0 ? Math.min(...results.map((spec) => spec.iterations ?? 0)) : 0,
    cv: spreads.length > 0 ? Math.max(...spreads) : null,
    flags: [],
  };
}

/** Platform identity, ignoring the kernel build that changes constantly. */
function platformOf(runner: RunnerInfo | undefined): string | null {
  if (!runner) return null;
  return `${runner.os.split("-")[0]}-${runner.arch}`;
}

/** The platform most of the series was measured on. */
function dominantPlatform(entries: HistoryEntry[]): string | null {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const platform = platformOf(entry.runner);
    if (platform) counts.set(platform, (counts.get(platform) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [platform, count] of counts) {
    if (best === null || count > counts.get(best)!) best = platform;
  }
  return best;
}

/**
 * Mark points that cannot be read as part of the same series.
 *
 * A chart line implies every point was measured the same way. This history
 * spans laptop runs, single-iteration runs and several runner images, so the
 * entries that break that assumption are called out rather than silently
 * plotted alongside the rest.
 */
function flagEntries(entries: HistoryEntry[]): void {
  const expectedPlatform = dominantPlatform(entries);
  const totals = entries.map((entry) => entry.metrics["total"] ?? null);
  const reach = (OUTLIER_WINDOW - 1) / 2;

  entries.forEach((entry, index) => {
    const flags = entry.quality.flags;

    if (entry.quality.iterations > 0 && entry.quality.iterations < MIN_TRUSTWORTHY_ITERATIONS) {
      flags.push("low-iterations");
    }

    const platform = platformOf(entry.runner);
    if (platform && expectedPlatform && platform !== expectedPlatform) {
      flags.push("foreign-runner");
    }

    const value = totals[index];
    if (value === null || value <= 0) return;

    const neighbors: number[] = [];
    for (let i = index - reach; i <= index + reach; i++) {
      if (i === index || i < 0 || i >= totals.length) continue;
      const neighbor = totals[i];
      if (neighbor !== null && neighbor > 0) neighbors.push(neighbor);
    }
    // Too few neighbors to tell a spike from the start of a trend.
    if (neighbors.length < 4) return;

    const expected = median(neighbors);
    if (expected > 0 && (value > expected * OUTLIER_RATIO || value * OUTLIER_RATIO < expected)) {
      flags.push("outlier");
    }
  });
}

interface ResultFile {
  name: string;
  content: string;
}

/**
 * Yield result files one at a time.
 *
 * Every result file carries its raw per-iteration stats, which is ~95% of its
 * size and of no use here, so holding all of them in memory at once costs
 * hundreds of megabytes for a history this long.
 */
function* readFromDirectory(dir: string): Generator<ResultFile> {
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".json") && f !== "latest.json" && f !== "history.json",
  );
  console.error(`Found ${files.length} result files in ${dir}`);
  for (const file of files) {
    try {
      yield { name: file, content: readFileSync(join(dir, file), "utf-8") };
    } catch {
      // skip unreadable files
    }
  }
}

/** Yield result files from the data branch without a subprocess per file. */
function* readFromGitBranch(branch: string): Generator<ResultFile> {
  const blobs = listResultBlobs(branch);
  console.error(`Found ${blobs.length} result files on ${branch} branch`);
  yield* readBlobs(blobs);
}

/** Generate a HistoryData object from a list of result files. */
export function buildHistory(resultFiles: Iterable<ResultFile>): HistoryData {
  const entries: HistoryEntry[] = [];
  const allSpecNames = new Set<string>();

  for (const { name, content } of resultFiles) {
    try {
      const result: BenchmarkResult = JSON.parse(content);
      const metrics = averageAcrossSpecs(result.specs);

      const specMetrics: Record<string, Record<string, number>> = {};
      for (const [specName, spec] of Object.entries(result.specs)) {
        allSpecNames.add(specName);
        specMetrics[specName] = flattenRuntime(spec.stats.runtime);
      }

      entries.push({
        commit: result.commit,
        timestamp: result.timestamp,
        metrics,
        specMetrics,
        runner: result.runner,
        quality: measureQuality(result.specs),
      });
    } catch (e: any) {
      console.error(`Failed to parse ${name}: ${e.message}`);
    }
  }

  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  flagEntries(entries);

  const allLabels = new Set<string>();
  for (const entry of entries) {
    for (const label of Object.keys(entry.metrics)) {
      allLabels.add(label);
    }
  }

  return {
    version: HISTORY_VERSION,
    generated: new Date().toISOString(),
    labels: [...allLabels].sort(),
    specNames: [...allSpecNames].sort(),
    entries,
  };
}

export interface GenerateHistoryOptions {
  /** Read results from a directory instead of the benchmark-data git branch. */
  dir?: string;
  /** Data branch to read results from when `dir` is not given. */
  branch?: string;
}

/** Generate history data from result files. */
export function generateHistory(options: GenerateHistoryOptions = {}): HistoryData {
  return buildHistory(
    options.dir
      ? readFromDirectory(options.dir)
      : readFromGitBranch(options.branch ?? DEFAULT_BRANCH),
  );
}

/** CLI entry point for generate-history. */
export function generateHistoryMain(argv: string[]): void {
  let outputFile: string | null = null;
  let resultsDir: string | null = null;

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) {
      resultsDir = args[++i];
    } else if (!args[i].startsWith("-")) {
      outputFile = args[i];
    }
  }

  const history = generateHistory({ dir: resultsDir ?? undefined });
  const output = JSON.stringify(history, null, 2);

  if (outputFile) {
    writeFileSync(outputFile, output);
    console.error(`Written to ${outputFile}`);
  } else {
    console.log(output);
  }
}
