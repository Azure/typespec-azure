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
});
