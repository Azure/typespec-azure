import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { noStringDiscriminatorRule } from "../../src/rules/no-string-discriminator.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
  tester = createLinterRuleTester(
    runner,
    noStringDiscriminatorRule,
    "@azure-tools/typespec-azure-core"
  );
});

it("emits a warning @discriminator is used without the explicit property", async () => {
  await tester
    .expect(
      `        
        @discriminator("kind")
        model Pet {
        }
        `
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-string-discriminator",
        message:
          'Use an extensible union instead of a plain string (ex: `union PetKind { cat: "cat", dog: "dog", string };`)',
      },
    ]);
});

it("emits a warning @discriminator points to a property that is not a union", async () => {
  await tester
    .expect(
      `        
        @discriminator("kind")
        model Pet {
          kind: string;
        }
        `
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/no-string-discriminator",
        message:
          'Use an extensible union instead of a plain string (ex: `union PetKind { cat: "cat", dog: "dog", string };`)',
      },
    ]);
});

it("doesn't warn when using an extensible union as the type", async () => {
  await tester
    .expect(
      `       
        @discriminator("kind")
        model Pet { kind: PetKind; }

        model Cat extends Pet { kind: "cat" }

        union PetKind {
          dog: "dog",
          cat: "cat",
        }
        `
    )
    .toBeValid();
});
