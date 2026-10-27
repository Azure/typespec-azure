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

  it("preserves metadata on enclosing namespaces", async () => {
    const { program } = await SimpleTester.compile(`
      @dynamicModel
      namespace Outer {
        model OuterModel {
          name: string;
        }

        @service
        namespace Service {
          model ServiceModel {
            name: string;
          }

          @route("/outer")
          op getOuter(): OuterModel;

          @route("/service")
          op getService(): ServiceModel;

          namespace Nested {
            model NestedModel {
              name: string;
            }

            @route("/nested")
            op getNested(): NestedModel;
          }
        }
      }
    `);

    const context = await createSdkContextForTester(
      program,
      { emitterName: "@azure-tools/typespec-csharp" },
      { additionalDecorators },
    );
    const outer = context.sdkPackage.namespaces[0];
    ok(outer);
    deepStrictEqual(
      outer.models.map((model) => model.name),
      ["OuterModel"],
    );
    deepStrictEqual(outer.decorators, [{ name: decoratorName, arguments: {} }]);
    const service = outer.namespaces[0];
    ok(service);
    deepStrictEqual(
      service.models.map((model) => model.name),
      ["ServiceModel"],
    );
    deepStrictEqual(service.decorators, []);
    const nested = service.namespaces[0];
    ok(nested);
    deepStrictEqual(
      nested.models.map((model) => model.name),
      ["NestedModel"],
    );
    deepStrictEqual(nested.decorators, []);
    expectDiagnostics(context.diagnostics, []);
  });

  it("does not add metadata to a sibling namespace", async () => {
    const { program } = await SimpleTester.compile(`
      @service
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

  for (const [overrideName, namespaceDecorator, options] of [
    ["@clientNamespace", '@clientNamespace("Renamed")', {}],
    ["namespace option", "", { namespace: "Renamed" }],
  ] as const) {
    it(`preserves enclosing namespace metadata when renamed with ${overrideName}`, async () => {
      const { program } = await SimpleTester.compile(`
        @dynamicModel
        namespace Outer {
          ${namespaceDecorator}
          @service
          namespace Service {
            model Pet {
              name: string;
            }

            op test(): Pet;
          }
        }

        @service
        namespace Unrelated {
          model OtherPet {
            name: string;
          }

          op test(): OtherPet;
        }
      `);

      const context = await createSdkContextForTester(program, options, { additionalDecorators });
      const renamed = context.sdkPackage.namespaces.find(
        (namespace) => namespace.name === "Renamed",
      );
      ok(renamed);
      deepStrictEqual(renamed.decorators, [{ name: decoratorName, arguments: {} }]);
      const otherPet = context.sdkPackage.models.find((model) => model.name === "OtherPet");
      ok(otherPet);
      deepStrictEqual(otherPet.decorators, []);
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
