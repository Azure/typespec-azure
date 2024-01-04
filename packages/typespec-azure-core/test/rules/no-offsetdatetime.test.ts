import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noOffsetDateTimeRule } from "../../src/rules/no-offsetdatetime.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no-offsetdatetime rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      noOffsetDateTimeRule,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emit warning if offsetDateTime used as property type", async () => {
    await tester.expect(`model Bar { prop: offsetDateTime }`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-offsetdatetime",
      severity: "warning",
    });
  });

  it("emit warning if offsetDateTime used as operation return type", async () => {
    await tester.expect(`op test(): offsetDateTime;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-offsetdatetime",
      severity: "warning",
    });
  });

  it("emit warning if offsetDateTime used as union variant", async () => {
    await tester.expect(`union U {a: offsetDateTime}`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-offsetdatetime",
      severity: "warning",
    });
  });
  it("emit warning if offsetDateTime used as scalar extends", async () => {
    await tester.expect(`scalar Foo extends offsetDateTime;`).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/no-offsetdatetime",
      severity: "warning",
    });
  });
});
