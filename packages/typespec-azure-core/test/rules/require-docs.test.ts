import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
  extractCursor,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireDocumentation } from "../../src/rules/require-docs.js";
import { createAzureCoreTestRunner, getRunnerPosOffset } from "../test-host.js";

describe("typespec-azure-core: documentation-required rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(
      runner,
      requireDocumentation,
      "@azure-tools/typespec-azure-core"
    );
  });

  async function checkDocRequired(code: string, message: string) {
    const { pos, source } = extractCursor(code);
    await tester.expect(source).toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-core/documentation-required",
        message,
        pos: getRunnerPosOffset(pos),
      },
    ]);
  }

  describe("emit `documentation-required` when documentation is missing", () => {
    it("on model", async () =>
      await checkDocRequired(
        "┆model Foo {}",
        "The Model named 'Foo' should have a documentation or description, use doc comment /** */ to provide it."
      ));

    it("on model property", async () =>
      await checkDocRequired(
        `@doc("Abc") model Foo {
          ┆x: string;
        }`,
        "The ModelProperty named 'x' should have a documentation or description, use doc comment /** */ to provide it."
      ));

    it("on operation", async () =>
      await checkDocRequired(
        `┆op read(): void;`,
        "The Operation named 'read' should have a documentation or description, use doc comment /** */ to provide it."
      ));

    it("on property", async () =>
      await checkDocRequired(
        `@doc("op doc") op read(┆param1: string): void;`,
        "The ModelProperty named 'param1' should have a documentation or description, use doc comment /** */ to provide it."
      ));

    it("on enum", async () => {
      await checkDocRequired(
        "┆enum Foo {}",
        "The Enum named 'Foo' should have a documentation or description, use doc comment /** */ to provide it."
      );
    });

    it("on enum member", async () => {
      await checkDocRequired(
        `@doc(".") enum Foo {
          ┆Bar,
        }`,
        "The EnumMember named 'Bar' should have a documentation or description, use doc comment /** */ to provide it."
      );
    });

    it("does not require documentation on version enums", async () => {
      await tester
        .expect(
          `
          @versioned(Contoso.WidgetManager.Versions)
          namespace Contoso.WidgetManager;
          
          enum Versions {
            @useDependency(Azure.Core.Versions.v1_0_Preview_2)
            "2022-08-30",
          }`
        )
        .toBeValid();
    });

    it("does not require documentation on discriminator enums", async () => {
      await tester
        .expect(
          `
          enum PetKind {
            cat,
            dog,
          }
          
          @discriminator("kind")
          @doc("Base Pet model")
          model Pet {
            kind: PetKind;
          
            @doc("Pet name")
            name: string;
          }
          
          @doc("A Cat")
          model Cat extends Pet {
            kind: PetKind.cat;
          }`
        )
        .toBeValid();
    });

    it("does not require documentation on discriminator unions", async () => {
      await tester
        .expect(
          `
          @discriminator("kind")
          union Pet {
            cat: Cat,
          }
          
          @doc("A Cat!")
          model Cat {
            kind: "cat";
          }`
        )
        .toBeValid();
    });
  });
});
