import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { preventUnknownType } from "../../src/rules/prevent-unknown.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, preventUnknownType, "@azure-tools/typespec-azure-core");
});

it("emits an error diagnostic for properties of type `unknown` in an Azure namespace", async () => {
  await tester
    .expect(
      `
        namespace Azure.Widget;
        model Widget { name: unknown; }
        `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-unknown",
        message: "Azure services must not have properties of type `unknown`.",
      },
    ]);
});
