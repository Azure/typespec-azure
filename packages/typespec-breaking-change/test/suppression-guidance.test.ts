import { describe, it, expect } from "vitest";
import {
  formatSuppressionGuidance,
  formatSuppressionHint,
} from "../src/suppression-guidance.js";
import { formatJsonReport } from "../src/reporter-json.js";
import { renderMarkdownSummary } from "../src/reporter-markdown.js";
import { formatConsoleReport } from "../src/reporter-console.js";
import type { Finding, AnalysisResult } from "../src/types.js";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    diff: {
      kind: "ResponsePropertyRemoved",
      identity: {
        operation: { method: "GET", path: "/widgets/{}" },
        component: "response",
        statusCode: "200",
        element: "body.properties.legacyStatus",
      },
      message: "Response property 'legacyStatus' was removed",
    },
    severity: "error",
    rule: "response-contract-weakened",
    phase: "cross-version",
    suppressed: false,
    versionPair: {
      baseVersion: "2024-01-01",
      headVersion: "2025-01-01",
      phase: "cross-version",
    },
    ...overrides,
  } as Finding;
}

describe("suppression guidance", () => {
  describe("formatSuppressionHint", () => {
    it("produces @approvedBreakingChange for cross-version phase", () => {
      const finding = makeFinding();
      const hint = formatSuppressionHint(finding);
      expect(hint).toBe(
        '@approvedBreakingChange("your reason here", #{ kind: "ResponsePropertyRemoved" })',
      );
    });

    it("produces @approvedUnversionedChange for same-version phase", () => {
      const finding = makeFinding({ phase: "same-version" });
      const hint = formatSuppressionHint(finding);
      expect(hint).toBe(
        '@approvedUnversionedChange("your reason here", #{ kind: "ResponsePropertyRemoved" })',
      );
    });

    it("includes the correct diff kind in the hint", () => {
      const finding = makeFinding({
        diff: {
          ...makeFinding().diff,
          kind: "OperationRemoved",
        },
      });
      const hint = formatSuppressionHint(finding);
      expect(hint).toContain('"OperationRemoved"');
    });
  });

  describe("formatSuppressionGuidance", () => {
    it("returns full guidance for a finding with origin", () => {
      const finding = makeFinding({
        diff: {
          ...makeFinding().diff,
          origin: {
            declarationPath: "Microsoft.Widget.Models.WidgetProperties.legacyStatus",
            type: {} as any,
            sourceLocation: {
              file: { path: "src/models.tsp", text: "" },
              pos: 0,
              end: 5,
            },
          },
        },
      });

      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.decorator).toBe(
        '@approvedBreakingChange("your reason here", #{ kind: "ResponsePropertyRemoved" })',
      );
      expect(guidance.placement).toContain("Microsoft.Widget.Models.WidgetProperties.legacyStatus");
      expect(guidance.file).toBe("src/models.tsp");
      expect(guidance.example).toContain("model WidgetProperties");
      expect(guidance.example).toContain("legacyStatus");
      expect(guidance.example).toContain("@approvedBreakingChange");
    });

    it("returns operation-level guidance when no origin", () => {
      const finding = makeFinding();
      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.placement).toContain("GET /widgets/{}");
      expect(guidance.example).toContain("op ");
    });

    it("returns service-level guidance for service identity", () => {
      const finding = makeFinding({
        diff: {
          ...makeFinding().diff,
          identity: { element: "authSchemes.Bearer" },
        },
      });
      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.placement).toContain("service namespace");
    });

    it("uses @approvedUnversionedChange for same-version findings", () => {
      const finding = makeFinding({ phase: "same-version" });
      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.decorator).toContain("@approvedUnversionedChange");
    });

    it("resolves file from headSourceLocation when no origin", () => {
      const finding = makeFinding({
        diff: {
          ...makeFinding().diff,
          headSourceLocation: {
            file: { path: "src/operations.tsp", text: "op foo" },
            pos: 0,
            end: 6,
          },
        },
      });
      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.file).toBe("src/operations.tsp");
    });

    it("resolves file from baseSourceLocation as fallback", () => {
      const finding = makeFinding({
        diff: {
          ...makeFinding().diff,
          baseSourceLocation: {
            file: { path: "src/base.tsp", text: "model Foo" },
            pos: 0,
            end: 9,
          },
        },
      });
      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.file).toBe("src/base.tsp");
    });

    it("returns undefined file when no location available", () => {
      const finding = makeFinding();
      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.file).toBeUndefined();
    });

    it("builds model example for type-level origin (no parent)", () => {
      const finding = makeFinding({
        diff: {
          ...makeFinding().diff,
          kind: "TypeKindChanged",
          identity: { element: "types.Widget" },
          origin: {
            declarationPath: "Microsoft.Widget.Models.Widget",
            type: {} as any,
            sourceLocation: {
              file: { path: "src/models.tsp", text: "" },
              pos: 0,
              end: 5,
            },
          },
        },
      });
      const guidance = formatSuppressionGuidance(finding);
      expect(guidance.example).toContain("model Widget");
      expect(guidance.example).not.toContain("model Models");
    });
  });
});

