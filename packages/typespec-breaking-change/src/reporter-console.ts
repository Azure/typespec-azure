import type { SourceLocation } from "@typespec/compiler";
import type { AnalysisResult, Finding } from "./types.js";
import { isOperationIdentity } from "./types.js";

const SUMMARY_SEPARATOR = "─────────────────────────────";

export interface ConsoleReporterOptions {
  /** Whether to include ignored (non-breaking) findings. Default: false */
  showIgnored?: boolean;
  /** Whether to include suppressed findings. Default: false */
  showSuppressed?: boolean;
  /** Whether to show timing. Default: true */
  showTiming?: boolean;
}

export function formatConsoleReport(
  result: AnalysisResult,
  options: ConsoleReporterOptions = {},
): string {
  const visibleFindings = result.findings.filter((finding) => shouldIncludeFinding(finding, options));
  const summaryLines = [SUMMARY_SEPARATOR, formatSummary(result)];

  if (result.summary.noComparisonReason) {
    summaryLines.push(`Note: ${result.summary.noComparisonReason}`);
  }

  if (options.showTiming ?? true) {
    summaryLines.push(formatTiming(result));
  }

  if (visibleFindings.length === 0) {
    return summaryLines.join("\n");
  }

  return `${visibleFindings.map(formatFinding).join("\n\n")}\n\n${summaryLines.join("\n")}`;
}

function shouldIncludeFinding(finding: Finding, options: ConsoleReporterOptions): boolean {
  if (finding.suppressed) {
    return options.showSuppressed ?? false;
  }

  if (finding.severity === "ignore") {
    return options.showIgnored ?? false;
  }

  return true;
}

function formatFinding(finding: Finding): string {
  const lines = [`${getSeverityLabel(finding)}  ${finding.diff.kind}`, `  ${finding.diff.message}`];

  if (isOperationIdentity(finding.diff.identity)) {
    lines.push(
      `  Operation: ${finding.diff.identity.operation.method} ${finding.diff.identity.operation.path}`,
    );
  }

  lines.push(`  Element: ${finding.diff.identity.element}`);
  lines.push(`  Phase: ${formatVersionPair(finding)}`);
  lines.push(`  Location: ${formatLocation(getFindingLocation(finding))}`);

  if (finding.suppressed && finding.suppressionReason) {
    lines.push(`  Reason: ${finding.suppressionReason}`);
  } else if (finding.severity === "error") {
    lines.push(`  Suppress: ${formatSuppressionHint(finding)}`);
  }

  return lines.join("\n");
}

function getSeverityLabel(finding: Finding): "ERROR" | "SUPPRESSED" | "IGNORED" {
  if (finding.suppressed) {
    return "SUPPRESSED";
  }

  return finding.severity === "error" ? "ERROR" : "IGNORED";
}

function formatSummary(result: AnalysisResult): string {
  const errors = countErrors(result.findings);
  const suppressed = countSuppressed(result.findings);
  const ignored = countIgnored(result.findings);
  return `Results: ${errors} errors, ${suppressed} suppressed, ${ignored} ignored`;
}

function formatTiming(result: AnalysisResult): string {
  const compileMs = result.timing.compileBaseMs + result.timing.compileHeadMs;
  const diffMs =
    result.timing.versionMutatorsMs +
    result.timing.canonicalizeMs +
    result.timing.identityMatchingMs +
    result.timing.diffEngineMs;
  const classifyMs = result.timing.classifyMs + result.timing.suppressMs;

  return `Timing: ${formatDuration(result.timing.totalMs)} total (compile: ${formatDuration(
    compileMs,
  )}, diff: ${formatDuration(diffMs)}, classify: ${formatDuration(classifyMs)})`;
}

function formatVersionPair(finding: Finding): string {
  const { phase, baseVersion, headVersion } = finding.versionPair;
  return `${phase} (${baseVersion} → ${headVersion})`;
}

function formatSuppressionHint(finding: Finding): string {
  return `@approvedBreakingChange("your reason here", "${finding.diff.kind}")`;
}

function countErrors(findings: Finding[]): number {
  return findings.filter((finding) => finding.severity === "error" && !finding.suppressed).length;
}

function countSuppressed(findings: Finding[]): number {
  return findings.filter((finding) => finding.suppressed).length;
}

function countIgnored(findings: Finding[]): number {
  return findings.filter((finding) => finding.severity === "ignore" && !finding.suppressed).length;
}

function getFindingLocation(finding: Finding): SourceLocation | undefined {
  return finding.diff.baseSourceLocation ?? finding.diff.headSourceLocation;
}

function getLineNumber(location: SourceLocation): number {
  const text = location.file.text.substring(0, location.pos);
  return text.split("\n").length;
}

function formatLocation(location?: SourceLocation): string {
  if (!location) return "unknown";
  const line = getLineNumber(location);
  return `${location.file.path}:${line}`;
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
