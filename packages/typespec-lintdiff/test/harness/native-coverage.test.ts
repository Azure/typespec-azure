import { describe, expect, it } from "vitest";
import {
  buildNativeCoverageReport,
  parseNativeCoverageArgs,
  type NativeProjectResult,
} from "./native-coverage.js";

const rule = "@azure-tools/typespec-azure-core/no-boolean";
const project = "specification/contoso/resource-manager/Contoso";
const diagnostic = {
  rule,
  message: "Use an enum.",
  sourceFile: "models.tsp",
  line: 10,
  column: 3,
};

function nativeResult(name = project): NativeProjectResult {
  return {
    project: name,
    status: "success",
    rawDiagnostics: [diagnostic],
    diagnostics: [diagnostic],
    packages: [],
  };
}

function datasetProject(name = project) {
  return {
    sourcePath: name,
    apiVersion: "2026-01-01",
    compileStatus: "success",
    validationStatus: "success",
  };
}

function validatorResult(name = project, swaggerFile = "one.json") {
  return { project: name, swaggerFile, path: ["definitions", "Widget", "enabled"] };
}

describe("native coverage arguments", () => {
  const args = [
    "--candidate-repo",
    "C:\\candidate",
    "--specs-repo",
    "C:\\specs",
    "--tgz-dir",
    "C:\\packages",
    "--output",
    "C:\\run",
    "--validator-rule",
    "EnumInsteadOfBoolean",
    "--tsp-rule",
    rule,
  ];

  it("selects current checkout inputs without a historical revision default", () => {
    expect(parseNativeCoverageArgs(args)).toMatchObject({
      candidateRepo: "C:\\candidate",
      specsRepo: "C:\\specs",
      validatorRule: "EnumInsteadOfBoolean",
      tspRules: [rule],
      scope: "source",
      concurrency: 2,
    });
  });

  it("supports several explicit native mappings and a literal project filter", () => {
    expect(
      parseNativeCoverageArgs([
        ...args,
        "--tsp-rule",
        "@azure-tools/typespec-azure-core/another",
        "--filter",
        "ProviderHub|Contoso",
        "--limit",
        "3",
      ]),
    ).toMatchObject({
      tspRules: [rule, "@azure-tools/typespec-azure-core/another"],
      filter: "ProviderHub|Contoso",
      limit: 3,
    });
  });

  it.each([
    ["--concurrency", "0"],
    ["--limit", "2oops"],
    ["--scope", "guess"],
    ["--candidate-repo", "C:\\other"],
    ["--filter"],
    ["--invented-option", "value"],
  ])("rejects invalid or duplicate arguments: %j", (...extra) => {
    expect(() => parseNativeCoverageArgs([...args, ...extra])).toThrow();
  });

  it("limits boolean-specific alignment to the no-boolean mapping", () => {
    expect(() =>
      parseNativeCoverageArgs([
        ...args.slice(0, -1),
        "@azure-tools/typespec-azure-core/other",
        "--scope",
        "boolean-http",
      ]),
    ).toThrow(/no-boolean/);
  });
});

