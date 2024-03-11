import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { patchBodySchemaRule } from "../../src/rules/patch-body-schema.js";
import { createAzureCoreTestRunner } from "../test-host.js";

let runner: BasicTestRunner;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await createAzureCoreTestRunner();
  tester = createLinterRuleTester(runner, patchBodySchemaRule, "@azure-tools/typespec-azure-core");
});

it("emits warning when PATCH body schema contains non-recommended patterns", async () => {
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

it("does not emit warning when PATCH body schema conforms to guidlines", async () => {
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
