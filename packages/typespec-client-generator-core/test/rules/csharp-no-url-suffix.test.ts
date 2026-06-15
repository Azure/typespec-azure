import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { csharpNoUrlSuffixRule } from "../../src/rules/csharp-no-url-suffix.js";
import { SimpleTester } from "../tester.js";

const libraryName = "@azure-tools/typespec-client-generator-core";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, csharpNoUrlSuffixRule, libraryName);
});

// --- Invalid cases ---

it("emits warning when property name ends with Url", async () => {
  await tester.expect(`model Foo { imageUrl: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix",
    message:
      "Property 'imageUrl' ends with 'Url'. Use 'Uri' suffix instead (e.g. 'imageUri'). Use @clientName(\"imageUri\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning for callbackUrl", async () => {
  await tester.expect(`model Webhook { callbackUrl: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix",
  });
});

it("emits warning for property named exactly Url", async () => {
  await tester.expect(`model Link { Url: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix",
  });
});

it("emits warning when @clientName for another language does not resolve Url suffix", async () => {
  await tester
    .expect(`model Foo { @clientName("image_url", "python") imageUrl: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix",
    });
});

it("emits warning when @clientName introduces Url suffix", async () => {
  await tester
    .expect(`model Foo { @clientName("imageUrl", "csharp") image: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix",
    });
});

it("emits warning for spread property ending with Url", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo { ...Base; }`,
    )
    .toEmitDiagnostics([
      { code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix" },
      { code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix" },
    ]);
});

it("emits warning for property introduced via is", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo is Base {}`,
    )
    .toEmitDiagnostics([
      { code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix" },
      { code: "@azure-tools/typespec-client-generator-core/csharp-no-url-suffix" },
    ]);
});

// --- Valid cases ---

it("is valid when property name ends with Uri", async () => {
  await tester.expect(`model Foo { imageUri: string; }`).toBeValid();
});

it("is valid when property does not end with Url", async () => {
  await tester.expect(`model Foo { name: string; }`).toBeValid();
});

it("is valid for Urls plural", async () => {
  await tester.expect(`model Foo { imageUrls: string[]; }`).toBeValid();
});

it("is case-sensitive — does not flag lowercase url", async () => {
  await tester.expect(`model Foo { imageurl: string; }`).toBeValid();
});

it("is valid when @clientName resolves Url to Uri for csharp", async () => {
  await tester
    .expect(`model Foo { @clientName("imageUri", "csharp") imageUrl: string; }`)
    .toBeValid();
});

it("is valid when augmented @clientName resolves Url to Uri", async () => {
  await tester
    .expect(
      `model Foo { imageUrl: string; }
      @@clientName(Foo.imageUrl, "imageUri", "csharp");`,
    )
    .toBeValid();
});

it("is valid when @clientName without language scope resolves Url to Uri", async () => {
  await tester.expect(`model Foo { @clientName("imageUri") imageUrl: string; }`).toBeValid();
});

it("does not flag inherited properties when base is suppressed", async () => {
  await tester
    .expect(
      `model Base {
        @clientName("imageUri", "csharp")
        imageUrl: string;
      }
      model Foo extends Base {}`,
    )
    .toBeValid();
});

it("does not flag non-model-property types", async () => {
  await tester.expect(`scalar ImageUrl extends string;`).toBeValid();
});

// --- Codefix ---

describe("codefix", () => {
  it("writes @@clientName to client.tsp with imports and correct target ref", async () => {
    await tester
      .expect({
        "main.tsp": `model Foo { imageUrl: string; }`,
        "client.tsp": ``,
      })
      .applyCodeFix("add-clientName-in-client-tsp")
      .toEqual({
        "client.tsp": `import "@azure-tools/typespec-client-generator-core";

using Azure.ClientGenerator.Core;

@@clientName(Foo.imageUrl, "imageUri", "csharp");
`,
      });
  });

  it("after applying the codefix, the diagnostic disappears", async () => {
    await tester
      .expect(
        `model Foo { imageUrl: string; }
        @@clientName(Foo.imageUrl, "imageUri", "csharp");`,
      )
      .toBeValid();
  });
});
