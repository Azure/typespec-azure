#!/usr/bin/env node

import { formatDiagnostic, type Program } from "@typespec/compiler";
import { mkdir, stat, writeFile } from "fs/promises";
import { dirname, relative, resolve } from "path";
import {
  analyzeBaseAndHead,
  analyzeProgram,
  type AnalysisOptions,
} from "../pipeline/orchestrator.js";
import { formatConsoleReport } from "../reporting/reporter-console.js";
import { formatGithubReport } from "../reporting/reporter-github.js";
import { formatJsonReport, type JsonReportOptions } from "../reporting/reporter-json.js";
import {
  renderMarkdownSummary,
  type MarkdownReportOptions,
} from "../reporting/reporter-markdown.js";
import type { AnalysisResult, ComparisonPhase } from "../types.js";
import { compileService } from "./compile.js";
import { checkoutRevision, getRepoRoot, mapPathIntoWorktree } from "./git-checkout.js";

/**
 * Fail loudly if `program` has any compile-time error diagnostics, instead of
 * letting analysis silently proceed against an effectively-empty Program
 * (e.g. because every `import` failed to resolve). A program with unresolved
 * imports/decorators compiles "successfully" (no exception) but produces no
 * usable namespaces, so downstream analysis would otherwise report a
 * misleadingly benign "no changes found" instead of surfacing the real
 * problem.
 */
function assertNoCompileErrors(program: Program, label: string): void {
  const errors = (program.diagnostics ?? []).filter((d) => d.severity === "error");
  if (errors.length === 0) {
    return;
  }
  const details = errors.map((d) => `  ${formatDiagnostic(d)}`).join("\n");
  throw new Error(`Failed to compile the ${label}: ${errors.length} error(s) found:\n${details}`);
}

export interface CliOptions {
  /** Path to the head TypeSpec entry point (file-to-file mode). */
  entry: string;
  /** Path to the base TypeSpec entry point (file-to-file mode). */
  base?: string;
  /**
   * Git commitish (SHA, branch, tag, etc.) to check out as the base revision
   * for comparison, as an alternative to `--base <path>`. The tool checks
   * this out into an isolated, disposable git worktree and analyzes the
   * equivalent path within it. Ignored if `--base` is also set.
   */
  baseRef?: string;
  /** Output format for console: console, json, or github. */
  format: "console" | "json" | "github";
  /** Write JSON report to this file path. */
  jsonOutput?: string;
  /** Write Markdown report to this file path. */
  markdownOutput?: string;
  /** Emit GitHub Actions annotations. */
  githubAnnotations?: boolean;
  /** Exit with code 1 on breaking changes. */
  failOnBreaking?: boolean;
  /** Restrict to a specific phase. */
  phase?: ComparisonPhase;
  /** Filter to a specific service name. */
  service?: string;
  /** Show suppressed findings in output. */
  showSuppressed?: boolean;
  /** Show ignored findings in output. */
  showIgnored?: boolean;
  /** Custom report title for markdown output. */
  reportTitle?: string;
  /** Omit the H2 title line from markdown output. */
  omitTitle?: boolean;
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
      case "--base-ref":
        options.baseRef = args[++i];
        break;
      case "--format":
      case "-f":
        options.format = (args[++i] as CliOptions["format"]) ?? "console";
        break;
      case "--json-output":
        options.jsonOutput = args[++i];
        break;
      case "--markdown-output":
        options.markdownOutput = args[++i];
        break;
      case "--github-annotations":
        options.githubAnnotations = true;
        break;
      case "--fail-on-breaking":
        options.failOnBreaking = true;
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
      case "--report-title":
        options.reportTitle = args[++i];
        break;
      case "--omit-title":
        options.omitTitle = true;
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
Usage: typespec-breaking-change [options] <spec-folder>

Analyze a TypeSpec specification for breaking changes.

Arguments:
  spec-folder                Path to the TypeSpec project folder (containing main.tsp)

Options:
  -e, --entry <path>         Path to the head TypeSpec entry point (file-to-file mode)
  -b, --base <path>          Path to the base TypeSpec entry point (file-to-file comparison)
  --base-ref <commitish>     Git revision (SHA, branch, tag) to check out as the base for
                             comparison, instead of an explicit --base path. Checked out into
                             an isolated, disposable git worktree. Ignored if --base is set.
  -f, --format <format>      Console output format: console, json, github (default: console)
  --json-output <path>       Write JSON report to file
  --markdown-output <path>   Write Markdown summary to file
  --github-annotations       Emit GitHub Actions ::warning annotations
  --fail-on-breaking         Exit with code 1 if breaking changes detected
  -p, --phase <phase>        Restrict to phase: same-version, cross-version
  -s, --service <name>       Filter to a specific service name
  --show-suppressed          Include suppressed findings in output
  --show-ignored             Include ignored findings in output
  --report-title <title>     Custom H2 title for the Markdown summary (default: "Breaking Change Analysis")
  --omit-title               Omit the H2 title line from the Markdown summary. Use when a
                              caller (e.g. a CI workflow looping over multiple folders) prints
                              the title once itself, ahead of per-folder sections.
  -h, --help                 Show this help message

Exit codes:
  0  No breaking changes found (or --fail-on-breaking not set)
  1  Breaking changes detected (with --fail-on-breaking)
  2  Analysis failure (compilation error, invalid arguments, etc.)

Examples:
  # Single spec folder (Phase B cross-version analysis)
  typespec-breaking-change ./specification/widget/Microsoft.Widget/Widget

