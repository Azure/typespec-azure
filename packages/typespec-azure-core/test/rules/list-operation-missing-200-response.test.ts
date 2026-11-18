import { Tester } from "#test/test-host.js";
import { type LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { listOperationMissing200ResponseRule } from "../../src/rules/list-operation-missing-200-response.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.wrap(
    (code) => `
      @service namespace Contoso;
      model Page {
        @pageItems value: string[];
      }
      ${code}
    `,
  ).createInstance();
  tester = createLinterRuleTester(
    runner,
    listOperationMissing200ResponseRule,
    "@azure-tools/typespec-azure-core",
  );
});

it("reports a list operation without a 200 response", async () => {
  await tester
    .expect(
      `
        @list op list(): {
          @statusCode status: 201;
          @body body: Page;
        };
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/list-operation-missing-200-response",
      severity: "warning",
      message: "List operations must define a 200 response.",
    });
});

it("accepts a list operation with a 200 response", async () => {
  await tester
    .expect(
      `
        @list op list(): {
          @statusCode status: 200;
          @body body: Page;
        };
      `,
    )
    .toBeValid();
});

it("ignores operations without @list", async () => {
  await tester
    .expect(
      `
        op read(): {
          @statusCode status: 201;
          @body body: Page;
        };
      `,
    )
    .toBeValid();
});
