import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { singleWordModelNameRule } from "../../src/rules/single-word-model-name.js";
import { SimpleTester } from "../tester.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    singleWordModelNameRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("emits warning for single-word model name", async () => {
  await tester.expect(`model Document { id: string; }`).toEmitDiagnostics({
    code: "@azure-tools/typespec-client-generator-core/single-word-model-name",
    message: "Model name 'Document' is a single word. Use a more descriptive multi-word name.",
  });
});

it("is valid for multi-word model name", async () => {
  await tester.expect(`model TableDocument { id: string; }`).toBeValid();
});

it("is valid for acronym + word model name", async () => {
  await tester.expect(`model HTTPClient { url: string; }`).toBeValid();
});

it("does not flag single-char names", async () => {
  await tester.expect(`model T { id: string; }`).toBeValid();
});

it("is valid when @clientName provides multi-word name", async () => {
  await tester
    .expect(
      `@clientName("StorageDocument", "csharp")
      model Document { id: string; }`,
    )
    .toBeValid();
});

it("emits warning when @clientName is still single-word", async () => {
  await tester
    .expect(
      `@clientName("Blob", "csharp")
      model Document { id: string; }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/single-word-model-name",
    });
});
