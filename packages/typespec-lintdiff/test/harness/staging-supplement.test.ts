import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  inventoryDataset,
  loadCoverageValidatorMembers,
  verifyBaselineRun,
  type BaselineEvidence,
} from "./native-coverage.js";
import {
  produceStagingSupplement,
  readStagingSupplement,
  selectStagingRules,
} from "./staging-supplement.js";

const rule = "PatchPropertiesCorrespondToPutProperties";
const temporary: string[] = [];
const identity = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
function write(file: string, value: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value));
}

function fixture(reference = "./schemas.json#/definitions/Put") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "staging-supplement-"));
  temporary.push(root);
  const baseline = path.join(root, "baseline");
  const dataset = path.join(baseline, "dataset");
  const output = path.join(root, "supplement");
  const project = {
    sourcePath: "specification/contoso/resource-manager/Contoso",
    compileStatus: "success",
    validationStatus: "success",
    typespecFiles: [],
    swaggerFiles: ["swagger.json"],
    swaggerAssets: ["swagger.json", "schemas.json"],
    rawFiles: [],
  };
  write(path.join(dataset, "swagger.json"), {
    swagger: "2.0",
    info: { title: "Test", version: "2026-01-01" },
    paths: {
      "/widgets/{name}": {
        put: {
          parameters: [{ in: "body", name: "body", schema: { $ref: reference } }],
          responses: {},
        },
        patch: {
          parameters: [
            {
              in: "body",
              name: "body",
              schema: { type: "object", properties: { extra: { type: "string" } } },
            },
          ],
          responses: {},
        },
      },
    },
  });
  write(path.join(dataset, "schemas.json"), {
    definitions: { Put: { type: "object", properties: { name: { type: "string" } } } },
  });
  write(path.join(dataset, "_meta.json"), {
    schemaVersion: 4,
    complete: true,
    specsCommit: "a".repeat(40),
    specsRepository: "https://github.com/Azure/azure-rest-api-specs",
    filters: { serviceType: "resource-manager" },
    projects: [project],
    resultFiles: [],
    commonTypesFiles: [],
  });
  write(path.join(dataset, "validator-results.json"), {
    schemaVersion: 4,
    specsCommit: "a".repeat(40),
    totalViolations: 0,
    rules: {},
  });
  const evidence: BaselineEvidence = {
    schemaVersion: 1,
    context: {
      specsCommit: "a".repeat(40),
      specsRepository: "https://github.com/Azure/azure-rest-api-specs",
      coreCommit: "b".repeat(40),
      nodeVersion: process.version,
      specsPackageManager: "pnpm@11",
      scope: "source",
      candidateCommit: "c".repeat(40),
      generatorFiles: [],
      toolingDependencies: [],
      runtimeInstallation: [],
      artifacts: [],
      lintArtifactContents: [],
    },
    projects: [project],
    files: inventoryDataset(dataset),
  };
  write(path.join(baseline, "baseline.json"), evidence);
  write(path.join(baseline, "manifest.json"), {
    schemaVersion: 2,
    status: "complete",
    finishedAt: new Date().toISOString(),
    baselineIdentity: identity(evidence),
  });
  return { root, baseline, dataset, output, evidence };
}

