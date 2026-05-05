/* eslint-disable no-console */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { BenchmarkResult, RuntimeStats, SpecBenchmarkResult } from "./types.js";

/** A single entry in the aggregated history. */
export interface HistoryEntry {
  commit: string;
  timestamp: string;
  metrics: Record<string, number>;
}

/** The full history.json structure. */
export interface HistoryData {
  generated: string;
  labels: string[];
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
    return execSync(`git show benchmark-data:${path}`, {
      encoding: "utf-8",
      maxBuffer: 50_000_000,
    });
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
  const fileList = execSync("git ls-tree --name-only benchmark-data -- results/", {
    encoding: "utf-8",
  })
    .trim()
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
export function buildHistory(resultFiles: ResultFile[]): HistoryData {
  const entries: HistoryEntry[] = [];

  for (const { name, content } of resultFiles) {
    try {
      const result: BenchmarkResult = JSON.parse(content);
      const metrics = averageAcrossSpecs(result.specs);
      entries.push({
        commit: result.commit,
        timestamp: result.timestamp,
        metrics,
      });
    } catch (e: any) {
      console.error(`Failed to parse ${name}: ${e.message}`);
    }
  }

  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const allLabels = new Set<string>();
  for (const entry of entries) {
    for (const label of Object.keys(entry.metrics)) {
      allLabels.add(label);
    }
  }

  return {
    generated: new Date().toISOString(),
    labels: [...allLabels].sort(),
    entries,
  };
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

  const resultFiles = resultsDir ? readFromDirectory(resultsDir) : readFromGitBranch();
  const history = buildHistory(resultFiles);
  const output = JSON.stringify(history, null, 2);

  if (outputFile) {
    writeFileSync(outputFile, output);
    console.error(`Written to ${outputFile}`);
  } else {
    console.log(output);
  }
}
