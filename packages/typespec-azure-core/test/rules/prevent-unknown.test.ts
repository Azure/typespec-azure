import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { preventUnknownType } from "../../src/rules/prevent-unknown.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-unknown rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(runner, preventUnknownType, "@azure-tools/typespec-azure-core");
  });

  it("emits an error diagnostic for properties of type `unknown` in an Azure namespace", async () => {
    await tester
      .expect(
        `
        namespace Azure.Widget;
        model Widget { name: unknown; }
        `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-unknown",
          message: "Azure services must not have properties of type `unknown`.",
        },
      ]);
  });
});
