import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual } from "assert";
import { beforeEach, describe, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let runner: SdkTestRunner;

beforeEach(async () => {
  runner = await createSdkTestRunner({ emitterName: "@azure-tools/typespec-python" });
});

describe("deserialized empty string as null", () => {
  it("should add decorator on model property of type string or Scalar type extended from string", async function () {
    runner = await createSdkTestRunner(
      {},
      { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@deserializeEmptyStringAsNull"] },
    );

    await runner.compileWithBuiltInService(`
        scalar stringlike extends string;

        model A {
          @deserializeEmptyStringAsNull("csharp")
          prop1: stringlike;

          @deserializeEmptyStringAsNull("csharp")
          prop2: string;
        }

        op test(): A;
      `);

    const models = runner.context.sdkPackage.models;

    for (const prop of [models[0].properties[0], models[0].properties[1]]) {
      deepStrictEqual(prop.decorators, [
        {
          name: "Azure.ClientGenerator.Core.@deserializeEmptyStringAsNull",
          arguments: { scope: "csharp" },
        },
      ]);
    }
    expectDiagnostics(runner.context.diagnostics, []);
  });

  it("does not support model property of none string primitive type", async function () {
    runner = await createSdkTestRunner(
      {},
      { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@deserializeEmptyStringAsNull"] },
    );

    const diagnostics = await runner.diagnose(`
        model A {
          @deserializeEmptyStringAsNull
          prop1: int64;
        }
    `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-deserializeEmptyStringAsNull-target-type",
    });
  });

  it("does not support model property of none string extended Scalar type", async function () {
    runner = await createSdkTestRunner(
      {},
      { additionalDecorators: ["Azure\\.ClientGenerator\\.Core\\.@deserializeEmptyStringAsNull"] },
    );

    const diagnostics = await runner.diagnose(`
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
});
