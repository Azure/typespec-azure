import { createHash, randomUUID } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { gzipSync } from "node:zlib";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNativeCoverageReport,
  buildNativePackageEvidenceReport,
  inventoryDataset,
  packedFileInventory,
  parseNativeCoverageArgs,
  prepareCoverageBaseline,
  readCoverageDataset,
  reuseBaseline,
  validateBaselineCompatibility,
  type BaselineContext,
  type BaselineEvidence,
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

  it("supports many validators to one native rule", () => {
    expect(
      parseNativeCoverageArgs([...args, "--validator-rule", "OtherRule"]).validatorRules,
    ).toEqual(["EnumInsteadOfBoolean", "OtherRule"]);
  });

  it.each([
    ["--validator-rule", "EnumInsteadOfBoolean"],
    ["--validator-rule", "OtherRule", "--tsp-rule", "@azure-tools/typespec-azure-core/other"],
    ["--baseline-compatibility-receipt", "receipt.json"],
  ])("rejects duplicates, many-to-many and orphan receipts: %j", (...extra) => {
    expect(() => parseNativeCoverageArgs([...args, ...extra])).toThrow();
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

  it("requires an explicit official package for non-lint evidence", () => {
    expect(
      parseNativeCoverageArgs(
        args.slice(0, -2).concat(["--native-package", "@azure-tools/typespec-azure-core"]),
      ),
    ).toMatchObject({
      tspRules: [],
      nativePackage: "@azure-tools/typespec-azure-core",
      scope: "source",
    });
    expect(() => parseNativeCoverageArgs(args.slice(0, -2))).toThrow(/--tsp-rule/);
  });

  it.each([
    ["--native-package", "@azure-tools/typespec-azure-core"],
    ["--native-package", "unrelated-package"],
  ])("does not mix package evidence with lint mappings: %j", (...extra) => {
    expect(() => parseNativeCoverageArgs([...args, ...extra])).toThrow();
  });

  it("rejects non-source package evidence and duplicate package targets", () => {
    const evidence = [...args.slice(0, -2), "--native-package", "@azure-tools/typespec-azure-core"];
    expect(() => parseNativeCoverageArgs([...evidence, "--scope", "http-reachable"])).toThrow();
    expect(() =>
      parseNativeCoverageArgs([
        ...evidence,
        "--native-package",
        "@azure-tools/typespec-azure-core",
      ]),
    ).toThrow();
    expect(() =>
      parseNativeCoverageArgs([...args.slice(0, -2), "--native-package", "unrelated"]),
    ).toThrow();
  });
});

