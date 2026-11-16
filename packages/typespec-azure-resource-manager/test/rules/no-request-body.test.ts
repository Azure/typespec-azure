import { Tester } from "#test/tester.js";
import { $linter } from "@azure-tools/typespec-azure-core";
import { createLinterRuleTester } from "@typespec/compiler/testing";
import { ok } from "node:assert";
import { it } from "vitest";

const noRequestBodyRule = $linter.rules.find((rule) => rule.name === "no-request-body");
ok(noRequestBodyRule);

it.each([
  ["ArmResourceRead", "GET"],
  ["ArmResourceDeleteSync", "DELETE"],
  ["ArmResourceDeleteWithoutOkAsync", "DELETE"],
])("reports body parameters on %s", async (template, verb) => {
  const runner = await Tester.createInstance();
  const tester = createLinterRuleTester(
    runner,
    noRequestBodyRule,
    "@azure-tools/typespec-azure-core",
  );
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      model RequestParameters {
        @body filter: { name: string };
      }

      @armResourceOperations
      interface Widgets {
        /*target*/execute is ${template}<Widget, Parameters = RequestParameters>;
      }
    `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-core/no-request-body",
      severity: "warning",
      message: `${verb} operations must not have a request body. Remove the request body.`,
      pos: result.pos.target.pos,
    }));
});

it("allows bodyless standard ARM read and delete operations", async () => {
  const runner = await Tester.createInstance();
  const tester = createLinterRuleTester(
    runner,
    noRequestBodyRule,
    "@azure-tools/typespec-azure-core",
  );
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Contoso;

      model Widget is TrackedResource<{}> {
        ...ResourceNameParameter<Widget>;
      }

      @armResourceOperations
      interface Widgets {
        get is ArmResourceRead<Widget>;
        delete is ArmResourceDeleteWithoutOkAsync<Widget>;
      }
    `,
    )
    .toBeValid();
});
