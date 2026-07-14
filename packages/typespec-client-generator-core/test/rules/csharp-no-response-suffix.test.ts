import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpNoResponseSuffixRule } from "../../src/rules/csharp-no-response-suffix.js";
import { AzureCoreTester, SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpNoResponseSuffixRule, libraryName);
});

it("emits warning when model name ends with Response", async () => {
  await tester.expect(`model FooResponse { id: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-response-suffix",
    message:
      "Model 'FooResponse' ends with 'Response'. Use 'Result' suffix instead (e.g. 'FooResult'). Use @clientName(\"FooResult\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning when @clientName introduces Response suffix for C#", async () => {
  await tester
    .expect(`@clientName("FooResponse", "csharp") model FooResult { id: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/csharp-no-response-suffix",
    });
});

it("emits warning for service-defined ErrorResponse", async () => {
  await tester.expect(`model ErrorResponse { code: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-response-suffix",
  });
});

it("is valid when model name ends with Result", async () => {
  await tester.expect(`model FooResult { id: string; }`).toBeValid();
});

it("is valid when C# client name uses Result", async () => {
  await tester
    .expect(`@clientName("FooResult", "csharp") model FooResponse { id: string; }`)
    .toBeValid();
});

it("does not flag the standard Azure.Core ErrorResponse", async () => {
  const runner = await AzureCoreTester.createInstance();
  const azureCoreTester = createLinterRuleTester(runner, csharpNoResponseSuffixRule, libraryName);

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

it("after applying the codefix, the diagnostic disappears", async () => {
  await tester
    .expect(
      `model FooResponse { id: string; }
@@clientName(FooResponse, "FooResult", "csharp");`,
    )
    .toBeValid();
});

describe("codefix", () => {
  it("writes @@clientName to client.tsp", async () => {
    const baseRunner = await SimpleBaseTester.createInstance();
    const baseTester = createLinterRuleTester(baseRunner, csharpNoResponseSuffixRule, libraryName);

    await baseTester
      .expect({
        "main.tsp": `model FooResponse { id: string; }`,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": `import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@@clientName(FooResponse, "FooResult", "csharp");
`,
      });
  });
});
