import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
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

  it("allows the version enum", async () => {
    await tester
      .expect(
        `       
        @service
        @versioned(Versions)
        namespace Foo; 
        enum Versions {
          v1, v2
        }
        `
      )
      .toBeValid();
  });
});
