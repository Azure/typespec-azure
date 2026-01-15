import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

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
      message: `Missing x-ms-identifiers. Decorate the property with @OpenAPI.extension("x-ms-identifiers", #["<identifying-property-name>"]). If there are no appropriate identifying properties, please add @OpenAPI.extension("x-ms-identifiers", #[]).`,
    });
});

it("emit diagnostic when x-ms-identifiers property names are not found in the target type", async () => {
  await tester
    .expect(
      `
        model Foo {
          @OpenAPI.extension("x-ms-identifiers", #["not-a-prop"])
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

it(`doesn't emit diagnostic if @OpenAPI.extension("x-ms-identifiers", ...) is specified`, async () => {
  await tester
    .expect(
      `
        model Foo {
          @OpenAPI.extension("x-ms-identifiers", #["customName"])
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
          @OpenAPI.extension("x-ms-identifiers", #["name"])
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
