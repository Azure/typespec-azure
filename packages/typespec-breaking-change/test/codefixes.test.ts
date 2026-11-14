import { applyCodeFix, resolvePath, type Program } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { describe, expect, it } from "vitest";
import { analyzeBaseAndHead, analyzeProgram } from "../src/pipeline/orchestrator.js";
import { createApproveBreakingChangeCodeFix } from "../src/suppression/codefixes.js";
import { emitFindingDiagnostics } from "../src/suppression/diagnostics.js";
import { isOperationIdentity, type Finding } from "../src/types.js";
import { Tester, TesterWithSuppressions } from "./test-host.js";

describe("codefixes", () => {
  const editedSourceTester = createTester(resolvePath(import.meta.dirname, ".."), {
    libraries: [
      "@typespec/http",
      "@typespec/rest",
      "@typespec/versioning",
      "@azure-tools/typespec-azure-core",
    ],
  });
  async function applyApproval(program: Program, finding: Finding): Promise<string> {
    const fix = createApproveBreakingChangeCodeFix(finding, program);
    expect(fix).toBeDefined();
    let updated = "";
    await applyCodeFix(
      {
        ...program.host,
        writeFile: async (path, content) => {
          expect(program.sourceFiles.has(path)).toBe(true);
          updated = content;
        },
      },
      fix!,
    );
    expect(updated).not.toBe("");
    return updated;
  }
  function operationPath(finding: Finding): string {
    if (!isOperationIdentity(finding.diff.identity)) {
      throw new Error("Expected an operation finding");
    }
    return finding.diff.identity.operation.path;
  }

  it("applies a qualified, version-scoped approval without approving another transition", async () => {
    const { program } = await TesterWithSuppressions.compile(`
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1: "2023-01-01", v2: "2024-01-01", v3: "2025-01-01", v4: "2026-01-01" }
      model Widget {
        name: string;
        @removed(Versions.v2) @added(Versions.v3) @removed(Versions.v4)
        legacy?: string;
      }
      @get @route("/widgets") op read(): Widget;
    `);
    const result = analyzeProgram(program);
    expect(result.findings).toHaveLength(3);
    const finding = result.findings[0];
    const message = 'Approved "quote", backslash \\, and newline\nnext line';
    const updated = await applyApproval(program, {
      ...finding,
      diff: { ...finding.diff, message },
    });
    expect(updated).toContain("@Azure.Core.approvedBreakingChange(");
    expect(updated).toContain('since: "2024-01-01"');
    const { program: approved } = await editedSourceTester.compile(
      updated.replace("using Azure.Core;\n", ""),
    );
    expect(
      analyzeProgram(approved).findings.map((item) => ({
        version: item.versionPair.headVersion,
        suppressed: item.suppressed,
        reason: item.suppressionReason,
      })),
    ).toEqual([
      { version: "2024-01-01", suppressed: true, reason: `Approved: ${message}` },
      { version: "2025-01-01", suppressed: false, reason: undefined },
      { version: "2026-01-01", suppressed: false, reason: undefined },
    ]);
  });

  it("applies an unversioned approval to the head property for same-version changes", async () => {
    const source = `
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1: "2024-01-01" }
      model Widget { value: string; }
      @get @route("/widgets") op read(): Widget;
    `;
    const { program: base } = await TesterWithSuppressions.compile(source);
    const { program: head } = await TesterWithSuppressions.compile(
      source.replace("value: string", "value: int32"),
    );
    const result = analyzeBaseAndHead(base, head, { phase: "same-version" });
    expect(result.findings).toHaveLength(1);
    const updated = await applyApproval(head, result.findings[0]);
    expect(updated).toContain("@Azure.Core.approvedUnversionedChange(");
    expect(updated).not.toContain("since:");
    const { program: approved } = await editedSourceTester.compile(updated);
    expect(analyzeBaseAndHead(base, approved, { phase: "same-version" }).findings).toMatchObject([
      { suppressed: true, phase: "same-version" },
    ]);
  });

  it("places removal approvals on a surviving head operation, not a deleted base property", async () => {
    const source = `
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1: "2024-01-01" }
      model Widget { name: string; legacy?: string; }
      @get @route("/widgets") op read(): Widget;
    `;
    const { program: base } = await TesterWithSuppressions.compile(source);
    const { program: head } = await TesterWithSuppressions.compile(
      source.replace("legacy?: string;", ""),
    );
    const result = analyzeBaseAndHead(base, head, { phase: "same-version" });
    expect(result.findings).toHaveLength(1);
    const updated = await applyApproval(head, result.findings[0]);
    expect(updated).not.toContain("legacy?:");
    expect(updated).toContain('path: "responses.200.body.properties.legacy"');
    const { program: approved } = await editedSourceTester.compile(updated);
    expect(analyzeBaseAndHead(base, approved, { phase: "same-version" }).findings).toMatchObject([
      { suppressed: true },
    ]);
  });

  it.each(["interface", "namespace"])(
    "approves only the deleted operation under its surviving %s parent",
    async (parentKind) => {
      const removed = '@get @route("/first/removed") op removed(): string;';
      const other = '@get @route("/first/other") op other(): string;';
      const sameName = '@get @route("/second/removed") op removed(): string;';
      const source = `
        @service @versioned(Versions) namespace TestService;
        enum Versions { v1: "2024-01-01" }
        namespace First {
          ${parentKind} Operations {
            @get @route("/first/keep") op keep(): string;
            ${removed}
            ${other}
          }
        }
        namespace Second {
          ${parentKind} Operations {
            @get @route("/second/keep") op keep(): string;
            ${sameName}
          }
        }
      `;
      const { program: base } = await TesterWithSuppressions.compile(source);
      const { program: head } = await TesterWithSuppressions.compile(
        source.replace(removed, "").replace(other, "").replace(sameName, ""),
      );
      const result = analyzeBaseAndHead(base, head, { phase: "same-version" });
      expect(result.findings).toHaveLength(3);
      const finding = result.findings.find(
        (item) => operationPath(item) === "/first/removed" && item.diff.kind === "OperationRemoved",
      );
      expect(finding).toBeDefined();
      const updated = await applyApproval(head, finding!);
      expect(updated).not.toContain("op removed");
      expect(updated).toContain('kind: "OperationRemoved", path: "removed"');
      expect(updated).toMatch(new RegExp(`\\}\\)\\s+${parentKind} Operations`));
      const { program: approved } = await editedSourceTester.compile(updated);
      const findings = analyzeBaseAndHead(base, approved, { phase: "same-version" }).findings;
      expect(
        findings
          .map((item) => ({
            path: operationPath(item),
            suppressed: item.suppressed,
          }))
          .sort((a, b) => a.path.localeCompare(b.path)),
      ).toEqual([
        { path: "/first/other", suppressed: false },
        { path: "/first/removed", suppressed: true },
        { path: "/second/removed", suppressed: false },
      ]);
    },
  );

  it.each(["interface", "namespace"])(
    "does not offer a baseline edit when the deleted operation's %s parent is gone",
    async (parentKind) => {
      const parent = `${parentKind} Operations {
        @get @route("/removed") op removed(): string;
      }`;
      const source = `
        @service @versioned(Versions) namespace TestService;
        enum Versions { v1: "2024-01-01" }
        @get @route("/keep") op keep(): string;
        namespace First { ${parent} }
        namespace Second { ${parentKind} Operations {} }
      `;
      const { program: base } = await TesterWithSuppressions.compile(source);
      const { program: head } = await TesterWithSuppressions.compile(source.replace(parent, ""));
      const result = analyzeBaseAndHead(base, head, { phase: "same-version" });
      expect(result.findings).toMatchObject([{ diff: { kind: "OperationRemoved" } }]);
      expect(createApproveBreakingChangeCodeFix(result.findings[0], head)).toBeUndefined();
    },
  );

  it("requires an operation path for approvals on the surviving namespace", async () => {
    const source = `
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1: "2024-01-01" }
      @get @route("/keep") op keep(): string;
      @get @route("/removed") op removed(): string;
    `;
    const { program: base } = await TesterWithSuppressions.compile(source);
    const { program: head } = await TesterWithSuppressions.compile(
      source
        .replace('@get @route("/removed") op removed(): string;', "")
        .replace(
          "@service",
          '@approvedUnversionedChange("Reviewed", #{kind: "OperationRemoved"}) @service',
        ),
    );
    const result = analyzeBaseAndHead(base, head, { phase: "same-version" });
    expect(result.findings).toMatchObject([
      { diff: { kind: "OperationRemoved" }, suppressed: false },
    ]);
    const updated = await applyApproval(head, result.findings[0]);
    const { program: approved } = await editedSourceTester.compile(updated);
    expect(analyzeBaseAndHead(base, approved, { phase: "same-version" }).findings).toMatchObject([
      { suppressed: true },
    ]);
  });

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
        identity: {
          operation: { method: "GET", path: "/test" },
          component: "request",
          statusCode: undefined,
          element: "",
        },
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
    expect(diagnostics[0].code).toBe("@azure-tools/typespec-azure-core/breaking-change");
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
          diff: {
            kind: "OperationRemoved",
            message: "test",
            origin: undefined,
            headType: undefined,
            baseType: undefined,
            identity: {
              operation: { method: "GET", path: "/x" },
              component: "request",
              statusCode: undefined,
              element: "",
            },
          },
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
