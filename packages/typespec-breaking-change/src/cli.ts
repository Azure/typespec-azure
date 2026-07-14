#!/usr/bin/env node

import { resolve } from "path";
import { compileService } from "./compile.js";
import { analyzeBaseAndHead, analyzeProgram, type AnalysisOptions } from "./orchestrator.js";
import { formatConsoleReport } from "./reporter-console.js";
import { formatGithubReport } from "./reporter-github.js";
import { formatJsonReport } from "./reporter-json.js";
import type { AnalysisResult, ComparisonPhase } from "./types.js";

export interface CliOptions {
  /** Path to the head TypeSpec entry point (required). */
  entry: string;
  /** Path to the base TypeSpec entry point (for two-program comparison). */
  base?: string;
  /** Output format: console, json, or github. */
  format: "console" | "json" | "github";
  /** Restrict to a specific phase. */
  phase?: ComparisonPhase;
  /** Filter to a specific service name. */
  service?: string;
  /** Show suppressed findings in output. */
  showSuppressed?: boolean;
  /** Show ignored findings in output. */
  showIgnored?: boolean;
}

/**
 * Parse CLI arguments into CliOptions.
 */
export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    entry: "",
    format: "console",
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--entry":
      case "-e":
        options.entry = args[++i] ?? "";
        break;
      case "--base":
      case "-b":
        options.base = args[++i];
        break;
      case "--format":
      case "-f":
        options.format = (args[++i] as CliOptions["format"]) ?? "console";
        break;
      case "--phase":
      case "-p":
        options.phase = args[++i] as ComparisonPhase;
        break;
      case "--service":
      case "-s":
        options.service = args[++i];
        break;
      case "--show-suppressed":
        options.showSuppressed = true;
        break;
      case "--show-ignored":
        options.showIgnored = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
        break;
      default:
        // Treat positional argument as entry if not set
        if (!options.entry && !arg.startsWith("-")) {
          options.entry = arg;
        }
    }
  }

  return options;
}

function printUsage(): void {
  console.log(`
Usage: typespec-breaking-change [options] <entry>

Analyze a TypeSpec specification for breaking changes.

Arguments:
  entry                      Path to the head TypeSpec entry point

Options:
  -e, --entry <path>         Path to the head TypeSpec entry point
  -b, --base <path>          Path to the base TypeSpec entry point (two-program comparison)
  -f, --format <format>      Output format: console, json, github (default: console)
  -p, --phase <phase>        Restrict to phase: same-version, cross-version
  -s, --service <name>       Filter to a specific service name
  --show-suppressed          Include suppressed findings in output
  --show-ignored             Include ignored findings in output
  -h, --help                 Show this help message

Exit codes:
  0  No breaking changes found
  1  Breaking changes detected
  2  Analysis failure (compilation error, invalid arguments, etc.)
`);
}

/**
 * Format the analysis result using the specified reporter.
 */
export function formatResult(result: AnalysisResult, options: CliOptions): string {
  switch (options.format) {
    case "json":
      return formatJsonReport(result);
    case "github":
      return formatGithubReport(result);
    case "console":
    default:
      return formatConsoleReport(result, {
        showSuppressed: options.showSuppressed,
        showIgnored: options.showIgnored,
        showTiming: true,
      });
  }
}

/**
 * Main CLI entry point.
 */
export async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (!options.entry) {
    console.error("Error: No entry point specified. Use --entry <path> or provide a positional argument.");
    console.error("Run with --help for usage information.");
    return 2;
  }

  const analysisOptions: AnalysisOptions = {
    serviceName: options.service,
    phase: options.phase,
  };

  try {
    let result: AnalysisResult;

    if (options.base) {
      // Two-program comparison (Phase A + Phase B)
      const basePath = resolve(options.base);
      const headPath = resolve(options.entry);

      const baseProgram = await compileService(basePath);
      const headProgram = await compileService(headPath);

      result = analyzeBaseAndHead(baseProgram, headProgram, analysisOptions);
    } else {
      // Single-program analysis (Phase B only)
      const entryPath = resolve(options.entry);
      const program = await compileService(entryPath);

      result = analyzeProgram(program, analysisOptions);
    }

    const output = formatResult(result, options);
    console.log(output);

    // Exit code: 1 if unsuppressed errors exist
    const hasErrors = result.findings.some((f) => f.severity === "error" && !f.suppressed);
    return hasErrors ? 1 : 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Analysis failed: ${message}`);
    return 2;
  }
}

// Run if invoked directly
const isDirectInvocation =
  typeof process !== "undefined" && process.argv[1] && resolve(process.argv[1]).includes("cli");

if (isDirectInvocation) {
  main(process.argv.slice(2)).then((code) => {
    process.exit(code);
  });
}
