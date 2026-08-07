import * as path from "path";
import { describe, expect, it } from "vitest";
import {
  aggregateTypeSpecResults,
  compareResults,
  injectLocalRuleset,
  loadValidatorMappings,
  parseTypeSpecDiagnostics,
  type TypeSpecDiagnostic,
} from "./typespec-results.js";

const project = "specification/contoso/resource-manager/Microsoft.Contoso/Contoso";
const projectDir = "C:\\specs\\specification\\contoso\\Contoso";

function diagnostic(
  rule: string,
  projectName: string,
  level: "warning" | "error" = "warning",
): TypeSpecDiagnostic {
  return {
    rule,
    level,
    origin: rule.startsWith("tsp-lintdiff") ? "local" : "official",
    project: projectName,
    message: `${rule} message`,
  };
}

describe("TypeSpec result configuration", () => {
  it("adds the local ruleset without replacing block or inline official rulesets", () => {
    const block = [
      "linter:",
      "  extends:",
      '    - "@azure-tools/typespec-azure-rulesets/resource-manager"',
      "  disable:",
      "    no-unused: true",
      "",
    ].join("\n");
    const inline =
      'linter:\n  extends: ["@azure-tools/typespec-azure-rulesets/resource-manager"]\n';

    const blockResult = injectLocalRuleset(block);
    expect(blockResult).toContain('    - "@azure-tools/typespec-azure-rulesets/resource-manager"');
    expect(blockResult).toContain('    - "tsp-lintdiff-local-linter/all"');
    expect(blockResult).toContain("  disable:");

    const inlineResult = injectLocalRuleset(inline);
    expect(inlineResult).toContain(
      'extends: ["@azure-tools/typespec-azure-rulesets/resource-manager", "tsp-lintdiff-local-linter/all"]',
    );
  });
});

describe("TypeSpec diagnostic parsing", () => {
  it("parses Windows paths and locationless diagnostics without deduplicating", () => {
    const output = [
      "C:\\specs\\specification\\contoso\\Contoso\\models.tsp:12:7 - warning tsp-lintdiff-local-linter/example: Local message: with detail",
      "error invalid-ref: Locationless compiler failure",
      "warning @azure-tools/typespec-azure-core/use-standard-operations: Official message",
      "C:\\specs\\specification\\contoso\\Contoso\\models.tsp:12:7 - warning tsp-lintdiff-local-linter/example: Local message: with detail",
    ].join("\n");

    expect(parseTypeSpecDiagnostics(output, project, projectDir)).toEqual([
      {
        rule: "tsp-lintdiff-local-linter/example",
        level: "warning",
        origin: "local",
        project,
        sourceFile: "models.tsp",
        line: 12,
        column: 7,
        message: "Local message: with detail",
      },
      {
        rule: "invalid-ref",
        level: "error",
        origin: "compiler",
        project,
        message: "Locationless compiler failure",
      },
      {
        rule: "@azure-tools/typespec-azure-core/use-standard-operations",
        level: "warning",
        origin: "official",
        project,
        message: "Official message",
      },
      {
        rule: "tsp-lintdiff-local-linter/example",
        level: "warning",
        origin: "local",
        project,
        sourceFile: "models.tsp",
        line: 12,
        column: 7,
        message: "Local message: with detail",
      },
    ]);
  });
});

describe("TypeSpec result aggregation", () => {
  it("counts levels, projects, and duplicate diagnostics", () => {
    const diagnostics = [
      diagnostic("rule-b", "project-b"),
      diagnostic("rule-a", "project-a", "error"),
      diagnostic("rule-a", "project-a", "error"),
      diagnostic("rule-a", "project-b"),
    ];

    const aggregate = aggregateTypeSpecResults(
      "0123456789abcdef",
      "2026-08-07T00:00:00.000Z",
      diagnostics,
    );

    expect(aggregate.totalDiagnostics).toBe(4);
    expect(Object.keys(aggregate.rules)).toEqual(["rule-a", "rule-b"]);
    expect(aggregate.rules["rule-a"]).toMatchObject({
      count: 3,
      levels: { error: 2, warning: 1 },
      projectCount: 2,
    });
  });
});

describe("validator and TypeSpec comparison", () => {
  it("loads validator-to-TypeSpec mappings from fixture frontmatter", () => {
    const mappings = loadValidatorMappings(path.resolve(import.meta.dirname, "..", "fixtures"));

    expect(mappings.get("DeleteInOperationName")).toEqual(
      new Set(["tsp-lintdiff-local-linter/delete-in-operation-name"]),
    );
    expect(mappings.get("AdditionalPropertiesObject")).toEqual(new Set());
    expect(mappings.get("PostResponseCodes")).toEqual(
      new Set(["@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"]),
    );
  });

  it("computes overlap from projects where mapped TypeSpec rules actually fire", () => {
    const aggregate = aggregateTypeSpecResults("0123456789abcdef", "2026-08-07T00:00:00.000Z", [
      diagnostic("local/rule-a", "project-b"),
      diagnostic("local/rule-a", "project-c"),
      diagnostic("unmapped/rule", "project-d"),
    ]);
    const mappings = new Map([["ValidatorA", new Set(["local/rule-a", "local/not-fired"])]]);

    const comparison = compareResults(
      "0123456789abcdef",
      "2026-08-07T00:00:00.000Z",
      {
        ValidatorA: { count: 3, projects: ["project-a", "project-b"] },
        ValidatorUnmapped: { count: 1, projects: ["project-c"] },
      },
      aggregate,
      mappings,
    );

    expect(comparison.rules[0]).toMatchObject({
      validatorRule: "ValidatorA",
      mappedTypeSpecRules: ["local/not-fired", "local/rule-a"],
      validatorProjectCount: 2,
      typeSpecProjectCount: 2,
      overlapProjectCount: 1,
      validatorOnlyProjectCount: 1,
      typeSpecOnlyProjectCount: 1,
      validatorDiagnosticCount: 3,
      typeSpecDiagnosticCount: 2,
      overlapProjects: ["project-b"],
      validatorOnlyProjects: ["project-a"],
      typeSpecOnlyProjects: ["project-c"],
    });
    expect(comparison.rules[1]).toMatchObject({
      validatorRule: "ValidatorUnmapped",
      mappedTypeSpecRules: [],
      overlapProjectCount: 0,
      typeSpecProjectCount: 0,
    });
    expect(comparison.unmappedTypeSpecRules.map((entry) => entry.rule)).toEqual(["unmapped/rule"]);
  });
});
