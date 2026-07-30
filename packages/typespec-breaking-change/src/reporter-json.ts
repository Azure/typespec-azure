import type { SourceLocation } from "@typespec/compiler";
import type { AnalysisResult, AnalysisSummary, Finding, TimingInfo } from "./types.js";
import { isOperationIdentity } from "./types.js";

/**
 * Full structured JSON report — aligned with typespec-suppressions report pattern.
 */
export interface JsonReport {
  /** Spec paths analyzed. */
  specPaths: string[];
  /** Base revision or file path (if applicable). */
  baseRevision?: string;
  /** Head revision or file path. */
  headRevision?: string;
  /** Whether this report requires action (unsuppressed breaking changes exist). */
  requiresAction: boolean;
  /** Aggregate counts for quick CI gating. */
  counts: {
    errors: number;
    suppressed: number;
    ignored: number;
    totalFindings: number;
    servicesAnalyzed: number;
    comparisonsPerformed: number;
  };
  /** Explanation if no comparisons were performed. */
  noComparisonReason?: string;
  /** All classified findings. */
  findings: JsonFinding[];
  /** Performance timing. */
  timing: TimingInfo;
}

export interface JsonFinding {
  kind: string;
  severity: string;
  rule: string;
  phase: string;
  suppressed: boolean;
  suppressionReason?: string;
  message: string;
  operation?: { method: string; path: string };
  element?: string;
  component?: string;
  statusCode?: string;
  versionPair: { baseVersion: string; headVersion: string };
  location?: { file: string; line: number };
}

export interface JsonReportOptions {
  /** Spec folder paths that were analyzed. */
  specPaths?: string[];
  /** Base revision/path label. */
  baseRevision?: string;
  /** Head revision/path label. */
  headRevision?: string;
}

export function formatJsonReport(result: AnalysisResult, options?: JsonReportOptions): string {
  const errors = result.findings.filter((f) => f.severity === "error" && !f.suppressed);
  const report: JsonReport = {
    specPaths: options?.specPaths ?? [],
    baseRevision: options?.baseRevision,
    headRevision: options?.headRevision,
    requiresAction: errors.length > 0,
    counts: {
      errors: errors.length,
      suppressed: result.findings.filter((f) => f.suppressed).length,
      ignored: result.findings.filter((f) => f.severity === "ignore" && !f.suppressed).length,
      totalFindings: result.findings.length,
      servicesAnalyzed: result.summary.servicesAnalyzed,
      comparisonsPerformed: result.summary.comparisonsPerformed,
    },
    noComparisonReason: result.summary.noComparisonReason,
    findings: result.findings.map(mapFinding),
    timing: result.timing,
  };

  return JSON.stringify(report, null, 2);
}

function mapFinding(finding: Finding): JsonFinding {
  const location = getFindingLocation(finding);
  const baseFinding: JsonFinding = {
    kind: finding.diff.kind,
    severity: finding.severity,
    rule: finding.rule,
    phase: finding.phase,
    suppressed: finding.suppressed,
    suppressionReason: finding.suppressionReason,
    message: finding.diff.message,
    element: finding.diff.identity.element,
    versionPair: {
      baseVersion: finding.versionPair.baseVersion,
      headVersion: finding.versionPair.headVersion,
    },
    location: location
      ? {
          file: location.file.path,
          line: getLineNumber(location),
        }
      : undefined,
  };

  if (isOperationIdentity(finding.diff.identity)) {
    baseFinding.operation = {
      method: finding.diff.identity.operation.method,
      path: finding.diff.identity.operation.path,
    };
    baseFinding.component = finding.diff.identity.component;
    baseFinding.statusCode = finding.diff.identity.statusCode;
  }

  return baseFinding;
}

function getFindingLocation(finding: Finding): SourceLocation | undefined {
  return finding.diff.baseSourceLocation ?? finding.diff.headSourceLocation;
}

function getLineNumber(location: SourceLocation): number {
  const text = location.file.text.substring(0, location.pos);
  return text.split("\n").length;
}
