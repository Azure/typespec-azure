import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createGroupUrlResolver } from "../../.github/scripts/spector-coverage-report-typescript.js";

describe("Spector coverage report group links", () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), "spector-coverage-report-"));
    await writeFile(path.join(workspace, "package.json"), '{"type":"module"}');
    await Promise.all(
      ["packages/azure-http-specs", "core/packages/http-specs"].map((directory) =>
        mkdir(path.join(workspace, directory, "dist/specs"), { recursive: true }),
      ),
    );
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  async function writeMockApi(packageDirectory: string, directory: string, content: string) {
    const destination = path.join(workspace, packageDirectory, "dist/specs", directory);
    await mkdir(destination, { recursive: true });
    await writeFile(path.join(destination, "mockapi.js"), content);
  }

  it("links dynamically registered groups and literal registrations to their source directory", async () => {
    await writeMockApi(
      "core/packages/http-specs",
      "type/union/discriminated/extends",
      `
        export const Scenarios = {};
        for (const name of [
          "CustomDiscriminator",
          "EnumDiscriminator",
          "ExplicitDiscriminator",
          "InjectedDiscriminator",
        ]) {
          const group = \`Type_Union_Discriminated_Extends_\${name}_Operations\`;
          for (const operation of ["getCat", "getDog", "putCat", "putDog"]) {
            Scenarios[\`\${group}_\${operation}\`] = {};
          }
        }
        Scenarios.Type_Union_Discriminated_Extends_Recursive_get = {};
      `,
    );

    const resolve = await createGroupUrlResolver(workspace);
    for (const group of [
      "CustomDiscriminator_Operations",
      "EnumDiscriminator_Operations",
      "ExplicitDiscriminator_Operations",
      "InjectedDiscriminator_Operations",
      "Recursive",
    ]) {
      expect(resolve("@typespec/http-specs", `Type_Union_Discriminated_Extends_${group}`)).toBe(
        "https://github.com/microsoft/typespec/tree/main/packages/http-specs/specs/type/union/discriminated/extends",
      );
    }
  });

  it("keeps package sources separate and does not match unregistered scenario names", async () => {
    await writeMockApi(
      "packages/azure-http-specs",
      "azure/core/page",
      `
        export const Scenarios = {};
        Scenarios.Azure_Core_Page_list = {};
        // Scenarios.Comment_Only_get = {};
      `,
    );
    await writeMockApi(
      "core/packages/http-specs",
      "other/page",
      "export const Scenarios = { Azure_Core_Page_list: {} };",
    );

    const resolve = await createGroupUrlResolver(workspace);
    expect(resolve("@azure-tools/azure-http-specs", "Azure_Core_Page")).toBe(
      "https://github.com/Azure/typespec-azure/tree/main/packages/azure-http-specs/specs/azure/core/page",
    );
    expect(resolve("@typespec/http-specs", "Azure_Core_Page")).toBe(
      "https://github.com/microsoft/typespec/tree/main/packages/http-specs/specs/other/page",
    );
    expect(resolve("@azure-tools/azure-http-specs", "Comment_Only")).toBeUndefined();
    expect(resolve("@typespec/http-specs", "Azure_Core_Pag")).toBeUndefined();
    expect(resolve("@typespec/http-specs", "Unknown")).toBeUndefined();
    expect(resolve("unknown-package", "Azure_Core_Page")).toBeUndefined();
  });

  it("reports invalid mock API exports instead of silently omitting links", async () => {
    await writeMockApi("core/packages/http-specs", "invalid", "export const Scenarios = null;");

    await expect(createGroupUrlResolver(workspace)).rejects.toThrow(
      "Mock API file does not export a Scenarios object:",
    );
  });
});
