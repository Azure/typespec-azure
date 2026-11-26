import { Tester } from "#test/tester.js";
import { expect, it } from "vitest";
import { $linter } from "../src/linter.js";

const code = "@azure-tools/typespec-azure-resource-manager/use-scope-for-extension-routing";
const source = `
  @get
  @route("/providers/Microsoft.Parent/parents/{parentName}/providers/Microsoft.Test/bindings/{bindingName}")
  op read(@path parentName: string, @path bindingName: string): void;
`;

it("keeps RPaaS-specific routing and superseded response rules outside the general ARM all ruleset", () => {
  const disabled = new Set([
    "use-scope-for-extension-routing",
    "arm-delete-operation-response-codes",
    "arm-put-operation-response-codes",
    "arm-post-operation-response-codes",
  ]);
  for (const rule of $linter.rules) {
    expect(
      $linter.ruleSets?.all.enable?.[`@azure-tools/typespec-azure-resource-manager/${rule.name}`],
    ).toBe(!disabled.has(rule.name));
  }
});

it("reports resource response violations only through the combined rule in ARM all", async () => {
  const [, diagnostics] = await Tester.compileAndDiagnose(
    `
    @armProviderNamespace namespace Microsoft.Contoso;
    model Employee is ProxyResource<{}> {
      ...ResourceNameParameter<Employee>;
    }
    @armResourceOperations interface Employees {
      @put @armResourceCreateOrUpdate(Employee)
      createOrUpdate(...ApiVersionParameter): { @statusCode code: 200; };
      @delete @armResourceDelete(Employee)
      delete(...ApiVersionParameter): { @statusCode code: 200; };
      @post @armResourceAction(Employee)
      hire(...ApiVersionParameter): { @statusCode code: 200; };
    }
  `,
    {
      compilerOptions: {
        linterRuleSet: {
          extends: ["@azure-tools/typespec-azure-resource-manager/all"],
        },
      },
    },
  );
  expect(
    diagnostics.filter(
      (diagnostic) =>
        diagnostic.code ===
        "@azure-tools/typespec-azure-resource-manager/use-standard-response-codes",
    ),
  ).toHaveLength(3);
  expect(
    diagnostics.filter((diagnostic) =>
      /\/arm-(delete|put|post)-operation-response-codes$/.test(diagnostic.code),
    ),
  ).toHaveLength(0);
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
