import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { noFixedEnumDiscriminatorRule } from "../../src/rules/no-fixed-enum-discriminator.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-fixed-enum-discriminator rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      noFixedEnumDiscriminatorRule,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emits a warning diagnostic if discriminated model use fixed enum as discriminator", async () => {
    await tester
      .expect(
        `
        @discriminator("type")
        model Pet {
          type: PetKind;
        }
        
        @fixed
        enum PetKind {
          cat, dog
        }

        model Cat extends Pet {
          type: PetKind.cat;
        }
        `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-fixed-enum-discriminator",
          message: `Discriminator shouldn't be a fixed enum. A discriminated model is likely to expand over time. Removed "@fixed" from "PetKind" enum.`,
        },
      ]);
  });

  it("does not emit a warning diagnostic when discriminator is an extensible enum", async () => {
    await tester
      .expect(
        `
        @discriminator("type")
        model Pet {
          type: PetKind;
        }
        
        enum PetKind {
          cat, dog
        }

        model Cat extends Pet {
          type: PetKind.cat;
        }
        `
      )
      .toBeValid();
  });

  it("does not emit a warning diagnostic when discriminator is an string", async () => {
    await tester
      .expect(
        `
        @discriminator("type")
        model Pet {
          type: string;
        }
     

        model Cat extends Pet {
          type: "cat";
        }
        `
      )
      .toBeValid();
  });
});