describe("suppression guidance in reporters", () => {

  function makeResult(): AnalysisResult {
    return {
      findings: [makeFinding()],
      timing: {
        compileBaseMs: 0, compileHeadMs: 0, versionMutatorsMs: 0,
        canonicalizeMs: 0, identityMatchingMs: 0, diffEngineMs: 0,
        classifyMs: 0, suppressMs: 0, reportMs: 0, totalMs: 100,
      },
      summary: { servicesAnalyzed: 1, comparisonsPerformed: 1 },
    };
  }

  it("JSON report includes suppression guidance for error findings", () => {
    const result = makeResult();
    const report = JSON.parse(formatJsonReport(result));
    const finding = report.findings[0];
    expect(finding.suppression).toBeDefined();
    expect(finding.suppression.decorator).toContain("@approvedBreakingChange");
    expect(finding.suppression.decorator).toContain("ResponsePropertyRemoved");
    expect(finding.suppression.placement).toBeTruthy();
    expect(finding.suppression.example).toBeTruthy();
  });

  it("JSON report omits suppression guidance for suppressed findings", () => {
    const result = makeResult();
    result.findings[0] = { ...result.findings[0], suppressed: true, suppressionReason: "approved" };
    const report = JSON.parse(formatJsonReport(result));
    expect(report.findings[0].suppression).toBeUndefined();
  });

  it("JSON report omits suppression guidance for ignored findings", () => {
    const result = makeResult();
    result.findings[0] = { ...result.findings[0], severity: "ignore" };
    const report = JSON.parse(formatJsonReport(result));
    expect(report.findings[0].suppression).toBeUndefined();
  });

  it("Markdown report includes suppression guidance section", () => {
    const result = makeResult();
    const md = renderMarkdownSummary(result);
    expect(md).toContain("How to suppress these findings");
    expect(md).toContain("@approvedBreakingChange");
    expect(md).toContain("ResponsePropertyRemoved");
    expect(md).toContain("```typespec");
  });

  it("Markdown report deduplicates suppression hints", () => {
    const result = makeResult();
    // Add a second finding with the same kind
    result.findings.push(makeFinding());
    const md = renderMarkdownSummary(result);
    // Should only appear once
    const matches = md.match(/@approvedBreakingChange/g);
    expect(matches).toHaveLength(1);
  });

  it("Console report shows suppression hint for error findings", () => {
    const result = makeResult();
    const output = formatConsoleReport(result);
    expect(output).toContain("Suppress:");
    expect(output).toContain(
      '@approvedBreakingChange("your reason here", #{ kind: "ResponsePropertyRemoved" })',
    );
  });

  it("Console report shows reason instead of hint for suppressed findings", () => {
    const result = makeResult();
    result.findings[0] = { ...result.findings[0], suppressed: true, suppressionReason: "Approved by team" };
    const output = formatConsoleReport(result, { showSuppressed: true });
    expect(output).toContain("Reason: Approved by team");
    expect(output).not.toContain("Suppress:");
  });
});
