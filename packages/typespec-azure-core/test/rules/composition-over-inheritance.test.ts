import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { compositionOverInheritanceRule } from "../../src/rules/composition-over-inheritance.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: composition-over-inheritance rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      compositionOverInheritanceRule,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emit warning when using inheritance without discriminator", async () => {
    await tester
      .expect(
        `
        model Pet {}
        model Cat extends Pet {}`
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/composition-over-inheritance",
        message: [
          "Model 'Cat' is extending 'Azure.MyService.Pet' that doesn't define a discriminator. If 'Azure.MyService.Pet' is meant to be used:",
          " - For composition consider using spread `...` or `model is` instead.",
          " - As a polymorphic relation, add the `@discriminator` decorator on the base model.",
        ].join("\n"),
      });
  });

  it("emit warning when extending a template", async () => {
    await tester
      .expect(
        `
        model Pet<T> { t: T}
        model Cat extends Pet<string> {}`
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/composition-over-inheritance",
        message:
          "Model 'Cat' is extending a template 'Azure.MyService.Pet<string>'. Consider using composition with spread `...` or `model is` instead.",
      });
  });

  it("good when using inheritance with a discriminator", async () => {
    await tester
      .expect(
        `
        @discriminator("kind") model Pet { kind: string }
        model Cat extends Pet { kind: "cat" }
        model Dog extends Pet { kind: "dog" }`
      )
      .toBeValid();
  });

  it("good when using model is", async () => {
    await tester
      .expect(
        `
        model Pet {}
        model Cat is Pet {}
        model Dog is Pet {}`
      )
      .toBeValid();
  });

  it("good when using spread", async () => {
    await tester
      .expect(
        `
        model Pet {}
        model Cat { ...Pet }
        model Dog { ...Pet }`
      )
      .toBeValid();
  });

  it("doesn't complain if using model is where the source model extend something else", async () => {
    await tester
      .expect(
        `
        model PetBase {}
        model Pet extends PetBase {}
        model Cat is Pet;`
      )
      .toEmitDiagnostics([
        // Should only be a single diagnostic
        {
          code: "@azure-tools/typespec-azure-core/composition-over-inheritance",
        },
      ]);
  });
});
