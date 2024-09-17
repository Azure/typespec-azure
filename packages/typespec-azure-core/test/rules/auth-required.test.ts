import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { authRequiredRule } from "../../src/rules/auth-required.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: require `@useAuth` on Azure services", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, authRequiredRule, "@azure-tools/typespec-azure-core");
  });

  it("emit a warning if Azure service does not specify `@useAuth`", async () => {
    await tester
      .expect(
        `
        @route("/")
        op readWidget(): string;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/auth-required",
          severity: "warning",
          message:
            "Provide an authentication scheme using the `@useAuth` decorator. See: https://azure.github.io/typespec-azure/docs/reference/azure-style-guide#security-definitions",
        },
      ]);
  });
});
