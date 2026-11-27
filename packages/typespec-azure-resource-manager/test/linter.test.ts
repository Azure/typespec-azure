import { Tester } from "#test/tester.js";
import { expect, it } from "vitest";
import { $linter } from "../src/linter.js";

const code = "@azure-tools/typespec-azure-resource-manager/use-scope-for-extension-routing";
const source = `
  @get
  @route("/providers/Microsoft.Parent/parents/{parentName}/providers/Microsoft.Test/bindings/{bindingName}")
  op read(@path parentName: string, @path bindingName: string): void;
`;

it("keeps only RPaaS-specific routing outside the general ARM all ruleset", () => {
  for (const rule of $linter.rules) {
    expect(
      $linter.ruleSets?.all.enable?.[`@azure-tools/typespec-azure-resource-manager/${rule.name}`],
    ).toBe(rule.name !== "use-scope-for-extension-routing");
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
