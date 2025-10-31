import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { missingXmsIdentifiersRule } from "../../src/rules/missing-x-ms-identifiers.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    missingXmsIdentifiersRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emit warning for array of model without x-ms-identifiers", async () => {
  await tester
    .expect(
      `
        model Foo {
          bar: Bar[];
        }

        model Bar {
          customName: string;
        }
        `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers",
      message: `Missing identifying properties of objects in the array item, please add @OpenAPI.extension("x-ms-identifiers", #[<prop>]) to specify it. If there are no appropriate identifying properties, please add @OpenAPI.extension("x-ms-identifiers", #[]).`,
    });
});

it("emit diagnostic when x-ms-identifiers property names are not found in the target type", async () => {
  await tester
    .expect(
      `
        model Foo {
          @identifiers(#["not-a-prop"])
          bar: Bar[];
        }

        model Bar {
          customName: string;
        }
        `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers",
      message: `Property "not-a-prop" is not found in "Bar". Make sure value of x-ms-identifiers extension are valid property name of the array element.`,
    });
});

it(`doesn't emit diagnostic if @identifiers(...) is specified`, async () => {
  await tester
    .expect(
      `
        model Foo {
          @identifiers(#["customName"])
          bar: Bar[];
        }

        model Bar {
          customName: string;
        }
        `,
    )
    .toBeValid();
});

it(`doesn't emit diagnostic if x-ms-identifiers property is defined in a base class`, async () => {
  await tester
    .expect(
      `
        model Foo {
          @identifiers(#["name"])
          bar: Child[];
        }

        model Child extends Base {
          other: string;
        }

        model Base { name: string;}
        `,
    )
    .toBeValid();
});

it(`doesn't emit diagnostic if element is a primitive type`, async () => {
  await tester
    .expect(
      `
        model Foo {
          bar: Bar[];
        }

        model Bar {
          id: string;
        }
        `,
    )
    .toBeValid();
});

it("allow x-ms-identifiers from keys", async () => {
  await tester
    .expect(
      `
        model Pet {
          pet: Dog[];
        }
 
        model Dog {
          food: Food;
        }
        
        model Food {
          @key
          brand: string;
        }
        `,
    )
    .toBeValid();
});

it("allow x-ms-identifiers from keys on default identifiers", async () => {
  await tester
    .expect(
      `
        model Pet {
          pet: Dog[];
        }
 
        model Dog {
          name: string;
        }
        `,
    )
    .toBeValid();
});

it("allow x-ms-identifiers from identifiers decorator", async () => {
  await tester
    .expect(
      `
        model Pet {
          @identifiers(#["name"])
          pet: Dog[];
        }
 
        model Dog {
          name: string;
        }
        `,
    )
    .toBeValid();
});

it("emit diagnostic if a section is not found", async () => {
  await tester
    .expect(
      `
        model Pet {
          @identifiers(#["food/brand"])
          pet: Dog[];
        }
 
        model Dog {
          food: string;
          brand: string;
        }
        `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers",
      message: `Property "brand" is not found in "string". Make sure value of x-ms-identifiers extension are valid property name of the array element.`,
    });
});
