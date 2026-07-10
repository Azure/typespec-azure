import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpNoRequestSuffixRule } from "../../src/rules/csharp-no-request-suffix.js";
import { AzureCoreTester, SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpNoRequestSuffixRule, libraryName);
});

it("emits warning when model name ends with Request", async () => {
  await tester.expect(`model FooRequest { id: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-request-suffix",
    message:
      "Model 'FooRequest' ends with 'Request'. Use 'Content' suffix instead (e.g. 'FooContent'). Use @clientName(\"FooContent\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning when @clientName introduces Request suffix for C#", async () => {
  await tester
    .expect(`@clientName("FooRequest", "csharp") model FooContent { id: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/csharp-no-request-suffix",
    });
});

it("is valid when model name ends with Content", async () => {
  await tester.expect(`model FooContent { id: string; }`).toBeValid();
});

it("is valid when C# client name uses Content", async () => {
  await tester
    .expect(`@clientName("FooContent", "csharp") model FooRequest { id: string; }`)
    .toBeValid();
});

it("is valid for RequestBody suffix", async () => {
  await tester.expect(`model FooRequestBody { id: string; }`).toBeValid();
});

it("does not flag Azure.Core library body templates", async () => {
  const runner = await AzureCoreTester.createInstance();
  const azureCoreTester = createLinterRuleTester(runner, csharpNoRequestSuffixRule, libraryName);

  await azureCoreTester
    .expect(
      `model Widget {
        id: string;
      }
      alias RequestPayload = Foundations.ResourceBody<Widget>;`,
    )
    .toBeValid();
});

describe("codefix", () => {
  it("writes @@clientName to client.tsp", async () => {
    const baseRunner = await SimpleBaseTester.createInstance();
    const baseTester = createLinterRuleTester(baseRunner, csharpNoRequestSuffixRule, libraryName);

    await baseTester
      .expect({
        "main.tsp": `model FooRequest { id: string; }`,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": `import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@@clientName(FooRequest, "FooContent", "csharp");
`,
      });
  });
});