afterEach(() => {
  for (const root of temporary.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("immutable ARM staging supplements", () => {
  it("resolves retained relative references, evaluates zero-finding rules, and leaves the baseline unchanged", async () => {
    const test = fixture();
    const before = inventoryDataset(test.baseline);
    expect(() =>
      loadCoverageValidatorMembers(test.dataset, test.evidence.context, test.evidence, [rule]),
    ).toThrow(/not evaluated/);
    const result = await produceStagingSupplement(test.baseline, test.output, [
      rule,
      "QueryParametersInCollectionGet",
    ]);
    expect(result.status).toBe("complete");
    const loaded = readStagingSupplement(test.output, test.evidence, [
      rule,
      "QueryParametersInCollectionGet",
    ]);
    expect(loaded.members.get(rule)).toMatchObject([
      {
        rule,
        level: "error",
        validatorInputFile: "swagger.json",
        sourceDocuments: ["swagger.json"],
        path: ["paths", "/widgets/{name}", "patch", "parameters"],
      },
    ]);
    expect(loaded.members.get("QueryParametersInCollectionGet")).toEqual([]);
    expect(
      loadCoverageValidatorMembers(
        test.dataset,
        test.evidence.context,
        test.evidence,
        [rule],
        test.output,
      ).members.get(rule),
    ).toEqual(loaded.members.get(rule));
    expect(inventoryDataset(test.baseline)).toEqual(before);
    await expect(produceStagingSupplement(test.baseline, test.output, [rule])).rejects.toThrow(
      /new/,
    );
    await expect(
      produceStagingSupplement(test.baseline, path.join(test.baseline, "extra"), [rule]),
    ).rejects.toThrow(/outside/);
  });

  it.each([
    "./missing.json#/Foo",
    "./schemas.json#/missing",
    "../outside.json#/Foo",
    "https://example.invalid/schema.json#/Foo",
  ])("retains failed input evidence rather than treating %s as compliance", async (reference) => {
    const test = fixture(reference);
    const result = await produceStagingSupplement(test.baseline, test.output, [rule]);
    expect(result.status).toBe("failed");
    expect(result.inputs[0].status).toBe("failed");
    expect(fs.existsSync(path.join(test.output, "data", result.inputs[0].rawFile))).toBe(true);
    expect(() => readStagingSupplement(test.output, test.evidence, [rule])).toThrow(/Incomplete/);
  });

  it("rejects unknown, production, and duplicate selectors", () => {
    expect(() => selectStagingRules(["Unknown"])).toThrow(/staging-only/);
    expect(() => selectStagingRules(["EnumInsteadOfBoolean"])).toThrow(/staging-only/);
    expect(() => selectStagingRules([rule, rule])).toThrow(/distinct/);
    expect(Object.keys(selectStagingRules([]))).toContain(rule);
  });

  it("rejects wrong-parent, missing-rule, corrupt, and partial supplements", async () => {
    const test = fixture();
    await produceStagingSupplement(test.baseline, test.output, [rule]);
    expect(() =>
      readStagingSupplement(test.output, { ...test.evidence, files: [] }, [rule]),
    ).toThrow(/incompatible/);
    expect(() => readStagingSupplement(test.output, test.evidence, ["AnotherRule"])).toThrow(
      /not evaluated/,
    );
    const manifestFile = path.join(test.output, "manifest.json");
    const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
    write(manifestFile, { ...manifest, inputs: [] });
    expect(() => readStagingSupplement(test.output, test.evidence, [rule])).toThrow(/population/);
    write(manifestFile, manifest);
    fs.appendFileSync(path.join(test.output, "data", "rules", `${rule}.json`), " ");
    expect(() => readStagingSupplement(test.output, test.evidence, [rule])).toThrow(/inventory/);
  });

  it("rejects changed baseline bytes before producing diagnostics", async () => {
    const test = fixture();
    fs.appendFileSync(path.join(test.dataset, "swagger.json"), " ");
    await expect(produceStagingSupplement(test.baseline, test.output, [rule])).rejects.toThrow(
      /corrupt/,
    );
    expect(fs.existsSync(test.output)).toBe(false);
  });

  it("rejects symlinked supplement data even when the file bytes match", async () => {
    const test = fixture();
    await produceStagingSupplement(test.baseline, test.output, [rule]);
    const data = path.join(test.output, "data");
    const moved = path.join(test.root, "moved-data");
    fs.renameSync(data, moved);
    fs.symlinkSync(moved, data, process.platform === "win32" ? "junction" : "dir");
    expect(() => readStagingSupplement(test.output, test.evidence, [rule])).toThrow(/Symlinked/);
  });

  it("does not write through an output junction into the immutable parent", async () => {
    const test = fixture();
    const alias = path.join(test.root, "baseline-alias");
    fs.symlinkSync(test.baseline, alias, process.platform === "win32" ? "junction" : "dir");
    await expect(
      produceStagingSupplement(test.baseline, path.join(alias, "new-supplement"), [rule]),
    ).rejects.toThrow(/outside/);
    expect(fs.existsSync(path.join(test.baseline, "new-supplement"))).toBe(false);
  });

  it("rejects escaping references even when the changed metadata inventory is resealed", () => {
    const test = fixture();
    const metaFile = path.join(test.dataset, "_meta.json");
    const meta = JSON.parse(fs.readFileSync(metaFile, "utf8"));
    meta.commonTypesFiles = ["../outside.json"];
    write(path.join(test.baseline, "outside.json"), {});
    write(metaFile, meta);
    test.evidence.files = inventoryDataset(test.dataset);
    write(path.join(test.baseline, "baseline.json"), test.evidence);
    write(path.join(test.baseline, "manifest.json"), {
      schemaVersion: 2,
      status: "complete",
      finishedAt: new Date().toISOString(),
      baselineIdentity: identity(test.evidence),
    });
    expect(() => verifyBaselineRun(test.baseline)).toThrow(/Missing referenced dataset file/);
  });
});
