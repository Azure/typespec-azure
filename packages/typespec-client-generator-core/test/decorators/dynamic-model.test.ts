import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

const decoratorName = "Azure.ClientGenerator.Core.@dynamicModel";
const additionalDecorators = ["Azure\\.ClientGenerator\\.Core\\.@dynamicModel"];

describe("@dynamicModel", () => {
  for (const language of ["csharp", "python"]) {
    it(`preserves model metadata for ${language}`, async () => {
      const { program } = await SimpleTesterWithService.compile(`
        @dynamicModel
        model Dynamic {
          name: string;
        }

        model Plain {
          name: string;
        }

        op test(@body body: Dynamic): Plain;
      `);

      const context = await createSdkContextForTester(
        program,
        { emitterName: `@azure-tools/typespec-${language}` },
        { additionalDecorators },
      );
      const dynamic = context.sdkPackage.models.find((model) => model.name === "Dynamic");
      const plain = context.sdkPackage.models.find((model) => model.name === "Plain");
      ok(dynamic);
      ok(plain);
      deepStrictEqual(dynamic.decorators, [{ name: decoratorName, arguments: {} }]);
      deepStrictEqual(plain.decorators, []);
      expectDiagnostics(context.diagnostics, []);
    });

    it(`preserves namespace metadata for ${language}`, async () => {
      const { program } = await SimpleTester.compile(`
        @service
        @dynamicModel
        namespace TestService {
          model Pet {
            name: string;
          }

          op test(): Pet;
        }
      `);

      const context = await createSdkContextForTester(
        program,
        { emitterName: `@azure-tools/typespec-${language}` },
        { additionalDecorators },
      );
      deepStrictEqual(context.sdkPackage.namespaces[0].decorators, [
        { name: decoratorName, arguments: {} },
      ]);
      expectDiagnostics(context.diagnostics, []);
    });
  }

  for (const scope of ['"csharp"', '#{ scope: "csharp" }']) {
    for (const language of ["csharp", "python"]) {
      it(`filters model and namespace metadata for ${language} with scope ${scope}`, async () => {
        const { program } = await SimpleTester.compile(`
          @service
          @dynamicModel(${scope})
          namespace TestService {
            @dynamicModel(${scope})
            model Pet {
              name: string;
            }

            op test(): Pet;
          }
        `);

        const context = await createSdkContextForTester(
          program,
          { emitterName: `@azure-tools/typespec-${language}` },
          { additionalDecorators },
        );
        const expected =
          language === "csharp"
            ? [
                {
                  name: decoratorName,
                  arguments: { scope: scope.startsWith("#") ? { scope: "csharp" } : "csharp" },
                },
              ]
            : [];
        deepStrictEqual(context.sdkPackage.models[0].decorators, expected);
        deepStrictEqual(context.sdkPackage.namespaces[0].decorators, expected);
        expectDiagnostics(context.diagnostics, []);
      });
    }
  }

  it("rejects operation and property targets", async () => {
    const diagnostics = await SimpleTester.diagnose(`
      model Pet {
        @dynamicModel
        name: string;
      }

      @dynamicModel
      op test(): Pet;
    `);

    expectDiagnostics(diagnostics, [
      { code: "decorator-wrong-target" },
      { code: "decorator-wrong-target" },
    ]);
  });
});
