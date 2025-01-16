import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { missingXmsIdentifiersRule } from "../../src/rules/missing-x-ms-identifiers.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-enum rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
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
        message: `Missing identifying properties of objects in the array item, please add @OpenAPI.extension("x-ms-identifiers", [<prop>]) to specify it. If there are no appropriate identifying properties, please add @OpenAPI.extension("x-ms-identifiers",[]).`,
      });
  });

  it("emit warning if value is not a tuple", async () => {
    await tester
      .expect(
        `
        model Foo {
          @OpenAPI.extension("x-ms-identifiers", "customName")
          bar: Bar[];
        }

        model Bar {
          customName: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers",
        message: `Value passed to @OpenAPI.extension("x-ms-identifiers",...) was a "string". Pass an array of property name.`,
      });
  });

  it("emit diagnostic when x-ms-identifiers property names are not found in the target type", async () => {
    await tester
      .expect(
        `
        model Foo {
          @OpenAPI.extension("x-ms-identifiers", ["not-a-prop"])
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

  it(`doesn't emit diagnostic if @extension("x-ms-identifiers",...) is specified`, async () => {
    await tester
      .expect(
        `
        model Foo {
          @OpenAPI.extension("x-ms-identifiers", ["customName"])
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
          @OpenAPI.extension("x-ms-identifiers", ["name"])
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

  it("allow array of x-ms-identifiers", async () => {
    await tester
      .expect(
        `
        model Pet {
          @OpenAPI.extension("x-ms-identifiers", ["food/brand/name"])
          pet: Dog[];
        }
 
        model Dog {
          food: Food;
        }
        
        model Food {
          brand: Brand;
        }
        
        model Brand {
          name: string;
        }
        `,
      )
      .toBeValid();
  });

  it("allow array of x-ms-identifiers starting with /", async () => {
    await tester
      .expect(
        `
        model Pet {
          @OpenAPI.extension("x-ms-identifiers", ["/food/brand"])
          pet: Dog[];
        }
 
        model Dog {
          food: Food;
        }
        
        model Food {
          brand: string;
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
          @OpenAPI.extension("x-ms-identifiers", ["food/brand"])
          pet: Dog[];
        }
 
        model Dog {
          food: string;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/missing-x-ms-identifiers",
        message: `Property "brand" is not found in "Dog". Make sure value of x-ms-identifiers extension are valid property name of the array element.`,
      });
  });
});
