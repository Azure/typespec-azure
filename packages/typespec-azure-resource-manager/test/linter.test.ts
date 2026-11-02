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
      rule.name !== "use-scope-for-extension-routing" &&
        rule.name !== "top-level-resources-list-by-resource-group",
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
  "selects resource-group list guidance explicitly rather than through ARM all: %s",
  async (explicitlyEnabled) => {
    const ruleCode =
      "@azure-tools/typespec-azure-resource-manager/top-level-resources-list-by-resource-group";
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
        @armProviderNamespace @service namespace Microsoft.Contoso;
        model Widget is TrackedResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets { get is ArmResourceRead<Widget>; }
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
    expect(diagnostics.filter((diagnostic) => diagnostic.code === ruleCode)).toHaveLength(
      explicitlyEnabled ? 1 : 0,
    );
  },
);
