import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
  extractCursor,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { spreadDiscriminatedModelRule } from "../../src/rules/spread-discriminated-model.js";
import { createAzureCoreTestRunner, getRunnerPosOffset } from "../test-host.js";

describe("typespec-azure-core: spread-discriminated-model rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(
      runner,
      spreadDiscriminatedModelRule,
      "@azure-tools/typespec-azure-core",
    );
  });

  it("emit warning when spreading a model with a discriminator", async () => {
    const { pos, source } = extractCursor(`
    @discriminator("kind")
    model Pet { kind: string; }
    
    model Cat { ┆...Pet; }
    `);
    await tester.expect(source).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/spread-discriminated-model",
      pos: getRunnerPosOffset(pos),
      message:
        "Model 'Pet' is being spread but has a discriminator. The relation between those 2 models will be lost and defeat the purpose of `@discriminator` Consider using `extends` instead.",
    });
  });

  it("good when using inheritance with a discriminator", async () => {
    await tester
      .expect(
        `
        @discriminator("kind") model Pet { kind: string }
        model Cat extends Pet { kind: "cat" }
        model Dog extends Pet { kind: "dog" }`,
      )
      .toBeValid();
  });

  it("ok when using model is", async () => {
    await tester
      .expect(
        `
        @discriminator("kind")
        model Pet { kind: string; }
        model Dog is Pet {}`,
      )
      .toBeValid();
  });

  it("ignore when property are not merged into a model statement", async () => {
    await tester
      .expect(
        `
        @discriminator("kind")
        model Pet { kind: string; }
        model Bar {
          pet: Pet & { name: string; };
        }`,
      )
      .toBeValid();
  });
});
