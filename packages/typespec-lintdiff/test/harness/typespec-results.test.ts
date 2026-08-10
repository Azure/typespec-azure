import * as path from "path";
import { describe, expect, it } from "vitest";
import {
  aggregateTypeSpecResults,
  compareResults,
  comparisonMarkdown,
  coverageBreakdownMarkdown,
  createCoverageBreakdown,
  filterProjectedEnumDiagnostics,
  filterProjectedPointQueryDiagnostics,
  injectLocalRuleset,
  loadValidatorFixtureMetadata,
  loadValidatorMappings,
  normalizeLatestCommonTypesTypeSpecDiagnostic,
  normalizeLatestCommonTypesValidatorDiagnostic,
  parseTypeSpecDiagnostics,
  selectProjects,
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
  it("filters only EnumInsteadOfBoolean diagnostics outside the projected HTTP graph", () => {
    const enumRule = "tsp-lintdiff-local-linter/enum-instead-of-boolean";
    const diagnostics: TypeSpecDiagnostic[] = [
      {
        ...diagnostic(enumRule, project),
        sourceFile: "models.tsp",
        line: 10,
        column: 3,
      },
      {
        ...diagnostic(enumRule, project),
        sourceFile: "models.tsp",
        line: 20,
        column: 3,
      },
      diagnostic("tsp-lintdiff-local-linter/another-rule", project),
    ];

    expect(
      filterProjectedEnumDiagnostics(diagnostics, {
        apiVersion: "2026-01-01",
        serviceCount: 1,
        locations: [
          {
            sourceFile: "models.tsp",
            line: 10,
            column: 3,
            emittedName: "hidden",
          },
          {
            sourceFile: "models.tsp",
            line: 20,
            column: 3,
            emittedName: "enabled",
          },
        ],
        queryParameterLocations: [],
      }, new Set(["enabled"])),
    ).toEqual([diagnostics[1], diagnostics[2]]);
  });

  it("filters point-query diagnostics outside the selected API version", () => {
    const pointRule =
      "tsp-lintdiff-local-linter/valid-query-parameters-for-point-operations";
    const diagnostics: TypeSpecDiagnostic[] = [
      {
        ...diagnostic(pointRule, project),
        sourceFile: "operations.tsp",
        line: 10,
        column: 3,
      },
      {
        ...diagnostic(pointRule, project),
        sourceFile: "operations.tsp",
        line: 20,
        column: 3,
      },
      diagnostic("tsp-lintdiff-local-linter/another-rule", project),
    ];

    expect(
      filterProjectedPointQueryDiagnostics(diagnostics, {
        apiVersion: "2026-01-01",
        serviceCount: 1,
        locations: [],
        queryParameterLocations: [
          {
            sourceFile: "operations.tsp",
            line: 20,
            column: 3,
            name: "mode",
            verb: "delete",
          },
        ],
      }),
    ).toEqual([diagnostics[1], diagnostics[2]]);
  });

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

describe("TypeSpec project selection", () => {
  it("filters and limits projects from the existing dataset manifest", () => {
    const projects = ["Advisor", "Compute", "Network"].map((name) => ({
      sourcePath: `specification/${name.toLowerCase()}/${name}`,
      typespecPath: `projects/${name}/typespec`,
      rawFiles: [],
    }));

    expect(selectProjects(projects, "advisor", 1).map((item) => item.sourcePath)).toEqual([
      "specification/advisor/Advisor",
    ]);
    expect(selectProjects(projects, undefined, Number.POSITIVE_INFINITY)).toEqual(projects);
  });
});

describe("validator and TypeSpec comparison", () => {
  it("normalizes repeated common-types references to a semantic project/version identity", () => {
    const validatorDiagnostic = {
      project: "project-a",
      swaggerFile: "swagger.json",
      message: "Use the latest version v6 of types.json.",
      path: ["paths", "/items", "get", "parameters", 0, "$ref"],
    };
    const swagger = {
      paths: {
        "/items": {
          get: {
            parameters: [
              {
                $ref: "../../../../../common-types/resource-management/v4/types.json#/parameters/ApiVersionParameter",
              },
            ],
          },
        },
      },
    };
    const typeSpecDiagnostic = {
      ...diagnostic(
        "tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used",
        "project-a",
      ),
      message: "Use the latest ARM common-types version 'v6' instead of 'v4'.",
    };

    expect(
      normalizeLatestCommonTypesValidatorDiagnostic(
        validatorDiagnostic,
        swagger,
        "2026-01-01",
      ),
    ).toBe(`project-a\0${"2026-01-01"}\0v4`);
    expect(
      normalizeLatestCommonTypesTypeSpecDiagnostic(
        { ...typeSpecDiagnostic, line: 2 },
        "2026-01-01",
        ['enum Versions {', '  v2026_01_01: "2026-01-01",', "}"].join("\n"),
      ),
    ).toBe(`project-a\0${"2026-01-01"}\0v4`);
    expect(
      normalizeLatestCommonTypesTypeSpecDiagnostic(
        { ...typeSpecDiagnostic, line: 2 },
        "2026-01-01",
        ['enum Versions {', '  v2025_01_01: "2025-01-01",', "}"].join("\n"),
      ),
    ).toBeUndefined();
  });

  it("reports exact consistency after common-types reference deduplication", () => {
    const rule = "LatestVersionOfCommonTypesMustBeUsed";
    const typeSpecRule =
      "tsp-lintdiff-local-linter/latest-version-of-common-types-must-be-used";
    const aggregate = aggregateTypeSpecResults("commit", "2026-08-07T00:00:00.000Z", [
      {
        ...diagnostic(typeSpecRule, "project-a"),
        message: "Use the latest ARM common-types version 'v6' instead of 'v4'.",
      },
      {
        ...diagnostic(typeSpecRule, "project-a"),
        message: "Use the latest ARM common-types version 'v6' instead of 'v4'.",
      },
    ]);
    const validatorDiagnostic = {
      project: "project-a",
      swaggerFile: "swagger.json",
      message: "Use the latest version v6 of types.json.",
      path: ["reference"],
    };
    const comparison = compareResults(
      "commit",
      "2026-08-07T00:00:00.000Z",
      {
        [rule]: {
          count: 2,
          projects: ["project-a"],
          results: [validatorDiagnostic, validatorDiagnostic],
        },
      },
      aggregate,
      new Map([[rule, new Set([typeSpecRule])]]),
      {
        partial: false,
        sourceProjectCount: 1,
        projects: ["project-a"],
        filters: {},
      },
      {
        normalizationContext: {
          selectedApiVersions: new Map([["project-a", "2026-01-01"]]),
          loadSwaggerDocument: () => ({
            reference:
              "../../../../../common-types/resource-management/v4/types.json#/parameters/ApiVersionParameter",
          }),
          loadTypeSpecSource: () => 'v2026_01_01: "2026-01-01",',
        },
      },
    );

    expect(comparison.rules[0]).toMatchObject({
      validatorDiagnosticCount: 2,
      typeSpecDiagnosticCount: 2,
      normalizedValidatorDiagnosticCount: 1,
      normalizedTypeSpecDiagnosticCount: 1,
      diagnosticConsistencyPercent: 100,
      normalizationMethod: "project + selected API version + ARM common-types version",
    });
  });

  it("loads validator-to-TypeSpec mappings from fixture frontmatter", () => {
    const fixturesDir = path.resolve(import.meta.dirname, "..", "fixtures");
    const mappings = loadValidatorMappings(fixturesDir);
    const metadata = loadValidatorFixtureMetadata(fixturesDir);

    expect(mappings.get("DeleteInOperationName")).toEqual(
      new Set(["tsp-lintdiff-local-linter/delete-in-operation-name"]),
    );
    expect(mappings.get("AdditionalPropertiesObject")).toEqual(new Set());
    expect(mappings.get("PostResponseCodes")).toEqual(
      new Set(["@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"]),
    );
    expect(metadata.get("DeleteInOperationName")?.coverageKind).toBe("lint");
    expect(metadata.get("PostResponseCodes")?.tspLints).toEqual(mappings.get("PostResponseCodes"));
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
      {
        partial: true,
        sourceProjectCount: 2,
        projects: ["project-a", "project-b"],
        filters: { path: "project" },
      },
    );

    expect(comparison).toMatchObject({
      partial: true,
      sourceProjectCount: 2,
      projectCount: 2,
      projects: ["project-a", "project-b"],
      filters: { path: "project" },
    });
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

  it("excludes failed projects from overlap, gaps, and TypeSpec-only coverage", () => {
    const aggregate = aggregateTypeSpecResults("commit", "2026-08-07T00:00:00.000Z", [
      diagnostic("local/rule-a", "project-success"),
      diagnostic("local/rule-a", "project-failed"),
      diagnostic("unmapped/rule", "project-failed"),
    ]);
    const comparison = compareResults(
      "commit",
      "2026-08-07T00:00:00.000Z",
      {
        ValidatorA: {
          count: 2,
          projects: ["project-success", "project-failed"],
          results: [
            {
              project: "project-success",
              message: "validator message",
              path: [],
            },
            {
              project: "project-failed",
              message: "validator message",
              path: [],
            },
          ],
        },
      },
      aggregate,
      new Map([["ValidatorA", new Set(["local/rule-a"])]]),
      {
        partial: false,
        sourceProjectCount: 2,
        projects: ["project-success", "project-failed"],
        filters: {},
      },
      { failedProjects: new Set(["project-failed"]) },
    );

    expect(comparison.rules[0]).toMatchObject({
      validatorProjectCount: 1,
      assessableValidatorProjectCount: 1,
      overlapProjectCount: 1,
      validatorOnlyProjectCount: 0,
      unassessedProjectCount: 0,
      typeSpecOnlyProjectCount: 0,
      observedCoveragePercent: 100,
      typeSpecDiagnosticCount: 1,
      validatorDiagnosticCount: 1,
      unassessedProjects: [],
    });
    expect(comparison.unmappedTypeSpecRules).toEqual([]);
    expect(comparison).toMatchObject({
      successfulProjectCount: 1,
      failedProjectCount: 1,
      projectCount: 1,
      projects: ["project-success"],
      unassessedProjects: ["project-failed"],
    });
  });

  it("includes catalog, fixture, and dataset rules even when they have zero results", () => {
    const comparison = compareResults(
      "commit",
      "2026-08-07T00:00:00.000Z",
      {
        DatasetOnly: { count: 1, projects: ["project-a"] },
      },
      aggregateTypeSpecResults("commit", "2026-08-07T00:00:00.000Z", []),
      new Map([["FixtureOnly", new Set(["local/not-fired"])]]),
      {
        partial: false,
        sourceProjectCount: 1,
        projects: ["project-a"],
        filters: {},
      },
      { knownValidatorRules: ["CatalogOnly"] },
    );

    expect(comparison.rules.map((entry) => entry.validatorRule)).toEqual([
      "CatalogOnly",
      "DatasetOnly",
      "FixtureOnly",
    ]);
    expect(comparison.rules[0]).toMatchObject({
      validatorProjectCount: 0,
      validatorDiagnosticCount: 0,
      mappedTypeSpecRules: [],
    });
    expect(comparison.rules[2]).toMatchObject({
      validatorProjectCount: 0,
      typeSpecProjectCount: 0,
      mappedTypeSpecRules: ["local/not-fired"],
      firedTypeSpecRules: [],
    });
  });

  it("categorizes observed coverage and renders the investigation fields", () => {
    const aggregate = aggregateTypeSpecResults("commit", "2026-08-07T00:00:00.000Z", [
      diagnostic("@azure-tools/official", "project-a"),
      diagnostic("@azure-tools/official", "project-b"),
      diagnostic("local/partial", "project-a"),
      diagnostic("unmapped/type-spec", "project-b"),
    ]);
    const mappings = new Map([
      ["Full", new Set(["@azure-tools/official"])],
      ["Partial", new Set(["local/partial"])],
      ["Zero", new Set(["local/not-fired"])],
      ["Never", new Set(["local/not-fired"])],
      ["Unmapped", new Set<string>()],
    ]);
    const fixtureMetadata = new Map([
      ["Full", { coverageKind: "lint", tspLints: mappings.get("Full")! }],
    ]);
    const comparison = compareResults(
      "commit",
      "2026-08-07T00:00:00.000Z",
      {
        Full: { count: 2, projects: ["project-a", "project-b"] },
        Partial: { count: 2, projects: ["project-a", "project-b"] },
        Zero: { count: 1, projects: ["project-a"] },
        Unmapped: { count: 1, projects: ["project-a"] },
      },
      aggregate,
      mappings,
      {
        partial: true,
        sourceProjectCount: 3,
        projects: ["project-a", "project-b"],
        filters: { limit: 2 },
      },
      { durationMs: 1234, fixtureMetadata },
    );
    const breakdown = createCoverageBreakdown(comparison);

    expect(breakdown.categories).toMatchObject({
      hundredPercentObservedCoverage: ["Full"],
      partialObservedCoverage: ["Partial"],
      zeroObservedCoverage: ["Zero"],
      unmappedValidatorRules: ["Unmapped"],
      validatorRulesNeverFired: ["Never"],
      typeSpecOnlyRules: ["unmapped/type-spec"],
    });
    expect(comparison.rules.find((entry) => entry.validatorRule === "Full")).toMatchObject({
      coverageKind: "lint",
      officialMapping: true,
      firedTypeSpecRules: ["@azure-tools/official"],
      observedCoveragePercent: 100,
    });
    expect(comparison.rules.find((entry) => entry.validatorRule === "Partial")).toMatchObject({
      observedCoveragePercent: 50,
    });

    const coverageMarkdown = coverageBreakdownMarkdown(breakdown);
    expect(coverageMarkdown).toContain("Analysis duration: 1234 ms");
    expect(coverageMarkdown).toContain("Official mappings and fixture coverage kinds");
    expect(coverageMarkdown).toContain(
      "| Validator Rule | CovKind | Fired | TSP Fired | Lint/Overlap | Gap | TSP Only | Observed % | Official Mapping | Fired TSP Rules | Mapped TSP Rules | Validator Diagnostics | TSP Diagnostics |",
    );
    expect(coverageMarkdown).not.toContain("Normalized Validator Diagnostics");
    expect(coverageMarkdown).not.toContain("Unassessed");
    expect(comparisonMarkdown(comparison)).toContain("## Column definitions");
  });
});