  # File-to-file comparison (Phase A + B)
  typespec-breaking-change --entry ./head/main.tsp --base ./base/main.tsp

  # Compare against a base revision resolved directly from git (no manual checkout)
  typespec-breaking-change ./specification/widget/Microsoft.Widget/Widget --base-ref origin/main

  # CI mode: JSON + Markdown output, fail on breaking
  typespec-breaking-change ./spec --json-output report.json --markdown-output report.md --fail-on-breaking
`);
}

/**
 * Format the analysis result using the specified reporter.
 */
export function formatResult(result: AnalysisResult, options: CliOptions): string {
  switch (options.format) {
    case "json":
      return formatJsonReport(result, buildReportOptions(options));
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

function buildReportOptions(options: CliOptions): JsonReportOptions {
  return {
    specPaths: [options.entry],
    baseRevision: options.base,
    headRevision: options.entry,
  };
}

async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

/**
 * Main CLI entry point.
 */
export async function main(args: string[]): Promise<number> {
  const options = parseArgs(args);

  if (!options.entry) {
    console.error(
      "Error: No entry point specified. Use --entry <path> or provide a positional argument.",
    );
    console.error("Run with --help for usage information.");
    return 2;
  }

  const analysisOptions: AnalysisOptions = {
    serviceName: options.service,
    phase: options.phase,
    log: (message: string) => console.log(message),
  };

  let baseCheckoutCleanup: (() => Promise<void>) | undefined;

  try {
    // Resolve --base-ref into a concrete --base path by checking the
    // revision out into an isolated git worktree. Explicit --base always
    // wins if both are provided.
    if (options.baseRef && !options.base) {
      const entryPath = resolve(options.entry);
      const repoRoot = await getRepoRoot(entryPath);
      // Scope the worktree checkout to the entry folder's *parent* directory
      // via sparse checkout — checking out the full repository at the base
      // revision is far too slow for large monorepos (e.g.
      // azure-rest-api-specs) where only one spec folder's history actually
      // needs to be compared. The parent (rather than just the entry folder
      // itself) is required because some TypeSpec projects import sibling
      // folders (e.g. a `Foo.Shared` namespace next to `Foo`); scoping to
      // only the entry folder would leave those imports unresolvable and
      // silently break compilation of the checked-out revision.
      const parentPath = dirname(entryPath);
      const parentRelative = relative(repoRoot, parentPath);
      // Guard against the entry folder being the repo root itself (or
      // otherwise outside it), where the parent would resolve outside the
      // repository (a leading ".." segment) — sparse-checkout can't scope to
      // a path outside the repo, so fall back to just the entry folder.
      const sparsePath =
        parentRelative.length > 0 && !parentRelative.startsWith("..")
          ? parentRelative
          : relative(repoRoot, entryPath);
      const { worktreePath, cleanup } = await checkoutRevision(options.baseRef, entryPath, {
        sparsePaths: [sparsePath],
      });
      baseCheckoutCleanup = cleanup;
      const mappedBasePath = await mapPathIntoWorktree(entryPath, entryPath, worktreePath);

      // The entry folder may not have existed yet at the base revision (e.g.
      // a PR that adds a brand-new spec folder) — in that case there's
      // nothing to compare against, so fall back to single-program (Phase B
      // only) analysis rather than failing with an ENOENT compile error.
      const baseExistsAtRevision = await stat(mappedBasePath)
        .then(() => true)
        .catch(() => false);
      if (baseExistsAtRevision) {
        options.base = mappedBasePath;
      }
    }

    let result: AnalysisResult;

    if (options.base) {
      // Two-program comparison (Phase A + Phase B)
      const basePath = resolve(options.base);
      const headPath = resolve(options.entry);

      const baseProgram = await compileService(basePath);
      assertNoCompileErrors(baseProgram, `base revision (${options.baseRef ?? basePath})`);
      const headProgram = await compileService(headPath);
      assertNoCompileErrors(headProgram, "head revision");

      result = analyzeBaseAndHead(baseProgram, headProgram, analysisOptions);
    } else {
      // Single-program analysis (Phase B only)
      const entryPath = resolve(options.entry);
      const program = await compileService(entryPath);
      assertNoCompileErrors(program, "head revision");

      result = analyzeProgram(program, analysisOptions);
    }

    // Console output
    const output = formatResult(result, options);
    console.log(output);

    // JSON file output
    if (options.jsonOutput) {
      const jsonPath = resolve(options.jsonOutput);
      await ensureParentDir(jsonPath);
      const jsonContent = formatJsonReport(result, buildReportOptions(options));
      await writeFile(jsonPath, jsonContent);
    }

    // Markdown file output
    if (options.markdownOutput) {
      const mdPath = resolve(options.markdownOutput);
      await ensureParentDir(mdPath);
      const mdOptions: MarkdownReportOptions = {
        specPaths: [options.entry],
        showTiming: true,
        githubServerUrl: process.env.GITHUB_SERVER_URL,
        githubRepository: process.env.GITHUB_REPOSITORY,
        githubSha: process.env.GITHUB_SHA,
        workspacePath: process.env.GITHUB_WORKSPACE,
        violationsReferenceUrl: process.env.VIOLATIONS_REFERENCE_URL,
        reportTitle: options.reportTitle,
        omitTitle: options.omitTitle,
      };
      const mdContent = renderMarkdownSummary(result, mdOptions);
      await writeFile(mdPath, mdContent);
    }

    // GitHub annotations
    if (options.githubAnnotations) {
      emitGithubAnnotations(result);
    }

    // Exit code: fail if there are unsuppressed breaking changes OR new suppressions
    const hasErrors = result.findings.some((f) => f.severity === "error" && !f.suppressed);
    const hasNewSuppressions = result.findings.some((f) => f.suppressed);
    if (options.failOnBreaking && (hasErrors || hasNewSuppressions)) {
      return 1;
    }
    return hasErrors ? 1 : 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Analysis failed: ${message}`);
    return 2;
  } finally {
    if (baseCheckoutCleanup) {
      await baseCheckoutCleanup();
    }
  }
}

/**
 * Emit GitHub Actions annotations for each unsuppressed error finding.
 */
function emitGithubAnnotations(result: AnalysisResult): void {
  const errors = result.findings.filter((f) => f.severity === "error" && !f.suppressed);
  for (const finding of errors) {
    const location = finding.diff.headSourceLocation ?? finding.diff.baseSourceLocation;
    const filePart = location ? `file=${location.file.path}` : "";
    const linePart = location
      ? `,line=${location.file.text.substring(0, location.pos).split("\n").length}`
      : "";
    const locStr = filePart ? ` ${filePart}${linePart}` : "";
    const title = `Breaking change: ${finding.diff.kind}`;
    console.log(`::error${locStr ? " " + locStr.trim() : ""}::${title} - ${finding.diff.message}`);
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
