import {
  createLinterRuleTester,
  LinterRuleTester,
  TesterInstance,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { modelNameRequestSuffixRule } from "../../src/rules/model-name-request-suffix.rule.js";
import { SimpleTester } from "../tester.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await SimpleTester.createInstance();
  tester = createLinterRuleTester(
    runner,
    modelNameRequestSuffixRule,
    "@azure-tools/typespec-client-generator-core",
  );
});

it("emits warning when model name ends with Request", async () => {
  await tester
    .expect(
      `model PredictionRequest {
        value: string;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/model-name-request-suffix",
      message: `Model name 'PredictionRequest' ends with 'Request'. Consider renaming it to 'PredictionContent' or use @clientName("PredictionContent", "csharp") to rename it for C#.`,
    });
});

it("is valid when model name does not end with Request", async () => {
  await tester
    .expect(
      `model PredictionContent {
        value: string;
      }`,
    )
    .toBeValid();
});

it("is valid when model name ends with Requests (plural)", async () => {
  await tester
    .expect(
      `model BatchRequests {
        items: string[];
      }`,
    )
    .toBeValid();
});

it("is valid when @clientName overrides to Content suffix", async () => {
  await tester
    .expect(
      `@clientName("PredictionContent", "csharp")
      model PredictionRequest {
        value: string;
      }`,
    )
    .toBeValid();
});

it("emits warning when @clientName still ends with Request", async () => {
  await tester
    .expect(
      `@clientName("MyPredictionRequest", "csharp")
      model SomePrediction {
        value: string;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/model-name-request-suffix",
      message: `Model name 'MyPredictionRequest' ends with 'Request'. Consider renaming it to 'MyPredictionContent' or use @clientName("MyPredictionContent", "csharp") to rename it for C#.`,
    });
});

it("does not flag model named exactly Request", async () => {
  await tester
    .expect(
      `model Request {
        value: string;
      }`,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-client-generator-core/model-name-request-suffix",
    });
});

it("is case-sensitive - does not flag lowercase request", async () => {
  await tester
    .expect(
      `model Myrequest {
        value: string;
      }`,
    )
    .toBeValid();
});

it("does not flag non-model types", async () => {
  await tester.expect(`scalar RequestId extends string;`).toBeValid();
});

describe("codefix", () => {
  it("offers replace Request with Content codefix", async () => {
    await tester
      .expect(
        `
        model PredictionRequest {
          value: string;
        }`,
      )
      .applyCodeFix("replace-request-with-content").toEqual(`
        @clientName("PredictionContent", "csharp")
        model PredictionRequest {
          value: string;
        }`);
  });
});
