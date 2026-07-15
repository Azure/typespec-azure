import { describe, it, expect } from "vitest";
import { createApproveBreakingChangeCodeFix } from "../src/codefixes.js";
import { emitFindingDiagnostics } from "../src/diagnostics.js";
import { analyzeProgram } from "../src/orchestrator.js";
import { Tester } from "./test-host.js";
import type { Finding } from "../src/types.js";

describe("codefixes", () => {
  it("creates a codefix for a finding with origin", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeProgram(program);
    const errorFindings = result.findings.filter((f) => f.severity === "error");
    expect(errorFindings.length).toBeGreaterThan(0);

    const codefix = createApproveBreakingChangeCodeFix(errorFindings[0]);
    expect(codefix).toBeDefined();
    expect(codefix!.id).toContain("add-decorator");
  });

  it("returns undefined when finding has no targetable type", () => {
    const mockFinding: Finding = {
      diff: {
        kind: "OperationAdded" as any,
        identity: { operation: { method: "GET", path: "/test" }, component: "request", statusCode: undefined, element: "" },
        message: "test",
      },
      severity: "error",
      rule: "default",
      phase: "cross-version",
      suppressed: false,
      versionPair: { baseVersion: "v1", headVersion: "v2", phase: "cross-version" },
    } as any;

    const codefix = createApproveBreakingChangeCodeFix(mockFinding);
    expect(codefix).toBeUndefined();
  });

  it("falls back to headType when no origin available", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @added(Versions.v2)
        required: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeProgram(program);
    // Find a finding and strip origin to test fallback path
    const finding = result.findings.find((f) => f.severity === "error");
    if (finding) {
      const stripped = { ...finding, diff: { ...finding.diff, origin: undefined } };
      const codefix = createApproveBreakingChangeCodeFix(stripped);
      expect(codefix).toBeDefined();
    }
  });

  it("falls back to baseType for removals with no origin or headType", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy: string;
      }

      @route("/widgets")
      @get
      op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    const finding = result.findings.find((f) => f.severity === "error");
    expect(finding).toBeDefined();
    // Strip origin and headType to test baseType fallback
    const stripped = {
      ...finding!,
      diff: { ...finding!.diff, origin: undefined, headType: undefined },
    };
    const codefix = createApproveBreakingChangeCodeFix(stripped);
    expect(codefix).toBeDefined();
  });

  it("targets the origin type when available", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model SharedModel {
        name: string;
        @removed(Versions.v2)
        tag: string;
      }

      @route("/a") @get op getA(): SharedModel;
      @route("/b") @get op getB(): SharedModel;
    `);

    const result = analyzeProgram(program);
    const findings = result.findings.filter((f) => f.severity === "error");
    expect(findings.length).toBeGreaterThan(0);

    // Origin should be the SharedModel declaration
    const finding = findings[0];
    expect(finding.diff.origin).toBeDefined();

    const codefix = createApproveBreakingChangeCodeFix(finding);
    expect(codefix).toBeDefined();
  });
});

describe("diagnostics", () => {
  it("emits diagnostics for unsuppressed error findings", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy: string;
      }

      @route("/widgets")
      @get
      op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    const diagnostics = emitFindingDiagnostics(program, result);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe("@azure-tools/typespec-breaking-change/breaking-change");
    expect(diagnostics[0].severity).toBe("error");
    expect(diagnostics[0].message).toContain("Breaking change detected");
  });

  it("includes codefix in emitted diagnostic", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy: string;
      }

      @route("/widgets")
      @get
      op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    const diagnostics = emitFindingDiagnostics(program, result);

    expect(diagnostics[0].codefixes).toBeDefined();
    expect(diagnostics[0].codefixes!.length).toBeGreaterThan(0);
  });

  it("does not emit diagnostics for suppressed findings", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy: string;
      }

      @route("/widgets")
      @get
      op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    // Mark all as suppressed
    const suppressedResult = {
      ...result,
      findings: result.findings.map((f) => ({ ...f, suppressed: true })),
    };

    const diagnostics = emitFindingDiagnostics(program, suppressedResult);
    expect(diagnostics).toHaveLength(0);
  });

  it("does not emit diagnostics for ignore-severity findings", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @added(Versions.v2)
        newProp?: string;
      }

      @route("/widgets")
      @get
      op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    // Adding an optional response property should be severity "ignore"
    const diagnostics = emitFindingDiagnostics(program, result);
    expect(diagnostics).toHaveLength(0);
  });

  it("emits diagnostic targeting baseType when no origin or headType", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @removed(Versions.v2)
        legacy: string;
      }

      @route("/widgets")
      @get
      op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    // Strip origin and headType from all findings to test baseType fallback
    const modifiedResult = {
      ...result,
      findings: result.findings.map((f) => ({
        ...f,
        diff: { ...f.diff, origin: undefined, headType: undefined },
      })),
    };

    const diagnostics = emitFindingDiagnostics(program, modifiedResult);
    // Should still emit diagnostics via baseType fallback
    const errorCount = modifiedResult.findings.filter(
      (f) => f.severity === "error" && !f.suppressed && f.diff.baseType,
    ).length;
    expect(diagnostics.length).toBe(errorCount);
  });

  it("emits diagnostic targeting headType when no origin", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget {
        name: string;
        @added(Versions.v2)
        required: string;
      }

      @route("/widgets")
      @post
      op createWidget(@body widget: Widget): Widget;
    `);

    const result = analyzeProgram(program);
    // Find an error finding that has headType (additions have headType)
    const errorFindings = result.findings.filter((f) => f.severity === "error" && f.diff.headType);
    if (errorFindings.length > 0) {
      // Strip only origin to test headType fallback
      const modifiedResult = {
        ...result,
        findings: errorFindings.map((f) => ({
          ...f,
          diff: { ...f.diff, origin: undefined },
        })),
      };

      const diagnostics = emitFindingDiagnostics(program, modifiedResult);
      expect(diagnostics.length).toBe(errorFindings.length);
    }
  });

  it("skips findings with no targetable type", async () => {
    const { program } = await Tester.compile(`
      @versioned(Versions)
      @service
      namespace TestService;

      enum Versions { v1: "2024-01-01", v2: "2025-01-01" }

      model Widget { name: string; }

      @route("/widgets")
      @get
      op getWidget(): Widget;
    `);

    const result = analyzeProgram(program);
    // Strip all type references to test the undefined return path
    const modifiedResult = {
      ...result,
      findings: [
        {
          diff: { kind: "OperationRemoved", message: "test", origin: undefined, headType: undefined, baseType: undefined, identity: { operation: { method: "GET", path: "/x" }, component: "request", statusCode: undefined, element: "" } },
          severity: "error" as const,
          rule: "default",
          phase: "cross-version" as const,
          suppressed: false,
          versionPair: { baseVersion: "v1", headVersion: "v2", phase: "cross-version" as const },
        },
      ],
    };

    const diagnostics = emitFindingDiagnostics(program, modifiedResult as any);
    expect(diagnostics).toHaveLength(0);
  });
});
