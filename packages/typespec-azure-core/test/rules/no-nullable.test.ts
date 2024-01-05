import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noNullableRule } from "../../src/rules/no-nullable.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-nullable rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, noNullableRule, "@azure-tools/typespec-azure-core");
  });

  it("emit warning if using nullable property", async () => {
    await tester.expect(`model Bar { prop: string | null }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-nullable",
      severity: "warning",
    });
  });
});
