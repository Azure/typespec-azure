import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noOpenAPIRule } from "../../src/rules/no-openapi.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner();
  tester = createLinterRuleTester(runner, noOpenAPIRule, "@azure-tools/typespec-azure-core");
});

describe("@operationId", () => {
  it("emit warning if @operationId is used", async () => {
    await tester
      .expect(
        `
        @OpenAPI.operationId("foo")
        op test(): string;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi",
        message: `Operation ID is automatically generated by the OpenAPI emitters and should not normally be specified.`,
      });
  });
});

describe("@extension", () => {
  it("emit warning if @extension is used", async () => {
    await tester
      .expect(
        `
        @OpenAPI.extension("x-foo", "bar")
        op test(): string;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi",
        message: `Azure specs should not be using decorator "$extension" from @typespec/openapi or @azure-tools/typespec-autorest. They will not apply to other emitter.`,
      });
  });

  // https://github.com/Azure/typespec-azure/issues/687
  it("exclude x-ms-identifiers key", async () => {
    await tester
      .expect(
        `model foo {
          @OpenAPI.extension("x-ms-identifiers", #["prop"])
          items: Bar;
        }
        model Bar { prop: string;}`,
      )
      .toBeValid();
  });
});

// Can't test as autorest is depending on azure.core

describe.skip("@example", () => {
  it("emit warning if @extension is used", async () => {
    await tester
      .expect(
        `
        @Autorest.example("x-foo", "bar")
        op test(): string;
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi",
      });
  });
});

// Can't test as autorest is depending on azure.core
describe.skip("@useRef", () => {
  it("emit warning if @useRef is used on model", async () => {
    await tester
      .expect(
        `
        @Autorest.useRef("foo.json")
        model Foo {}
      `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/no-openapi",
      });
  });
});
