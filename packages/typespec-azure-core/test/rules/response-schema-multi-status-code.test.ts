import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { responseSchemaMultiStatusCodeRule } from "../../src/rules/response-schema-multi-status-code.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: response-schema-multi-status-code rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      responseSchemaMultiStatusCodeRule,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emits warning when response schema contains multiple success response schemas", async () => {
    await tester
      .expect(
        `
      @error
      model Error {
        code: int32;
        message: string;
      }

      model Return200 {
        @statusCode status: 200;
        @body body: string;
      }

      model Return201 {
        @statusCode status: 201;
        @body body: int32;
      }

      @test op test(): Return200 | Return201 | Error;

      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/response-schema-problem",
        severity: "warning",
        message: `Operation 'test' has multiple non-error response schemas. Did you forget to add '@error' to one of them?`,
      });
  });

  it("emits warning when response schema contains multiple success response schemas with implicit bodies", async () => {
    await tester
      .expect(
        `
      @error
      model Error {
        code: int32;
        message: string;
      }

      model Return200 {
        @statusCode status: 200;
        name: string;
      }

      model Return201 {
        @statusCode status: 201;
        age: int32;
      }

      @test op test(): Return200 | Return201 | Error;

      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/response-schema-problem",
        severity: "warning",
        message: `Operation 'test' has multiple non-error response schemas. Did you forget to add '@error' to one of them?`,
      });
  });
});
