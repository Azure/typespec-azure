import { createLinterRuleTester, LinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpNoOptionsSuffixRule } from "../../src/rules/csharp-no-options-suffix.js";
import { SimpleBaseTester, SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpNoOptionsSuffixRule, libraryName);
});

it("emits warning when model name ends with Options", async () => {
  await tester.expect(`model FooOptions { id: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-options-suffix",
    message:
      "Model 'FooOptions' ends with 'Options'. Use 'Config' suffix instead (e.g. 'FooConfig'). Use @clientName(\"FooConfig\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning when @clientName introduces Options suffix for C#", async () => {
  await tester
    .expect(`@clientName("FooOptions", "csharp") model FooConfig { id: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/csharp-no-options-suffix",
    });
});

it("is valid when model name ends with Config", async () => {
  await tester.expect(`model FooConfig { id: string; }`).toBeValid();
});

it("is valid when C# client name uses Config", async () => {
  await tester
    .expect(`@clientName("FooConfig", "csharp") model FooOptions { id: string; }`)
    .toBeValid();
});

it("does not flag ClientOptions", async () => {
  await tester.expect(`model WidgetClientOptions { id: string; }`).toBeValid();
});

describe("codefix", () => {
  it("writes @@clientName to client.tsp", async () => {
    const baseRunner = await SimpleBaseTester.createInstance();
    const baseTester = createLinterRuleTester(baseRunner, csharpNoOptionsSuffixRule, libraryName);

    await baseTester
      .expect({
        "main.tsp": `model FooOptions { id: string; }`,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": `import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@@clientName(FooOptions, "FooConfig", "csharp");
`,
      });
  });
});
