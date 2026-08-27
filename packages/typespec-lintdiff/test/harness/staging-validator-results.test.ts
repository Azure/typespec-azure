import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { generateStagingValidatorResults } from "./staging-validator-results.js";

const specsCommit = "0123456789abcdef";
const temporaryDirectories: string[] = [];

function createDataset(): string {
  const datasetDir = fs.mkdtempSync(path.join(os.tmpdir(), "lintdiff-staging-"));
  temporaryDirectories.push(datasetDir);
  fs.writeFileSync(
    path.join(datasetDir, "_meta.json"),
    JSON.stringify({ specsCommit, projects: [] }),
  );
  return datasetDir;
}

function writeIndex(datasetDir: string, commit = specsCommit): void {
  fs.writeFileSync(
    path.join(datasetDir, "staging-validator-results.json"),
    JSON.stringify({
      schemaVersion: 6,
      specsCommit: commit,
      generatedAt: "2026-08-26T00:00:00.000Z",
      rules: {
        ValidQueryParametersForPointOperations: {
          count: 4,
          levels: { error: 4 },
          resultsFile: "results/by-staging-rule/ValidQueryParametersForPointOperations.json",
        },
        QueryParametersInCollectionGet: {
          count: 5,
          levels: { error: 5 },
          resultsFile: "results/by-staging-rule/QueryParametersInCollectionGet.json",
        },
      },
    }),
  );
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("staging validator results", () => {
  it("retains other same-commit rules and replaces the selected rule", async () => {
    const datasetDir = createDataset();
    writeIndex(datasetDir);

    await generateStagingValidatorResults(datasetDir, "QueryParametersInCollectionGet");

    const index = JSON.parse(
      fs.readFileSync(path.join(datasetDir, "staging-validator-results.json"), "utf8"),
    );
    expect(index.rules.ValidQueryParametersForPointOperations).toMatchObject({
      count: 4,
      levels: { error: 4 },
    });
    expect(index.rules.QueryParametersInCollectionGet).toMatchObject({
      count: 0,
      levels: { error: 0 },
    });
  });

  it("rejects an index generated from a different specs commit", async () => {
    const datasetDir = createDataset();
    writeIndex(datasetDir, "different-commit");

    await expect(
      generateStagingValidatorResults(datasetDir, "QueryParametersInCollectionGet"),
    ).rejects.toThrow(
      `Existing staging validator results use specs commit different-commit; expected ${specsCommit}.`,
    );
    expect(
      fs.existsSync(
        path.join(datasetDir, "results", "by-staging-rule", "QueryParametersInCollectionGet.json"),
      ),
    ).toBe(false);
  });
});
