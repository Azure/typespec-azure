import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { extensibleEnumRule } from "../../src/rules/extensible-enums.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-fixed-enum-discriminator rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, extensibleEnumRule, "@azure-tools/typespec-azure-core");
  });

  it("emits a warning diagnostic if it is a fixed enum", async () => {
    await tester
      .expect(
        `
        @fixed
        enum PetKind {
          cat, dog
        }
        `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/use-extensible-enum",
          message: "Enums should be defined without the `@fixed` decorator.",
        },
      ]);
  });

  it("does not emit a warning diagnostic it is an extensible enum", async () => {
    await tester
      .expect(
        `
        enum PetKind {
          cat, dog
        }
        `
      )
      .toBeValid();
  });
});
