import rulesets from "@microsoft.azure/openapi-validator-rulesets";
import { resolvePath } from "@typespec/compiler";
import { createTester, resolveVirtualPath } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

// Comparison research only; the native suite independently rejects emitter imports.
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

describe("RepeatedPathInfo JSON-name parity boundary", () => {
  it.each([
    ["json-name-only", "widgetName", 1],
    ["authored-name-only", "otherName", 0],
  ] as const)("%s emits %s with %i Swagger diagnostics", async (fixture, wireName, count) => {
    const code = (
      await readFile(
        new URL(`../fixtures/RepeatedPathInfo/encoded-names/${fixture}.tsp`, import.meta.url),
        "utf8",
      )
    ).replace('import "../../lib/imports.tsp";', "");
    const [{ outputs }, diagnostics] = await Tester.compileAndDiagnose(code);
    expect(diagnostics).toEqual([]);
    const output = Object.entries(outputs).find(([name]) => name.endsWith("openapi.json"));
    expect(output).toBeDefined();
    const swagger = JSON.parse(output![1]);
    const properties = swagger.definitions.WidgetProperties.properties;
    expect(properties).toHaveProperty(wireName);
    expect(properties).not.toHaveProperty(wireName === "widgetName" ? "otherName" : "widgetName");

    // Spectral invokes this rule on a resolved path item; resolve local references only.
    function resolve(value: unknown): unknown {
      if (Array.isArray(value)) return value.map(resolve);
      if (value === null || typeof value !== "object") return value;
      if ("$ref" in value && typeof value.$ref === "string" && value.$ref.startsWith("#/")) {
        let referenced = swagger;
        for (const segment of value.$ref.slice(2).split("/")) {
          referenced = referenced[segment.replaceAll("~1", "/").replaceAll("~0", "~")];
        }
        expect(referenced).toBeDefined();
        return resolve(referenced);
      }
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolve(item)]));
    }

    const path =
      "/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.TestService/widgets/{widgetName}";
    const validate = rulesets.spectralRulesets.azARM.rules.RepeatedPathInfo.then.function;
    const result = validate(resolve(swagger.paths[path]), {}, { path: ["paths", path] });
    expect(result).toHaveLength(count);
    if (count > 0) {
      expect(result[0].message).toBe("widgetName");
      expect(result[0].path.slice(0, 4)).toEqual(["paths", path, "put", "parameters"]);
    }
  });
});
