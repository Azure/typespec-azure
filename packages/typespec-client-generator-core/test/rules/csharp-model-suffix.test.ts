import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpModelSuffixRule } from "../../src/rules/csharp-model-suffix.js";
import { AzureCoreTester, d, SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";
const ruleCode = `${libraryName}/csharp-model-suffix`;
const conventions = [
  { badSuffix: "Options", replacementSuffix: "Config" },
  { badSuffix: "Request", replacementSuffix: "Content" },
  { badSuffix: "Response", replacementSuffix: "Result" },
] as const;

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpModelSuffixRule, libraryName);
});

it.each(conventions)(
  "emits warning when model name ends with $badSuffix",
  async ({ badSuffix, replacementSuffix }) => {
    await tester.expect(`model Foo${badSuffix} { id: string; }`).toEmitDiagnostics({
      code: ruleCode,
      message: `Model 'Foo${badSuffix}' ends with '${badSuffix}'. Use '${replacementSuffix}' suffix instead (e.g. 'Foo${replacementSuffix}'). Use @clientName("Foo${replacementSuffix}", "csharp") to rename it for C#.`,
    });
  },
);

it.each(conventions)(
  "emits warning when @clientName introduces $badSuffix suffix for C#",
  async ({ badSuffix, replacementSuffix }) => {
    await tester
      .expect(
        `@clientName("Foo${badSuffix}", "csharp") model Foo${replacementSuffix} { id: string; }`,
      )
      .toEmitDiagnostics({ code: ruleCode });
  },
);

it.each(conventions)(
  "is valid when model name ends with $replacementSuffix",
  async ({ replacementSuffix }) => {
    await tester.expect(`model Foo${replacementSuffix} { id: string; }`).toBeValid();
  },
);

it.each(conventions)(
  "is valid when C# client name uses $replacementSuffix",
  async ({ badSuffix, replacementSuffix }) => {
    await tester
      .expect(
        `@clientName("Foo${replacementSuffix}", "csharp") model Foo${badSuffix} { id: string; }`,
      )
      .toBeValid();
  },
);

it("does not flag ClientOptions", async () => {
  await tester.expect(`model WidgetClientOptions { id: string; }`).toBeValid();
});

it("is valid for RequestBody suffix", async () => {
  await tester.expect(`model FooRequestBody { id: string; }`).toBeValid();
});

it("emits warning for service-defined ErrorResponse", async () => {
  await tester.expect(`model ErrorResponse { code: string; }`).toEmitDiagnostics({
    code: ruleCode,
  });
});

it("does not flag Azure.Core library request models", async () => {
  const runner = await AzureCoreTester.createInstance();
  const azureCoreTester = createLinterRuleTester(runner, csharpModelSuffixRule, libraryName);

  await azureCoreTester
    .expect(
      `model Widget {
        id: string;
      }
      alias RequestPayload = Foundations.ResourceBody<Widget>;`,
    )
    .toBeValid();
});

it("does not flag the standard Azure.Core ErrorResponse", async () => {
  const runner = await AzureCoreTester.createInstance();
  const azureCoreTester = createLinterRuleTester(runner, csharpModelSuffixRule, libraryName);

  await azureCoreTester.expect(`alias StandardError = Foundations.ErrorResponse;`).toBeValid();
});

it("does not flag the standard Azure.ResourceManager CommonTypes ErrorResponse", async () => {
  await tester
    .expect(
      `namespace Azure.ResourceManager.CommonTypes;
      model ErrorResponse {
        error: string;
      }`,
    )
    .toBeValid();
});

describe("codefix", () => {
  it.each(conventions)(
    "writes @@clientName for $badSuffix to client.tsp",
    async ({ badSuffix, replacementSuffix }) => {
      const baseRunner = await SimpleBaseTester.createInstance();
      const baseTester = createLinterRuleTester(baseRunner, csharpModelSuffixRule, libraryName);

      await baseTester
        .expect({
          "main.tsp": `model Foo${badSuffix} { id: string; }`,
          "client.tsp": ``,
        })
        .applyCodeFix("add-clientName-in-client-tsp")
        .toEqual({
          "client.tsp": d`
            import "@azure-tools/typespec-client-generator-core";

            using Azure.ClientGenerator.Core;

            @@clientName(Foo${badSuffix}, "Foo${replacementSuffix}", "csharp");
          `,
        });
    },
  );
});