describe("native package evidence accounting", () => {
  const nativePackage = "@azure-tools/typespec-azure-core";
  function receipt(name = project): NativeProjectResult {
    return {
      project: name,
      status: "success",
      assessmentMode: "package-evidence",
      nativePackage,
      rawDiagnostics: [],
      diagnostics: [],
      packages: [{ name: nativePackage, version: "test", entrypoint: "test.js" }],
    };
  }
  it("retains real Swagger counts without zero native counts or equality claims", () => {
    const result = buildNativePackageEvidenceReport(
      [datasetProject()],
      [{ ...validatorResult(), rule: "LegacyRule" }],
      [receipt()],
      nativePackage,
      ["LegacyRule"],
    );
    expect(result).toMatchObject({
      assessmentMode: "package-evidence",
      validatorRawCount: 1,
      nativeDiagnosticCounts: null,
      diagnosticComparison: null,
      observedProjectCoveragePercent: null,
      equivalence: "not-assessed",
    });
    expect(result).not.toHaveProperty("projectsWithEqualCounts");
    expect(result).not.toHaveProperty("nativeRawCount");
    expect(result.projects[0].nativeDiagnosticCounts).toBeNull();
    expect(result.members[0]).toMatchObject({ rawCount: 1, assessableRawCount: 1 });
  });
  it("keeps compiler failures unassessed with their Swagger observations", () => {
    const result = buildNativePackageEvidenceReport(
      [datasetProject()],
      [{ ...validatorResult(), rule: "LegacyRule" }],
      [{ ...receipt(), status: "failed", error: "Compile failure" }],
      nativePackage,
      ["LegacyRule"],
    );
    expect(result.assessableProjectCount).toBe(0);
    expect(result.unassessedValidatorRawCount).toBe(1);
    expect(result.unassessedProjects).toEqual([{ project, reason: "Compile failure" }]);
    expect(result.members[0]).toMatchObject({ rawCount: 1, unassessedRawCount: 1 });
  });
  it.each([
    { ...receipt(), nativePackage: "@azure-tools/typespec-client-generator-core" },
    { ...receipt(), assessmentMode: undefined },
    { ...receipt(), diagnostics: [diagnostic] },
    { ...receipt(), rawDiagnostics: [diagnostic] },
    { ...receipt(), packages: [] },
  ])("rejects unbound or lint-bearing receipts", (invalid) => {
    expect(() =>
      buildNativePackageEvidenceReport([datasetProject()], [], [invalid], nativePackage, [
        "LegacyRule",
      ]),
    ).toThrow(/receipt/);
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
    expect(report.rawValidatorExcess).toBe(1);
    expect(report.rawNativeExcess).toBe(1);
    expect(report.projectsWithEqualCounts).toBe(0);
  });

  it("retains same-path member observations and counts native only once", () => {
    const report = buildNativeCoverageReport(
      [datasetProject()],
      [
        { ...validatorResult(), rule: "First" },
        { ...validatorResult(), rule: "Second" },
      ],
      [nativeResult()],
      ["First", "Second", "NeverFired"],
    );
    expect(report.validatorRawCount).toBe(2);
    expect(report.validatorFileIndependentCount).toBe(2);
    expect(report.nativeAlignedCount).toBe(1);
    expect(report.rawValidatorExcess).toBe(1);
    expect(report.memberNativeAttribution).toMatch(/unavailable/);
    expect(report.members.map((member) => [member.rule, member.rawCount])).toEqual([
      ["First", 1],
      ["Second", 1],
      ["NeverFired", 0],
    ]);
    expect(report.members[2]).toMatchObject({
      nativeAttribution: "unavailable",
      semanticCompleteness: "not-determined",
      projects: [],
    });
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

  describe("retained native coverage baselines", () => {
    const directories: string[] = [];
    const identity = (value: unknown) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex");
    function write(file: string, value: unknown) {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(value));
    }
    function fixture() {
      const root = path.resolve(`.native-coverage-test-${randomUUID()}`);
      directories.push(root);
      fs.mkdirSync(root);
      const run = path.join(root, "run");
      const dataset = path.join(run, "dataset");
      const context: BaselineContext = {
        specsCommit: "specs-sha",
        specsRepository: "specs-origin",
        coreCommit: "core-sha",
        candidateCommit: "candidate-sha",
        nodeVersion: "v26",
        specsPackageManager: "pnpm@12",
        scope: "source",
        generatorFiles: [{ file: "generator", sha256: "generator-sha" }],
        toolingDependencies: [{ file: "lock", sha256: "lock-sha" }],
        runtimeInstallation: [{ file: "installed-lock", sha256: "runtime-sha" }],
        artifacts: [{ file: "azure-tools-typespec-azure-core-1.tgz", sha256: "artifact-sha" }],
        lintArtifactContents: [
          {
            artifact: "azure-tools-typespec-azure-core-1.tgz",
            files: [
              { file: "package/package.json", sha256: "metadata-sha" },
              { file: "package/dist/src/decorators.js", sha256: "emission-sha" },
              { file: "package/dist/src/rules/example.js", sha256: "lint-sha" },
            ],
          },
        ],
      };
      const projects = [
        {
          ...datasetProject(),
          typespecFiles: ["source.tsp"],
          swaggerFiles: ["swagger.json"],
          swaggerAssets: ["swagger.json"],
          rawFiles: ["raw.json"],
        },
      ];
      write(path.join(dataset, "_meta.json"), {
        schemaVersion: 4,
        complete: true,
        specsCommit: context.specsCommit,
        specsRepository: context.specsRepository,
        filters: { serviceType: "resource-manager" },
        resultFiles: ["results/First.json"],
        commonTypesFiles: [],
        projects,
      });
      write(path.join(dataset, "validator-results.json"), {
        schemaVersion: 4,
        specsCommit: context.specsCommit,
        totalViolations: 1,
        rules: { First: { count: 1, resultsFile: "results/First.json" } },
      });
      write(path.join(dataset, "results", "First.json"), {
        schemaVersion: 4,
        specsCommit: context.specsCommit,
        rule: "First",
        results: [{ ...validatorResult(), rule: "First" }],
      });
      for (const file of ["source.tsp", "swagger.json", "raw.json", "failure-inventory.json"]) {
        write(path.join(dataset, file), { retained: file });
      }
      const evidence: BaselineEvidence = {
        schemaVersion: 1,
        context,
        projects,
        files: inventoryDataset(dataset),
      };
      write(path.join(run, "baseline.json"), evidence);
      write(path.join(run, "manifest.json"), {
        schemaVersion: 2,
        status: "complete",
        finishedAt: "2026-10-20",
        baselineIdentity: identity(evidence),
      });
      return { root, run, dataset, context, evidence, destination: path.join(root, "copy") };
    }
    afterEach(() => {
      for (const directory of directories.splice(0))
        fs.rmSync(directory, { recursive: true, force: true });
    });

    it("reuses every dataset file without invoking Swagger generation or validation", async () => {
      const test = fixture();
      const generateSwaggerAndValidate = vi.fn();
      const result = await prepareCoverageBaseline(
        { baselineRun: test.run },
        test.destination,
        test.context,
        generateSwaggerAndValidate,
      );
      expect(generateSwaggerAndValidate).not.toHaveBeenCalled();
      expect(inventoryDataset(test.destination)).toEqual(test.evidence.files);
      expect(result.provenance?.baselineIdentity).toBe(identity(test.evidence));
      expect(readCoverageDataset(test.destination, test.context).members.get("First")).toHaveLength(
        1,
      );
    });

    it("generates a fresh baseline when reuse is not requested", async () => {
      const test = fixture();
      const generate = vi.fn(async () => {
        fs.cpSync(test.dataset, test.destination, { recursive: true });
      });
      const result = await prepareCoverageBaseline({}, test.destination, test.context, generate);
      expect(generate).toHaveBeenCalledOnce();
      expect(result.provenance).toBeUndefined();
      expect(result.evidence.files).toEqual(test.evidence.files);
    });

    it("does not fall back to generation when the retained run is missing", async () => {
      const test = fixture();
      const generate = vi.fn();
      await expect(
        prepareCoverageBaseline(
          { baselineRun: path.join(test.root, "missing") },
          test.destination,
          test.context,
          generate,
        ),
      ).rejects.toThrow();
      expect(generate).not.toHaveBeenCalled();
    });

    it("accepts an explicit empty validator index without inventing observations", () => {
      const test = fixture();
      const metaFile = path.join(test.dataset, "_meta.json");
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      meta.resultFiles = [];
      write(metaFile, meta);
      write(path.join(test.dataset, "validator-results.json"), {
        schemaVersion: 4,
        specsCommit: test.context.specsCommit,
        totalViolations: 0,
        rules: {},
      });
      expect(readCoverageDataset(test.dataset, test.context).members.size).toBe(0);
    });

    it("rejects a corrupt shard count independently of its inventory hash", () => {
      const test = fixture();
      const shardFile = path.join(test.dataset, "results", "First.json");
      const shard = JSON.parse(fs.readFileSync(shardFile, "utf8"));
      shard.results = [];
      write(shardFile, shard);
      expect(() => readCoverageDataset(test.dataset, test.context)).toThrow(/shard/);
    });

    it.each(["incomplete", "failed", "running"])("rejects %s retained runs", (status) => {
      const test = fixture();
      write(path.join(test.run, "manifest.json"), {
        schemaVersion: 2,
        status,
        finishedAt: "2026-10-20",
        baselineIdentity: identity(test.evidence),
      });
      expect(() => reuseBaseline(test.run, test.destination, test.context)).toThrow(/completed/);
    });

    it.each(["missing", "modified", "extra"])("rejects %s dataset files", (mode) => {
      const test = fixture();
      const raw = path.join(test.dataset, "raw.json");
      if (mode === "missing") fs.unlinkSync(raw);
      else write(mode === "extra" ? path.join(test.dataset, "extra.json") : raw, {});
      expect(() => reuseBaseline(test.run, test.destination, test.context)).toThrow(
        /inventory|hash/,
      );
    });

    it.each([
      { specsCommit: "changed" },
      { specsRepository: "changed" },
      { scope: "http-reachable" as const },
      { filter: "different" },
      { limit: 8 },
      { coreCommit: "changed" },
      { nodeVersion: "changed" },
      { generatorFiles: [] },
      { toolingDependencies: [] },
    ])("rejects incompatible selection/runtime/generator context: %j", (change) => {
      const test = fixture();
      expect(() =>
        reuseBaseline(test.run, test.destination, { ...test.context, ...change }),
      ).toThrow(/incompatible/);
    });

    it("requires a content-bound review receipt for changed lint artifacts", () => {
      const test = fixture();
      const candidate = {
        ...test.context,
        candidateCommit: "new-candidate",
        artifacts: [{ ...test.context.artifacts[0], sha256: "new-lint-artifact" }],
        runtimeInstallation: [{ file: "installed-lock", sha256: "updated-lint-lock" }],
        lintArtifactContents: [
          {
            ...test.context.lintArtifactContents[0],
            files: test.context.lintArtifactContents[0].files.map((item) =>
              item.file.includes("/rules/") ? { ...item, sha256: "new-lint-sha" } : item,
            ),
          },
        ],
      };
      expect(() => validateBaselineCompatibility(test.evidence, candidate)).toThrow(/receipt/);
      const receipt = {
        schemaVersion: 1,
        baselineIdentity: identity(test.evidence),
        candidateContextIdentity: identity(candidate),
        reviewedBy: "reviewer",
        rationale: "Reviewed source and built content; only the lint predicate changed.",
        assertions: {
          lintOnly: true,
          unchangedCompiler: true,
          unchangedLibraries: true,
          unchangedEmission: true,
          unchangedMetadata: true,
          unchangedDependencies: true,
          noUnknownChanges: true,
        },
      };
      expect(() => validateBaselineCompatibility(test.evidence, candidate, receipt)).not.toThrow();
      expect(() =>
        validateBaselineCompatibility(test.evidence, candidate, {
          ...receipt,
          candidateContextIdentity: "stale",
        }),
      ).toThrow(/receipt/);
      expect(() =>
        validateBaselineCompatibility(test.evidence, candidate, {
          ...receipt,
          assertions: { ...receipt.assertions, unchangedMetadata: false },
        }),
      ).toThrow(/receipt/);
    });

    it("never waives changed compiler/emitter artifacts through a receipt", () => {
      const test = fixture();
      expect(() =>
        validateBaselineCompatibility(
          test.evidence,
          {
            ...test.context,
            artifacts: [{ file: "typespec-compiler-1.tgz", sha256: "changed" }],
          },
          {},
        ),
      ).toThrow(/invalidate/);
    });

    it.each(["package/package.json", "package/dist/src/decorators.js"])(
      "rejects changed packed emission or metadata content: %s",
      (file) => {
        const test = fixture();
        expect(() =>
          validateBaselineCompatibility(
            test.evidence,
            {
              ...test.context,
              artifacts: [{ ...test.context.artifacts[0], sha256: "changed" }],
              lintArtifactContents: [
                {
                  ...test.context.lintArtifactContents[0],
                  files: test.context.lintArtifactContents[0].files.map((item) =>
                    item.file === file ? { ...item, sha256: "changed" } : item,
                  ),
                },
              ],
            },
            {},
          ),
        ).toThrow(/closure/);
      },
    );

    it("inventories packed file content and rejects links or escaped paths", () => {
      function archive(file: string, type = "0") {
        const header = Buffer.alloc(512);
        header.write(file);
        header.write("00000000003", 124);
        header.write(type, 156);
        return gzipSync(Buffer.concat([header, Buffer.from("abc"), Buffer.alloc(509 + 1024)]));
      }
      expect(packedFileInventory(archive("package/package.json"))).toEqual([
        {
          file: "package/package.json",
          sha256: createHash("sha256").update("abc").digest("hex"),
        },
      ]);
      expect(() => packedFileInventory(archive("package/../outside"))).toThrow(/escapes/);
      expect(() => packedFileInventory(archive("package/link", "2"))).toThrow(/entry type/);
    });

    it("rejects altered project population even with a newly sealed inventory", () => {
      const test = fixture();
      const metaFile = path.join(test.dataset, "_meta.json");
      const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
      meta.projects[0].apiVersion = "2027-01-01";
      write(metaFile, meta);
      const evidence = { ...test.evidence, files: inventoryDataset(test.dataset) };
      write(path.join(test.run, "baseline.json"), evidence);
      write(path.join(test.run, "manifest.json"), {
        schemaVersion: 2,
        status: "complete",
        finishedAt: new Date().toISOString(),
        baselineIdentity: identity(evidence),
      });
      expect(() => reuseBaseline(test.run, test.destination, test.context)).toThrow(
        /project population/i,
      );
    });

    it.each(["schema", "incomplete", "failed", "empty", "escape"])(
      "validates dataset semantics independently of hashes: %s",
      (mode) => {
        const test = fixture();
        const file = path.join(test.dataset, "_meta.json");
        const meta = JSON.parse(fs.readFileSync(file, "utf8"));
        if (mode === "schema") meta.schemaVersion = 0;
        if (mode === "incomplete") meta.complete = false;
        if (mode === "failed") meta.projects[0].validationStatus = "failed";
        if (mode === "empty") meta.projects = [];
        if (mode === "escape") meta.resultFiles = ["../outside.json"];
        write(file, meta);
        expect(() => readCoverageDataset(test.dataset, test.context, true)).toThrow();
      },
    );
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
