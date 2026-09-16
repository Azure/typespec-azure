import rulesets from "@microsoft.azure/openapi-validator-rulesets";
import { resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// Comparison research only. The separate native test suite does not load an emitter.
const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/rest",
    "@typespec/openapi",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-autorest",
  ],
})
  .importLibraries()
  .emit("@azure-tools/typespec-autorest", {
    "emitter-output-dir": resolveVirtualPath("tsp-output"),
    "arm-types-dir": resolveVirtualPath("common-types/resource-management"),
    "azure-resource-provider-folder": ".",
    "omit-unreachable-types": true,
  });

describe("PutInOperationName emission boundary", () => {
  it.each([undefined, null, "", 42, "Set", "set"])(
    "retains the validator's missing/non-string/ungrouped exemption for %s",
    (operationId) => {
      const validate = rulesets.spectralRulesets.azCommon.rules.PutInOperationName.then.function;
      expect(validate(operationId, {}, { path: ["paths", "/item", "put", "operationId"] })).toEqual(
        [],
      );
    },
  );

  it.each([
    ["ordinary alias", "Widgets", "set", "", "Widgets_Set", 1],
    ["create alias", "Widgets", "createOrUpdate", "", "Widgets_CreateOrUpdate", 0],
    ["group begins with Create", "CreateWidgets", "set", "", "CreateWidgets_Set", 0],
    ["underscore prefix quirk", "Widgets", "set_Create", "", "Widgets_Set_Create", 0],
    [
      "explicit OpenAPI override",
      "Widgets",
      "createOrUpdate",
      '@TypeSpec.OpenAPI.operationId("Widgets_Set")',
      "Widgets_Set",
      1,
    ],
    [
      "explicit ungrouped OpenAPI override",
      "Widgets",
      "set",
      '@TypeSpec.OpenAPI.operationId("UpdateWidget")',
      "UpdateWidget",
      0,
    ],
    [
      "SDK operation rename",
      "Widgets",
      "set",
      '@Azure.ClientGenerator.Core.clientName("create")',
      "Widgets_Create",
      0,
    ],
  ])("%s", async (_label, group, name, decorator, expectedId, expectedWarnings) => {
    const fixture = await readFile(
      new URL("../fixtures/PutInOperationName/template-name-compliance/main.tsp", import.meta.url),
      "utf8",
    );
    const code = fixture
      .replace('import "../../lib/imports.tsp";', "")
      .replace("interface Widgets", `interface ${group}`)
      .replace("createOrUpdate is", `${decorator}\n  ${name} is`);
    const [{ outputs }, diagnostics] = await Tester.compileAndDiagnose(code);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    const output = Object.entries(outputs).find(([name]) => name.endsWith("openapi.json"));
    expect(output).toBeDefined();
    const swagger = JSON.parse(output![1]);
    const resourcePath =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}";
    const operationId = swagger.paths[resourcePath].put.operationId;
    expect(operationId).toBe(expectedId);
    const validate = rulesets.spectralRulesets.azCommon.rules.PutInOperationName.then.function;
    expect(
      validate(operationId, {}, { path: ["paths", resourcePath, "put", "operationId"] }),
    ).toHaveLength(expectedWarnings);
  });

  it("emits historical operation names that a source-only rule does not reconstruct", async () => {
    const fixture = await readFile(
      new URL("../fixtures/PutInOperationName/template-name-compliance/main.tsp", import.meta.url),
      "utf8",
    );
    const code = fixture
      .replace('import "../../lib/imports.tsp";', "")
      .replace(
        "enum Versions {",
        `enum Versions {
          @useDependency(Azure.ResourceManager.CommonTypes.Versions.v5)
          v2023_01_01: "2023-01-01",`,
      )
      .replace("createOrUpdate is", '@renamedFrom(Versions.v2024_01_01, "set") createOrUpdate is');
    const [{ outputs }, diagnostics] = await Tester.compileAndDiagnose(code);
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    for (const [version, expectedId] of [
      ["2023-01-01", "Widgets_Set"],
      ["2024-01-01", "Widgets_CreateOrUpdate"],
    ]) {
      const output = Object.entries(outputs).find(
        ([name]) => name.includes(version) && name.endsWith("openapi.json"),
      );
      expect(output).toBeDefined();
      const swagger = JSON.parse(output![1]);
      const resourcePath =
        "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}";
      expect(swagger.paths[resourcePath].put.operationId).toBe(expectedId);
    }
  });
});
