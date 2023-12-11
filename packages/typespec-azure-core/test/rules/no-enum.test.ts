import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { noEnumRule } from "../../src/rules/no-enum.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-enum rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, noEnumRule, "@azure-tools/typespec-azure-core");
  });

  it("emits a warning diagnostic if enum is used", async () => {
    await tester
      .expect(
        `        
        enum PetKind {
          cat, dog
        }
        `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-enum",
        },
      ]);
  });
});
