import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noMultipleDiscriminatorRule } from "../../src/rules/no-multiple-discriminator.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-multiple-discriminator rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(
      runner,
      noMultipleDiscriminatorRule,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emits a warning diagnostic when a class hierarchy has multiple discriminators", async () => {
    await tester
      .expect(
        `
        namespace Azure.FishHatchery;

        @discriminator("fishtype")
        model Fish {
          fishtype: string;
        }
        
        @discriminator("sharktype")
        model Shark extends Fish {
          fishtype: "shark";
          sharktype: string;
        }
        `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-multiple-discriminator",
          message:
            "Class hierarchy for 'Shark' should only have, at most, one discriminator, but found: sharktype, fishtype.",
        },
      ]);
  });

  it("does not emit a warning diagnostic when a class hierarchy has a single discriminator", async () => {
    await tester
      .expect(
        `
        namespace Azure.FishHatchery;

        @discriminator("fishtype")
        model Fish {
          fishtype: string;
        }
        
        model Shark extends Fish {
          fishtype: "shark";
        }
        `
      )
      .toBeValid();
  });
});
