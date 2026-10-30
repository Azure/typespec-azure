import { expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok } from "assert";
import { it } from "vitest";
import { createSdkContextForTester, SimpleTester } from "../tester.js";

const decoratorName = "Azure.ClientGenerator.Core.@dynamicModel";
const additionalDecorators = ["Azure\\.ClientGenerator\\.Core\\.@dynamicModel"];

it.each([
  { target: "model Example {}", scope: '"csharp"' },
  { target: "model Example {}", scope: '#{ scope: "csharp" }' },
  { target: "namespace Example {}", scope: '"csharp"' },
  { target: "namespace Example {}", scope: '#{ scope: "csharp" }' },
])("accepts $scope on $target", async ({ target, scope }) => {
  expectDiagnostics(await SimpleTester.diagnose(`@dynamicModel(${scope}) ${target}`), []);
});

it.each([
  { target: "model Example {}", decorator: "@dynamicModel" },
  { target: "namespace Example {}", decorator: "@dynamicModel" },
  { target: "model Example {}", decorator: '@dynamicModel("python")' },
  { target: "namespace Example {}", decorator: '@dynamicModel(#{ scope: "python" })' },
])("requires a C# scope for $target with $decorator", async ({ target, decorator }) => {
  expectDiagnostics(await SimpleTester.diagnose(`${decorator} ${target}`), [
    {
      code: "@azure-tools/typespec-client-generator-core/decorator-requires-scope",
      severity: "warning",
      message: '@dynamicModel should be applied with a language scope of "csharp".',
    },
  ]);
});

it("preserves scoped metadata on models and namespaces", async () => {
  const { program } = await SimpleTester.compile(`
    @service
    @dynamicModel("csharp")
    namespace TestService {
      @dynamicModel("csharp")
      model Dynamic {
        name: string;
      }

      model Plain {
        name: string;
      }

      op test(@body body: Dynamic): Plain;
    }
  `);

  const context = await createSdkContextForTester(
    program,
    { emitterName: "@azure-tools/typespec-csharp" },
    { additionalDecorators },
  );
  const dynamic = context.sdkPackage.models.find((model) => model.name === "Dynamic");
  const plain = context.sdkPackage.models.find((model) => model.name === "Plain");
  const namespace = context.sdkPackage.namespaces.find((item) => item.name === "TestService");
  ok(dynamic);
  ok(plain);
  ok(namespace);
  deepStrictEqual(dynamic.decorators, [
    { name: decoratorName, arguments: { scope: "csharp" } },
  ]);
  deepStrictEqual(plain.decorators, []);
  deepStrictEqual(namespace.decorators, [
    { name: decoratorName, arguments: { scope: "csharp" } },
  ]);
  expectDiagnostics(context.diagnostics, []);
});

it("rejects operation and property targets", async () => {
  const diagnostics = await SimpleTester.diagnose(`
    model Pet {
      @dynamicModel("csharp")
      name: string;
    }

    @dynamicModel("csharp")
    op test(): Pet;
  `);

  expectDiagnostics(diagnostics, [
    { code: "decorator-wrong-target" },
    { code: "decorator-wrong-target" },
  ]);
});
