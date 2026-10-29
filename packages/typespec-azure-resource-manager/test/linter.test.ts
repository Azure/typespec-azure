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
    ).toBe(!["use-scope-for-extension-routing", "no-get-lro"].includes(rule.name));
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

it.each(["default", "enabled", "suppressed"] as const)(
  "selects GET LRO guidance explicitly: %s",
  async (mode) => {
    const rule = "@azure-tools/typespec-azure-resource-manager/no-get-lro";
    const [, diagnostics] = await Tester.compileAndDiagnose(
      `
        @armProviderNamespace namespace Microsoft.Test;
        model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
        @armResourceOperations interface Widgets {
          ${mode === "suppressed" ? `#suppress "${rule}" "Reviewed compatibility exception"` : ""}
          @OpenAPI.extension("x-ms-long-running-operation", true)
          read is ArmResourceRead<Widget>;
        }
      `,
      {
        compilerOptions: {
          linterRuleSet: {
            extends: ["@azure-tools/typespec-azure-resource-manager/all"],
            enable: mode === "default" ? {} : { [rule]: true },
          },
        },
      },
    );
    expect(diagnostics.filter((diagnostic) => diagnostic.severity === "error")).toHaveLength(0);
    expect(diagnostics.filter((diagnostic) => diagnostic.code === rule)).toHaveLength(
      mode === "enabled" ? 1 : 0,
    );
  },
);
