import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { knownEncodingRule } from "../../src/rules/known-encoding.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: known-encoding rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, knownEncodingRule, "@azure-tools/typespec-azure-core");
  });

  it("emit warning if using an unknown encoding on a scalar", async () => {
    await tester
      .expect(`@encode("custom-rfc") scalar myDateTime extends utcDateTime;`)
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/known-encoding",
      });
  });

  it("emit warning if using an unknown encoding on model property", async () => {
    await tester
      .expect(
        `
        model Foo {
          @encode("custom-rfc") myDateTime:  utcDateTime;
        }
        `,
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/known-encoding",
      });
  });

  it("is ok if using known encoding on scalar", async () => {
    await tester.expect(`@encode("rfc3339") scalar myDateTime extends utcDateTime;`).toBeValid();
  });

  it("is ok if using known encoding on model property", async () => {
    await tester
      .expect(
        `
        model Foo {
          @encode("rfc3339") myDateTime:  utcDateTime;
        }
        `,
      )
      .toBeValid();
  });
});
