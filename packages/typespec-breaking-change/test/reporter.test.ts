import type { AnalysisResult, Finding } from "../src/index.js";
import {
  formatConsoleReport,
  formatGithubReport,
  formatJsonReport,
} from "../src/index.js";
import { describe, expect, it } from "vitest";

function createLocation(path: string, line: number) {
  const lines = Array.from({ length: Math.max(line, 1) }, (_, index) => `line ${index + 1}`);
  const pos = lines.slice(0, Math.max(line - 1, 0)).join("\n").length + (line > 1 ? 1 : 0);

  return {
    file: {
      path,
      text: lines.join("\n"),
    },
    pos,
    end: pos + 6,
  };
}

function createResult(): AnalysisResult {
  const circular: Record<string, unknown> = {};
  circular.self = circular;

  const findings: Finding[] = [
    {
      diff: {
        kind: "ResponsePropertyRemoved",
        identity: {
          operation: { method: "GET", path: "/widgets/{}" },
          component: "response",
          statusCode: "200",
          element: "body.properties.legacyStatus",
        },
        baseSourceLocation: createLocation("src/main.tsp", 45) as any,
        baseType: circular as any,
        headType: circular as any,
        message: "Response property 'legacyStatus' was removed",
      },
      severity: "error",
      rule: "response-widening",
      phase: "cross-version",
      suppressed: false,
      versionPair: {
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      },
    },
    {
      diff: {
        kind: "RequestPropertyRemoved",
        identity: {
          operation: { method: "POST", path: "/widgets" },
          component: "request",
          element: "body.properties.legacyField",
        },
        baseSourceLocation: createLocation("src/models.tsp", 12) as any,
        message: "Request property 'legacyField' was removed",
      },
      severity: "error",
      rule: "request-narrowing",
      phase: "cross-version",
      suppressed: true,
      suppressionReason: "Legacy client migration approved.",
      versionPair: {
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      },
    },
    {
      diff: {
        kind: "OperationAdded",
        identity: { element: "operations.POST /widgets/search" },
        headSourceLocation: createLocation("src/service.tsp", 8) as any,
        message: "Operation 'searchWidgets' was added",
      },
      severity: "ignore",
      rule: "operation-lifecycle",
      phase: "cross-version",
      suppressed: false,
      versionPair: {
        baseVersion: "2024-01-01",
        headVersion: "2025-01-01",
        phase: "cross-version",
      },
    },
  ];

  return {
    findings,
    timing: {
      compileBaseMs: 200,
      compileHeadMs: 200,
      versionMutatorsMs: 100,
      canonicalizeMs: 100,
      identityMatchingMs: 100,
      diffEngineMs: 300,
      classifyMs: 100,
      suppressMs: 0,
      reportMs: 0,
      totalMs: 1200,
    },
  };
}

describe("reporters", () => {
  it("formats a console report", () => {
    expect(formatConsoleReport(createResult())).toMatchInlineSnapshot(`
      "ERROR  ResponsePropertyRemoved
        Response property 'legacyStatus' was removed
        Operation: GET /widgets/{}
        Element: body.properties.legacyStatus
        Phase: cross-version (2024-01-01 → 2025-01-01)
        Location: src/main.tsp:45
        Suppress: @approvedBreakingChange("your reason here", "ResponsePropertyRemoved")

      ─────────────────────────────
      Results: 1 errors, 1 suppressed, 1 ignored
      Timing: 1.2s total (compile: 0.4s, diff: 0.6s, classify: 0.1s)"
    `);
  });

  it("can include suppressed and ignored findings in console output", () => {
    expect(
      formatConsoleReport(createResult(), {
        showIgnored: true,
        showSuppressed: true,
        showTiming: false,
      }),
    ).toMatchInlineSnapshot(`
      "ERROR  ResponsePropertyRemoved
        Response property 'legacyStatus' was removed
        Operation: GET /widgets/{}
        Element: body.properties.legacyStatus
        Phase: cross-version (2024-01-01 → 2025-01-01)
        Location: src/main.tsp:45
        Suppress: @approvedBreakingChange("your reason here", "ResponsePropertyRemoved")

      SUPPRESSED  RequestPropertyRemoved
        Request property 'legacyField' was removed
        Operation: POST /widgets
        Element: body.properties.legacyField
        Phase: cross-version (2024-01-01 → 2025-01-01)
        Location: src/models.tsp:12
        Reason: Legacy client migration approved.

      IGNORED  OperationAdded
        Operation 'searchWidgets' was added
        Element: operations.POST /widgets/search
        Phase: cross-version (2024-01-01 → 2025-01-01)
        Location: src/service.tsp:8

      ─────────────────────────────
      Results: 1 errors, 1 suppressed, 1 ignored"
    `);
  });

  it("formats a JSON report without circular references", () => {
    expect(JSON.parse(formatJsonReport(createResult()))).toEqual({
      summary: {
        errors: 1,
        suppressed: 1,
        ignored: 1,
        totalFindings: 3,
      },
      findings: [
        {
          kind: "ResponsePropertyRemoved",
          severity: "error",
          rule: "response-widening",
          phase: "cross-version",
          suppressed: false,
          message: "Response property 'legacyStatus' was removed",
          operation: { method: "GET", path: "/widgets/{}" },
          element: "body.properties.legacyStatus",
          component: "response",
          statusCode: "200",
          versionPair: {
            baseVersion: "2024-01-01",
            headVersion: "2025-01-01",
          },
          location: { file: "src/main.tsp", line: 45 },
        },
        {
          kind: "RequestPropertyRemoved",
          severity: "error",
          rule: "request-narrowing",
          phase: "cross-version",
          suppressed: true,
          suppressionReason: "Legacy client migration approved.",
          message: "Request property 'legacyField' was removed",
          operation: { method: "POST", path: "/widgets" },
          element: "body.properties.legacyField",
          component: "request",
          versionPair: {
            baseVersion: "2024-01-01",
            headVersion: "2025-01-01",
          },
          location: { file: "src/models.tsp", line: 12 },
        },
        {
          kind: "OperationAdded",
          severity: "ignore",
          rule: "operation-lifecycle",
          phase: "cross-version",
          suppressed: false,
          message: "Operation 'searchWidgets' was added",
          element: "operations.POST /widgets/search",
          versionPair: {
            baseVersion: "2024-01-01",
            headVersion: "2025-01-01",
          },
          location: { file: "src/service.tsp", line: 8 },
        },
      ],
      timing: createResult().timing,
    });
  });

  it("formats a GitHub markdown report", () => {
    expect(formatGithubReport(createResult())).toMatchInlineSnapshot(`
      "## Breaking Change Analysis

      **1 breaking change detected** (1 suppressed)

      ### Errors
      | Kind | Operation | Element | Phase | Version Pair |
      |------|-----------|---------|-------|--------------|
      | ResponsePropertyRemoved | GET /widgets/{} | body.properties.legacyStatus | cross-version | 2024-01-01 → 2025-01-01 |

      ### Suppressed
      | Kind | Operation | Reason |
      |------|-----------|--------|
      | RequestPropertyRemoved | POST /widgets | Legacy client migration approved. |

      <details>
      <summary>Timing</summary>

      Total: 1.2s | Compile: 0.4s | Diff: 0.6s | Classify: 0.1s
      </details>"
    `);
  });
});
