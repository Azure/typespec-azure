import {
  BasicTestRunner,
  createLinterRuleTester,
  LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireClientSuffixRule } from "../../src/rules/require-client-suffix.js";
import { createTcgcTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: client names end with 'Client'", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createTcgcTestRunner();
    tester = createLinterRuleTester(
      runner,
      requireClientSuffixRule,
      "@azure-tools/typespec-client-generator-core"
    );
  });

  it("namespace", async () => {
    await tester
      .expect(
        `
      @service
      namespace MyService;

      namespace MyCustomizations {
        @@client(MyService);
      }
      `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/require-client-suffix",
          severity: "warning",
          message: `Client name "MyNamespace" must end with Client. Use @client({name: "...Client"}`,
        },
      ]);
  });
});
