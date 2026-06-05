import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, expect, it } from "vitest";
import { noUrlSuffixRule } from "../../src/rules/no-url-suffix.js";
import { SimpleTester } from "../tester.js";
import { applyClientTspCodeFix } from "./test-codefix-helpers.js";

const libraryName = "@azure-tools/typespec-client-generator-core";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(runner, noUrlSuffixRule, libraryName);
});

// --- Invalid cases ---

it("emits warning when property name ends with Url", async () => {
  await tester.expect(`model Foo { imageUrl: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/no-url-suffix",
    message:
      "Property 'imageUrl' ends with 'Url'. Use 'Uri' suffix instead (e.g. 'imageUri'). Use @clientName(\"imageUri\", \"csharp\") to rename it for C#.",
  });
});

it("emits warning for callbackUrl", async () => {
  await tester.expect(`model Webhook { callbackUrl: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/no-url-suffix",
  });
});

it("emits warning for property named exactly Url", async () => {
  await tester.expect(`model Link { Url: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/no-url-suffix",
  });
});

it("emits warning when @clientName for another language does not resolve Url suffix", async () => {
  await tester
    .expect(`model Foo { @clientName("image_url", "python") imageUrl: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/no-url-suffix",
    });
});

it("emits warning when @clientName introduces Url suffix", async () => {
  await tester
    .expect(`model Foo { @clientName("imageUrl", "csharp") image: string; }`)
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/no-url-suffix",
    });
});

it("emits warning for spread property ending with Url", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo { ...Base; }`,
    )
    .toEmitDiagnostics([
      { code: "@azure-tools/typespec-client-generator-core/no-url-suffix" },
      { code: "@azure-tools/typespec-client-generator-core/no-url-suffix" },
    ]);
});

it("emits warning for property introduced via is", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo is Base {}`,
    )
    .toEmitDiagnostics([
      { code: "@azure-tools/typespec-client-generator-core/no-url-suffix" },
      { code: "@azure-tools/typespec-client-generator-core/no-url-suffix" },
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

it("does not flag inherited properties", async () => {
  await tester
    .expect(
      `model Base { imageUrl: string; }
      model Foo extends Base {}`,
    )
    .toEmitDiagnostics([{ code: "@azure-tools/typespec-client-generator-core/no-url-suffix" }]);
});

it("does not flag non-model-property types", async () => {
  await tester.expect(`scalar ImageUrl extends string;`).toBeValid();
});

it("does not flag properties from library types even if they end with Url", async () => {
  // The SimpleTester loads @typespec/http, @typespec/rest, @azure-tools/typespec-client-generator-core
  // which define various types. navigateProgram visits ALL types including library ones,
  // but createLinterRuleContext.reportDiagnostic silently drops diagnostics targeting
  // library code (context.type !== "project"). This test verifies that behavior:
  // compile user code with NO Url properties — if library Url properties were reported,
  // this test would fail with unexpected diagnostics.
  await tester
    .expect(
      `model Clean {
        name: string;
        count: int32;
      }`,
    )
    .toBeValid();
});

// --- Codefix ---

describe("codefix", () => {
  it("writes @@clientName to client.tsp with imports and correct target ref", async () => {
    const content = await applyClientTspCodeFix(
      runner,
      noUrlSuffixRule,
      libraryName,
      `model Foo { imageUrl: string; }`,
      "add-clientName-in-client-tsp",
    );
    expect(content).toContain('import "@azure-tools/typespec-client-generator-core"');
    expect(content).toContain("using Azure.ClientGenerator.Core");
    expect(content).toContain('@@clientName(Foo.imageUrl, "imageUri", "csharp")');
    expect(content).toMatch(/@@clientName\(\w/);
  });

  it("after applying the codefix, the diagnostic disappears", async () => {
    const content = await applyClientTspCodeFix(
      runner,
      noUrlSuffixRule,
      libraryName,
      `model Foo { imageUrl: string; }`,
      "add-clientName-in-client-tsp",
    );
    const clientNameLine = content
      .split("\n")
      .find((l) => l.includes("@@clientName("))!
      .trim();
    await tester.expect(`model Foo { imageUrl: string; }\n${clientNameLine}`).toBeValid();
  });
});
