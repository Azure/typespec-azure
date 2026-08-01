import type { AnalysisResult, Finding } from "../src/index.js";
import {
  formatConsoleReport,
  formatGithubReport,
  formatJsonReport,
} from "../src/index.js";
import { renderMarkdownSummary } from "../src/reporter-markdown.js";
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
    summary: { servicesAnalyzed: 1, comparisonsPerformed: 1 },
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
        Suppress: @approvedBreakingChange("your reason here", #{ kind: "ResponsePropertyRemoved" })

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
        Suppress: @approvedBreakingChange("your reason here", #{ kind: "ResponsePropertyRemoved" })

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
    const report = JSON.parse(formatJsonReport(createResult(), {
      specPaths: ["./spec"],
      baseRevision: "origin/main",
      headRevision: "HEAD",
    }));
    expect(report.specPaths).toEqual(["./spec"]);
    expect(report.baseRevision).toBe("origin/main");
    expect(report.headRevision).toBe("HEAD");
    expect(report.requiresAction).toBe(true);
    expect(report.counts).toEqual({
      errors: 1,
      suppressed: 1,
      ignored: 1,
      totalFindings: 3,
      servicesAnalyzed: 1,
      comparisonsPerformed: 1,
    });
    expect(report.findings).toHaveLength(3);
    expect(report.findings[0]).toMatchObject({
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
    });
    // Unsuppressed error findings include suppression guidance
    expect(report.findings[0].suppression).toBeDefined();
    expect(report.findings[0].suppression.decorator).toContain("@approvedBreakingChange");
    expect(report.findings[0].suppression.decorator).toContain("ResponsePropertyRemoved");
    expect(report.timing).toEqual(createResult().timing);
  });

  it("formats a JSON report with requiresAction=false when no errors", () => {
    const result = createResult();
    result.findings = result.findings.filter((f) => f.severity !== "error" || f.suppressed);
    const report = JSON.parse(formatJsonReport(result));
    expect(report.requiresAction).toBe(false);
    expect(report.counts.errors).toBe(0);
  });

  it("formats a JSON report with noComparisonReason when no comparisons", () => {
    const result = createResult();
    result.findings = [];
    result.summary = { servicesAnalyzed: 1, comparisonsPerformed: 0, noComparisonReason: "All versions are preview" };
    const report = JSON.parse(formatJsonReport(result));
    expect(report.noComparisonReason).toBe("All versions are preview");
    expect(report.requiresAction).toBe(false);
  });

  it("formats a JSON report with default empty options", () => {
    const report = JSON.parse(formatJsonReport(createResult()));
    expect(report.specPaths).toEqual([]);
    expect(report.baseRevision).toBeUndefined();
    expect(report.headRevision).toBeUndefined();
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

  it("formats GitHub report with no errors (only suppressed)", () => {
    const result = createResult();
    // Keep only the suppressed finding
    result.findings = result.findings.filter((f) => f.suppressed);
    const output = formatGithubReport(result);
    expect(output).toContain("**0 breaking changes detected**");
    expect(output).toContain("### Suppressed");
    expect(output).not.toContain("### Errors");
  });

  it("formats GitHub report with no suppressed findings", () => {
    const result = createResult();
    // Keep only unsuppressed error findings
    result.findings = result.findings.filter((f) => !f.suppressed && f.severity === "error");
    const output = formatGithubReport(result);
    expect(output).toContain("### Errors");
    expect(output).not.toContain("### Suppressed");
  });

  it("formats GitHub report with service-level identity (no operation)", () => {
    const result = createResult();
    // Replace identity with a service-level one (no operation field)
    result.findings = [
      {
        ...result.findings[0],
        diff: {
          ...result.findings[0].diff,
          identity: { element: "service.operations" },
        },
      },
    ];
    const output = formatGithubReport(result);
    expect(output).toContain("—"); // dash for non-operation identity
  });
});

describe("markdown reporter", () => {
  it("renders a summary with breaking changes", () => {
    const md = renderMarkdownSummary(createResult(), {
      baseRevision: "origin/main",
      headRevision: "HEAD",
    });
    expect(md).toContain("## Breaking Change Analysis");
    expect(md).toContain("❌ **1 unsuppressed breaking change detected**");
    expect(md).toContain("1 unsuppressed");
    expect(md).toContain("1 suppressed");
    expect(md).toContain("### Unsuppressed Breaking Changes");
    expect(md).toContain("ResponsePropertyRemoved");
    expect(md).toContain("### New Suppressed Breaking Changes");
  });

  it("renders a clean summary with no breaking changes", () => {
    const result = createResult();
    result.findings = result.findings.filter((f) => f.severity !== "error" || f.suppressed);
    const md = renderMarkdownSummary(result);
    expect(md).toContain("⚠️");
    expect(md).toContain("suppressed");
    expect(md).not.toContain("### Unsuppressed Breaking Changes");
  });

  it("renders noComparisonReason when no comparisons performed", () => {
    const result = createResult();
    result.findings = [];
    result.summary = { servicesAnalyzed: 1, comparisonsPerformed: 0, noComparisonReason: "All versions are preview" };
    const md = renderMarkdownSummary(result);
    expect(md).toContain("ℹ️ All versions are preview");
    expect(md).not.toContain("### Unsuppressed Breaking Changes");
  });

  it("includes timing when showTiming is true", () => {
    const md = renderMarkdownSummary(createResult(), { showTiming: true });
    expect(md).toContain("<summary>Performance</summary>");
    expect(md).toContain("Total:");
  });

  it("excludes timing when showTiming is false", () => {
    const md = renderMarkdownSummary(createResult(), { showTiming: false });
    expect(md).not.toContain("<summary>Performance</summary>");
  });

  it("handles service-level identity in findings table", () => {
    const result = createResult();
    result.findings = [
      {
        ...result.findings[0],
        diff: {
          ...result.findings[0].diff,
          identity: { element: "service.endpoint" },
        },
      },
    ];
    const md = renderMarkdownSummary(result);
    expect(md).toContain("`service.endpoint`");
  });

  it("escapes pipe characters in table cells", () => {
    const result = createResult();
    result.findings = [
      {
        ...result.findings[0],
        diff: {
          ...result.findings[0].diff,
          message: "value was a|b, now c|d",
          identity: {
            operation: { method: "GET", path: "/test" },
            component: "request" as const,
            element: "query.filter|sort",
          },
        },
      },
    ];
    const md = renderMarkdownSummary(result);
    expect(md).toContain("\\|"); // escaped pipes
  });
});
