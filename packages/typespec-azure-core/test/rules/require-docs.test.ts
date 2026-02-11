import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireDocumentation } from "../../src/rules/require-docs.js";
import { Tester } from "../test-host.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(runner, requireDocumentation, "@azure-tools/typespec-azure-core");
});

async function checkDocRequired(code: string, message: string) {
  await tester.expect(code).toEmitDiagnostics((x) => ({
    code: "@azure-tools/typespec-azure-core/documentation-required",
    message,
    pos: x.pos.loc.pos,
  }));
}

describe("emit `documentation-required` when documentation is missing", () => {
  it("on model", async () =>
    await checkDocRequired(
      "/*loc*/model Foo {}",
      "The Model named 'Foo' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on model property", async () =>
    await checkDocRequired(
      `@doc("Abc") model Foo {
          /*loc*/x: string;
        }`,
      "The ModelProperty named 'x' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on operation", async () =>
    await checkDocRequired(
      `/*loc*/op read(): void;`,
      "The Operation named 'read' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on property", async () =>
    await checkDocRequired(
      `@doc("op doc") op read(/*loc*/param1: string): void;`,
      "The ModelProperty named 'param1' should have a documentation or description, use doc comment /** */ to provide it.",
    ));

  it("on enum", async () => {
    await checkDocRequired(
      "/*loc*/enum Foo {}",
      "The Enum named 'Foo' should have a documentation or description, use doc comment /** */ to provide it.",
    );
  });

  it("on enum member", async () => {
    await checkDocRequired(
      `@doc(".") enum Foo {
          /*loc*/Bar,
        }`,
      "The EnumMember named 'Bar' should have a documentation or description, use doc comment /** */ to provide it.",
    );
  });

  it("does not require documentation on version enums", async () => {
    await tester
      .expect(
        `
          @versioned(Contoso.WidgetManager.Versions)
          namespace Contoso.WidgetManager;
          
          enum Versions {
                      "2022-08-30",
          }`,
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
          }`,
      )
      .toBeValid();
  });

  it("does not require documentation on discriminator unions", async () => {
    await tester
      .expect(
        `
          union PetKind {
            cat: "cat",
            string,
          }
          
          @discriminator("kind")
          @doc("Base Pet model")
          model Pet {
            kind: PetKind;
          }
          
          @doc("A Merry Ol' Cat")
          model Cat extends Pet {
            kind: PetKind.cat,
          }`,
      )
      .toBeValid();
  });

  it("on union (non-discriminator)", async () => {
    await tester
      .expect(
        `
      union PetKind {      
        Cat: "Cat",
        "Dog",
        string,
      }`,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The Union named 'PetKind' should have a documentation or description, use doc comment /** */ to provide it.",
        },
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The UnionVariant named 'Cat' should have a documentation or description, use doc comment /** */ to provide it.",
        },
        {
          code: "@azure-tools/typespec-azure-core/documentation-required",
          message:
            "The UnionVariant named 'Dog' should have a documentation or description, use doc comment /** */ to provide it.",
        },
      ]);
  });
});
