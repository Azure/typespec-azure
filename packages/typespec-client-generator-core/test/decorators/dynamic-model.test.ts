import { expectDiagnostics, mockFile } from "@typespec/compiler/testing";
import { deepStrictEqual, ok } from "assert";
import { describe, it } from "vitest";
import { createSdkContextForTester, SimpleTester, SimpleTesterWithService } from "../tester.js";

const decoratorName = "Azure.ClientGenerator.Core.@dynamicModel";
const additionalDecorators = ["Azure\\.ClientGenerator\\.Core\\.@dynamicModel"];

describe("@dynamicModel", () => {
  for (const target of ["model Example {}", "namespace Example {}"]) {
    for (const scope of [
      '"csharp"',
      '#{ scope: "csharp" }',
      '"python, csharp"',
      '#{ scope: "python, csharp" }',
    ]) {
      it(`accepts ${scope} on ${target}`, async () => {
        expectDiagnostics(await SimpleTester.diagnose(`@dynamicModel(${scope}) ${target}`), []);
      });
    }

    for (const scope of [
      "",
      '("")',
      "(#{})",
      '("python")',
      '(#{ scope: "python" })',
      '("!(csharp)")',
      '("!(python)")',
    ]) {
      it(`reports decorator-requires-scope for @dynamicModel${scope} on ${target}`, async () => {
        expectDiagnostics(await SimpleTester.diagnose(`@dynamicModel${scope} ${target}`), [
          {
            code: "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
            severity: "warning",
            message: '@dynamicModel should be applied with a language scope of "csharp".',
          },
        ]);
      });
    }

    it(`does not report the legacy C# decorator on ${target}`, async () => {
      const diagnostics = await SimpleTester.files({
        "csharp.js": mockFile.js({
          namespace: "TypeSpec.HttpClient.CSharp",
          $dynamicModel: function $dynamicModel() {},
        }),
        "csharp.tsp": `
          import "./csharp.js";
          using TypeSpec.Reflection;
          namespace TypeSpec.HttpClient.CSharp {
            extern dec dynamicModel(target: Model | Namespace);
          }
        `,
      })
        .import("./csharp.tsp")
        .diagnose(`@TypeSpec.HttpClient.CSharp.dynamicModel ${target}`);
      expectDiagnostics(diagnostics, []);
    });
  }

  for (const language of ["csharp", "python"]) {
    it(`preserves model metadata for ${language}`, async () => {
      const { program } = await SimpleTesterWithService.compile(`
        #suppress "@azure-tools/typespec-client-generator-core/decorator-requires-scope" "Testing unscoped metadata."
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
        #suppress "@azure-tools/typespec-client-generator-core/decorator-requires-scope" "Testing unscoped metadata."
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

  it("does not add metadata to a sibling namespace", async () => {
    const { program } = await SimpleTester.compile(`
      @service
      #suppress "@azure-tools/typespec-client-generator-core/decorator-requires-scope" "Testing unscoped metadata."
      @dynamicModel
      namespace DynamicService {
        model DynamicPet {
          name: string;
        }

        op getDynamicPet(): DynamicPet;
      }

      @service
      namespace PlainService {
        model PlainPet {
          name: string;
        }

        op getPlainPet(): PlainPet;
      }
    `);

    const context = await createSdkContextForTester(
      program,
      { emitterName: "@azure-tools/typespec-csharp" },
      { additionalDecorators },
    );
    const dynamicService = context.sdkPackage.namespaces.find(
      (namespace) => namespace.name === "DynamicService",
    );
    const plainService = context.sdkPackage.namespaces.find(
      (namespace) => namespace.name === "PlainService",
    );
    ok(dynamicService);
    ok(plainService);
    deepStrictEqual(dynamicService.decorators, [{ name: decoratorName, arguments: {} }]);
    deepStrictEqual(plainService.decorators, []);
    expectDiagnostics(context.diagnostics, []);
  });

  for (const [overrideName, namespaceDecorator, options] of [
    ["@clientNamespace", '@clientNamespace("Renamed")', {}],
    ["namespace option", "", { namespace: "Renamed" }],
  ] as const) {
    it(`preserves namespace metadata when renamed with ${overrideName}`, async () => {
      const { program } = await SimpleTester.compile(`
        ${namespaceDecorator}
        @service
        #suppress "@azure-tools/typespec-client-generator-core/decorator-requires-scope" "Testing unscoped metadata."
        @dynamicModel
        namespace TestService {
          model Pet {
            name: string;
          }

          op test(): Pet;
        }
      `);

      const context = await createSdkContextForTester(program, options, { additionalDecorators });
      const renamed = context.sdkPackage.namespaces[0];
      ok(renamed);
      deepStrictEqual(renamed.fullName, "Renamed");
      deepStrictEqual(renamed.__raw?.name, "TestService");
      deepStrictEqual(renamed.decorators, [{ name: decoratorName, arguments: {} }]);
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
