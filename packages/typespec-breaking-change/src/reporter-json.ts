import type { SourceLocation } from "@typespec/compiler";
import type { AnalysisResult, Finding, TimingInfo } from "./types.js";
import { isOperationIdentity } from "./types.js";

export interface JsonReport {
  summary: {
    errors: number;
    suppressed: number;
    ignored: number;
    totalFindings: number;
  };
  findings: JsonFinding[];
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

export function formatJsonReport(result: AnalysisResult): string {
  const report: JsonReport = {
    summary: {
      errors: result.findings.filter((finding) => finding.severity === "error" && !finding.suppressed)
        .length,
      suppressed: result.findings.filter((finding) => finding.suppressed).length,
      ignored: result.findings.filter((finding) => finding.severity === "ignore" && !finding.suppressed)
        .length,
      totalFindings: result.findings.length,
    },
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
