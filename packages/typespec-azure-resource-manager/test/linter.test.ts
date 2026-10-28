import { Tester } from "#test/tester.js";
import { expect, it } from "vitest";
import { $linter } from "../src/linter.js";

const code = "@azure-tools/typespec-azure-resource-manager/use-scope-for-extension-routing";
const source = `
  @get
  @route("/providers/Microsoft.Parent/parents/{parentName}/providers/Microsoft.Test/bindings/{bindingName}")
  op read(@path parentName: string, @path bindingName: string): void;
`;

it("keeps opt-in guidance outside the general ARM all ruleset", () => {
  for (const rule of $linter.rules) {
    expect(
      $linter.ruleSets?.all.enable?.[`@azure-tools/typespec-azure-resource-manager/${rule.name}`],
    ).toBe(
      !["use-scope-for-extension-routing", "resource-group-path-parameter"].includes(rule.name),
    );
  }
});

it.each([false, true])(
  "selects RPaaS routing explicitly rather than through ARM all: %s",
  async (explicitlyEnabled) => {
    const [, diagnostics] = await Tester.compileAndDiagnose(source, {
      compilerOptions: {
        linterRuleSet: {
          extends: ["@azure-tools/typespec-azure-resource-manager/all"],
          enable: explicitlyEnabled ? { [code]: true } : {},
        },
      },
    });
    expect(diagnostics.filter((diagnostic) => diagnostic.code === code)).toHaveLength(
      explicitlyEnabled ? 1 : 0,
    );
  },
);

it.each([false, true])(
  "selects resource-group path guidance explicitly rather than through ARM all: %s",
  async (explicitlyEnabled) => {
    const ruleCode = "@azure-tools/typespec-azure-resource-manager/resource-group-path-parameter";
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
        @service @armProviderNamespace namespace Microsoft.Test;
        @get @route("/resourceGroups/fixedGroup/widgets") op read(): void;
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            extends: ["@azure-tools/typespec-azure-resource-manager/all"],
            enable: explicitlyEnabled ? { [ruleCode]: true } : {},
          },
        },
      },
    );
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toHaveLength(0);
    expect(diagnostics.filter((diagnostic) => diagnostic.code === ruleCode)).toHaveLength(
      explicitlyEnabled ? 1 : 0,
    );
  },
);
