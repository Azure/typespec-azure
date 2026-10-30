import { resolvePath } from "@typespec/compiler";
import { createTester } from "@typespec/compiler/testing";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import YAML from "yaml";
import { $linter } from "../../src/linter.js";

const targetRule = "tsp-lintdiff-local-linter/extension-resource-path-pattern";
const Tester = createTester(resolvePath(import.meta.dirname, "../.."), {
  libraries: [
    "@typespec/http",
    "@typespec/openapi",
    "@typespec/rest",
    "@typespec/versioning",
    "@azure-tools/typespec-azure-core",
    "@azure-tools/typespec-azure-resource-manager",
    "@azure-tools/typespec-client-generator-core",
    "@azure-tools/typespec-azure-rulesets",
    "tsp-lintdiff-local-linter",
  ],
}).importLibraries();

async function specificParentExample() {
  const document = await readFile(
    new URL("../fixtures/ExtensionResourcePathPattern/rule.md", import.meta.url),
    "utf8",
  );
  const snippet = document.match(/```tsp\r?\n([\s\S]*?)```/)?.[1];
  if (!snippet) throw new Error("Missing documented specific-parent template example.");
  return `
    using TypeSpec.Http;
    using TypeSpec.Versioning;
    using Azure.ResourceManager;
    @armProviderNamespace @service @versioned(Versions)
    @armCommonTypesVersion(CommonTypes.Versions.v6)
    namespace Microsoft.Test;
    enum Versions {
      @useDependency(Azure.ResourceManager.CommonTypes.Versions.v6)
      v2024: "2024-01-01",
    }
    ${snippet}
  `;
}

describe("extension-resource-path-pattern applicability wiring", () => {
  it("remains available without automatic activation in any local ruleset", () => {
    expect($linter.rules.some((rule) => rule.name === "extension-resource-path-pattern")).toBe(
      true,
    );
    for (const ruleset of Object.values($linter.ruleSets ?? {})) {
      expect(ruleset.enable?.[targetRule]).not.toBe(true);
    }
  });

  it.each([
    [],
    ["@azure-tools/typespec-azure-rulesets/resource-manager"],
    ["tsp-lintdiff-local-linter/recommended"],
    ["tsp-lintdiff-local-linter/all"],
    ["@azure-tools/typespec-azure-rulesets/resource-manager", "tsp-lintdiff-local-linter/all"],
  ])(
    "accepts supported specific-parent ARM templates without opt-in: %j",
    async (...extendsRulesets) => {
      const [, diagnostics] = await Tester.compileAndDiagnose(await specificParentExample(), {
        compilerOptions: { linterRuleSet: { extends: extendsRulesets } },
      });
      expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
      expect(diagnostics.filter((diagnostic) => diagnostic.code === targetRule)).toEqual([]);
    },
  );

  it("uses explicit project enablement even when extending the general ARM and all rulesets", async () => {
    const [, diagnostics] = await Tester.compileAndDiagnose(await specificParentExample(), {
      compilerOptions: {
        linterRuleSet: {
          extends: [
            "@azure-tools/typespec-azure-rulesets/resource-manager",
            "tsp-lintdiff-local-linter/all",
          ],
          enable: { [targetRule]: true },
        },
      },
    });
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toEqual([]);
    expect(diagnostics.filter((diagnostic) => diagnostic.code === targetRule)).toHaveLength(1);
  });

  it("keeps comparison-fixture enablement explicit in the rule-local config", async () => {
    const content = await readFile(
      new URL("../fixtures/ExtensionResourcePathPattern/tspconfig.yaml", import.meta.url),
      "utf8",
    );
    expect(YAML.parse(content).linter.enable[targetRule]).toBe(true);
  });
});
