import { getDirectoryPath, NodeHost } from "@typespec/compiler";
import path from "path";
import { Project } from "ts-morph";
import { fileURLToPath } from "url";
import { beforeEach, describe, expect, it } from "vitest";
import { loadStaticHelpers } from "../../src/framework/load-static-helpers.js";
import { refkey } from "../../src/framework/refkey.js";

const __dirname = getDirectoryPath(fileURLToPath(import.meta.url));

describe("loadStaticHelpers", () => {
  let project: Project;
  let helpersAssetDirectory: string;
  beforeEach(() => {
    project = new Project();
    helpersAssetDirectory = path.resolve(__dirname, "assets/static-helpers");
  });

  it("should load static helpers", async () => {
    const helpers = {
      buildCsvCollection: {
        kind: "function",
        name: "buildCsvCollection",
        location: "utils.ts",
      },
    } as const;
    const helperDeclarations = await loadStaticHelpers(project, helpers, {
      host: NodeHost,
      helpersAssetDirectory,
    });
    expect(
      project
        .getSourceFiles()
        .some((file) => file.getFilePath().endsWith("/static-helpers/utils.ts")),
    ).toBe(true);
    const buildCsvCollectionDeclaration = helperDeclarations.get(
      refkey(helpers.buildCsvCollection),
    );
    expect(buildCsvCollectionDeclaration).toEqual(helpers.buildCsvCollection);
  });

  it("should handle missing helpers gracefully", async () => {
    const helpers = {
      buildCsvCollection: {
        kind: "function",
        name: "nonExisting",
        location: "utils.ts",
      },
    } as const;

    await expect(
      loadStaticHelpers(project, helpers, {
        host: NodeHost,
        helpersAssetDirectory,
      }),
    ).rejects.toThrowError(/not found/);
  });

  it("should handle invalid helper kind gracefully", async () => {
    const helpers = {
      buildCsvCollection: {
        kind: "invalid",
        name: "buildCsvCollection",
        location: "utils.ts",
      },
    } as any;

    await expect(
      loadStaticHelpers(project, helpers, {
        host: NodeHost,
        helpersAssetDirectory,
      }),
    ).rejects.toThrowError(/invalid helper kind/);
  });
});
