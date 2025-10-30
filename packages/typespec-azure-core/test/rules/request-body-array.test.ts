import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { bodyArrayRule } from "../../src/rules/request-body-array.js";

describe("typespec-azure-core: Request body raw array rule", () => {
  let tester: LinterRuleTester;

  beforeEach(async () => {
    const runner = await Tester.createInstance();
    tester = createLinterRuleTester(runner, bodyArrayRule, "@azure-tools/typespec-azure-core");
  });

  describe("operation request body should not be raw array type", () => {
    it("emits warning if request body is raw array", async () => {
      await tester.expect(`op foo( @body body: string[]): string;`).toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/request-body-problem",
        message:
          "Request body should not be of raw array type. Consider creating a container model that can add properties over time to avoid introducing breaking changes.",
      });
    });

    it("does not emit warning if response body is raw array", async () => {
      await tester.expect(`op foo( @body body: string): string[];`).toBeValid();
    });
  });
});
