/* eslint-disable no-console */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { BenchmarkResult, RuntimeStats, SpecBenchmarkResult } from "./types.js";
import { getCommitMetadata, gitCommand, type CommitMetadata } from "./utils.js";

/** A single entry in the aggregated history. */
export interface HistoryEntry {
  commit: string;
  timestamp: string;
  commitTimestamp?: string;
  measurementMode?: "split";
  /** Averaged metrics across all specs */
  metrics: Record<string, number>;
  /** Per-spec metrics (spec name → flat metrics) */
  specMetrics: Record<string, Record<string, number>>;
}

/** The full history.json structure. */
export interface HistoryData {
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

function gitShow(path: string): string | null {
  try {
    return gitCommand(["show", `benchmark-data:${path}`]);
  } catch {
    return null;
  }
}

interface ResultFile {
  name: string;
  content: string;
}

function readFromDirectory(dir: string): ResultFile[] {
  const files = readdirSync(dir).filter(
    (f) => f.endsWith(".json") && f !== "latest.json" && f !== "history.json",
  );
  console.error(`Found ${files.length} result files in ${dir}`);
  const results: ResultFile[] = [];
  for (const file of files) {
    try {
      const content = readFileSync(join(dir, file), "utf-8");
      results.push({ name: file, content });
    } catch {
      // skip unreadable files
    }
  }
  return results;
}

function readFromGitBranch(): ResultFile[] {
  const fileList = gitCommand(["ls-tree", "-r", "--name-only", "benchmark-data", "--", "results/"])
    .split("\n")
    .filter(
      (f) => f.endsWith(".json") && !f.includes("latest.json") && !f.includes("history.json"),
    );
  console.error(`Found ${fileList.length} result files on benchmark-data branch`);
  const results: ResultFile[] = [];
  for (const file of fileList) {
    const content = gitShow(file);
    if (content) results.push({ name: file, content });
  }
  return results;
}

/** Generate a HistoryData object from a list of result files. */
export function buildHistory(
  resultFiles: ResultFile[],
  resolveCommits: (commits: string[]) => ReadonlyMap<string, CommitMetadata> = getCommitMetadata,
): HistoryData {
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
        measurementMode: result.measurementMode,
        metrics,
        specMetrics,
      });
    } catch (e: any) {
      console.error(`Failed to parse ${name}: ${e.message}`);
    }
  }

  const commits = resolveCommits(entries.map((entry) => entry.commit));
  for (const entry of entries) {
    const metadata = commits.get(entry.commit);
    if (!metadata) throw new Error(`Missing source commit metadata for ${entry.commit}`);
    entry.commitTimestamp = metadata.timestamp;
  }
  entries.sort((a, b) => commits.get(a.commit)!.order - commits.get(b.commit)!.order);

  const allLabels = new Set<string>();
  for (const entry of entries) {
    for (const label of Object.keys(entry.metrics)) {
      allLabels.add(label);
    }
  }

  return {
    generated: new Date().toISOString(),
    labels: [...allLabels].sort(),
    specNames: [...allSpecNames].sort(),
    entries,
  };
}

export interface GenerateHistoryOptions {
  /** Read results from a directory instead of the benchmark-data git branch. */
  dir?: string;
  /** Source repository used to recover commit metadata for legacy result files. */
  repoDir?: string;
}

/** Generate history data from result files. */
export function generateHistory(options: GenerateHistoryOptions = {}): HistoryData {
  const resultFiles = options.dir ? readFromDirectory(options.dir) : readFromGitBranch();
  return buildHistory(resultFiles, (commits) => getCommitMetadata(commits, options.repoDir));
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
