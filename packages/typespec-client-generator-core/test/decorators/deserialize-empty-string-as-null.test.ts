import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { describe, it } from "vitest";
import {
  createSdkContextForTester,
  SimpleTester,
  SimpleTesterWithBuiltInService,
} from "../tester.js";

describe("deserialized empty string as null", () => {
  it("Apply the decorator to model properties of type 'string' and a Scalar type derived from 'string'", async function () {
    const { program } = await SimpleTesterWithBuiltInService.compile(`
        scalar stringlike extends string;

        model A {
          @deserializeEmptyStringAsNull("csharp")
          prop1: stringlike;

          @deserializeEmptyStringAsNull("csharp")
          prop2: string;
        }

        op test(): A;
      `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = context.sdkPackage.models;

    for (const prop of [models[0].properties[0], models[0].properties[1]]) {
      deepStrictEqual(prop.decorators, [
        {
          name: "Azure.ClientGenerator.Core.@deserializeEmptyStringAsNull",
          arguments: { scope: "csharp" },
        },
      ]);
    }
    expectDiagnostics(context.diagnostics, []);
  });

  it("Apply decorator to model properties of indirectly derived from 'string'", async function () {
    const { program } = await SimpleTesterWithBuiltInService.compile(`
        scalar l1 extends string;
        scalar l2 extends l1;

        model A {
          @deserializeEmptyStringAsNull("csharp")
          prop1: l2;
        }

        op test(): A;
      `);

    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const models = context.sdkPackage.models;
    const prop = models[0].properties[0];
    deepStrictEqual(prop.decorators, [
      {
        name: "Azure.ClientGenerator.Core.@deserializeEmptyStringAsNull",
        arguments: { scope: "csharp" },
      },
    ]);
    expectDiagnostics(context.diagnostics, []);
  });

  it("should not allow the decorator on model property which is a model type", async function () {
    const diagnostics = await SimpleTester.diagnose(`
        model B {
          prop1: string;
        }

        model A {
          @deserializeEmptyStringAsNull
          prop1: B;
        }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-deserializeEmptyStringAsNull-target-type",
    });
  });

  it("should not allow the decorator on none model property target", async function () {
    const diagnostics = await SimpleTester.diagnose(`
        @deserializeEmptyStringAsNull
        model A {
          prop1: string[];
        }
    `);

    expectDiagnostics(diagnostics, {
      code: "decorator-wrong-target",
    });
  });

  it("should not allow the decorator on model properties of non-scalar type", async function () {
    const diagnostics = await SimpleTester.diagnose(`
        model A {
          @deserializeEmptyStringAsNull
          prop1: string[];
        }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-deserializeEmptyStringAsNull-target-type",
    });
  });

  it("should not allow the decorator on model properties of non-string primitive type", async function () {
    const diagnostics = await SimpleTester.diagnose(`
        model A {
          @deserializeEmptyStringAsNull
          prop1: int32;
        }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-deserializeEmptyStringAsNull-target-type",
    });
  });

  it("should not allow the decorator on model properties of non-string extended Scalar type", async function () {
    const diagnostics = await SimpleTester.diagnose(`
            scalar int64like extends int64;
            model A {
              @deserializeEmptyStringAsNull
              prop1: int64like;
            }
        `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-deserializeEmptyStringAsNull-target-type",
    });
  });

  it("should not allow the decorator on model properties of indirectly extended from a none string Scalar type", async function () {
    const diagnostics = await SimpleTester.diagnose(`
            scalar l1 extends int64;
            scalar l2 extends l1;
            model A {
              @deserializeEmptyStringAsNull
              prop1: l2;
            }
        `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-deserializeEmptyStringAsNull-target-type",
    });
  });
});