describe("native coverage accounting", () => {
  it("reports project coverage separately from raw and conservative deduplicated counts", () => {
    const report = buildNativeCoverageReport(
      [datasetProject()],
      [validatorResult(), validatorResult(project, "two.json")],
      [nativeResult()],
    );
    expect(report).toMatchObject({
      selectedProjectCount: 1,
      assessableProjectCount: 1,
      validatorProjects: [project],
      nativeProjects: [project],
      overlapProjects: [project],
      validatorOnlyProjects: [],
      nativeOnlyProjects: [],
      observedProjectCoveragePercent: 100,
      validatorRawCount: 2,
      validatorFileIndependentCount: 1,
      nativeRawCount: 1,
      nativeSourceCount: 1,
      equivalence: "not-determined",
    });
  });

  it("retains every failed project without crediting it as covered", () => {
    const failed = `${project}/failed`;
    const report = buildNativeCoverageReport(
      [datasetProject(), datasetProject(failed)],
      [validatorResult(), validatorResult(failed)],
      [nativeResult(), { ...nativeResult(failed), status: "failed", error: "Compile error" }],
    );
    expect(report.assessableProjectCount).toBe(1);
    expect(report.unassessedProjects).toEqual([{ project: failed, reason: "Compile error" }]);
    expect(report.validatorRawCount).toBe(1);
    expect(report.unassessedValidatorRawCount).toBe(1);
  });

  it.each(["compileStatus", "validationStatus"])(
    "excludes failed Swagger %s from both populations",
    (field) => {
      const report = buildNativeCoverageReport(
        [{ ...datasetProject(), [field]: "failed" }],
        [validatorResult()],
        [nativeResult()],
      );
      expect(report.assessableProjectCount).toBe(0);
      expect(report.observedProjectCoveragePercent).toBeNull();
      expect(report.unassessedProjects).toHaveLength(1);
      expect(report.nativeRawCount).toBe(0);
    },
  );

  it("does not equate no observed violations with full coverage", () => {
    const report = buildNativeCoverageReport(
      [datasetProject()],
      [],
      [
        {
          ...nativeResult(),
          rawDiagnostics: [],
          diagnostics: [],
        },
      ],
    );
    expect(report.observedProjectCoveragePercent).toBeNull();
    expect(report.equivalence).toBe("not-determined");
  });

  it("preserves both directions of diagnostic differences, not just the net", () => {
    const second = `${project}/second`;
    const report = buildNativeCoverageReport(
      [datasetProject(), datasetProject(second)],
      [validatorResult(), { ...validatorResult(), path: ["other"] }, validatorResult(second)],
      [
        nativeResult(),
        {
          ...nativeResult(second),
          rawDiagnostics: [diagnostic, { ...diagnostic, line: 20 }],
          diagnostics: [diagnostic, { ...diagnostic, line: 20 }],
        },
      ],
    );
    expect(report.validatorExcess).toBe(1);
    expect(report.nativeExcess).toBe(1);
    expect(report.projectsWithEqualCounts).toBe(0);
  });

  it("retains duplicate raw diagnostics while counting distinct source targets", () => {
    const report = buildNativeCoverageReport(
      [datasetProject()],
      [validatorResult()],
      [
        {
          ...nativeResult(),
          rawDiagnostics: [diagnostic, diagnostic],
          diagnostics: [diagnostic, diagnostic],
        },
      ],
    );
    expect(report.nativeRawCount).toBe(2);
    expect(report.nativeSourceCount).toBe(1);
  });

  it("does not confuse explicit target activation with project-default activation", () => {
    const report = buildNativeCoverageReport(
      [datasetProject()],
      [validatorResult()],
      [
        {
          ...nativeResult(),
          defaultTargetDiagnostics: [],
        },
      ],
    );
    expect(report.nativeRawCount).toBe(1);
    expect(report.nativeDefaultCount).toBe(0);
  });

  it("does not collapse unrelated locationless diagnostics", () => {
    const missingLocation = { rule, message: "No location" };
    const report = buildNativeCoverageReport(
      [datasetProject()],
      [],
      [
        {
          ...nativeResult(),
          rawDiagnostics: [missingLocation, missingLocation],
          diagnostics: [missingLocation, missingLocation],
        },
      ],
    );
    expect(report.nativeSourceCount).toBe(2);
    expect(report.nativeLocationlessCount).toBe(2);
  });

  it("fails closed on missing or duplicate project receipts", () => {
    expect(() => buildNativeCoverageReport([datasetProject()], [], [])).toThrow(/receipt/);
    expect(() =>
      buildNativeCoverageReport([datasetProject()], [], [nativeResult(), nativeResult()]),
    ).toThrow(/duplicate/i);
    expect(() =>
      buildNativeCoverageReport([datasetProject(), datasetProject()], [], [nativeResult()]),
    ).toThrow(/duplicate/i);
  });

  it("rejects diagnostics for a project outside the selected population", () => {
    expect(() =>
      buildNativeCoverageReport(
        [datasetProject()],
        [validatorResult("unexpected")],
        [nativeResult()],
      ),
    ).toThrow(/population/);
  });
});
