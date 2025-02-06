import {
  BasicTestRunner,
  createLinterRuleTester,
  LinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { requireClientSuffixRule } from "../../src/rules/require-client-suffix.rule.js";
import { createSdkTestRunner } from "../test-host.js";

describe("require-client-suffix", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createSdkTestRunner();
    tester = createLinterRuleTester(
      runner,
      requireClientSuffixRule,
      "@azure-tools/typespec-client-generator-core",
    );
  });

  it("namespace doesn't end in client", async () => {
    await tester
      .expect(
        `
      @client
      @service({})
      namespace MyService;
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/require-client-suffix",
          severity: "warning",
          message: `Client name "MyService" must end with Client. Use @client({name: "...Client"}`,
        },
      ]);
  });

  it("explicit client name doesn't ends with Client", async () => {
    await tester
      .expect(
        `
      @client({name: "MySDK"})
      @service({})
      namespace MyService;
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/require-client-suffix",
          severity: "warning",
          message: `Client name "MySDK" must end with Client. Use @client({name: "...Client"}`,
        },
      ]);
  });

  it("interface", async () => {
    await tester
      .expect(
        `
      @service
      namespace MyService;

      namespace MyCustomizations {
        @client({service: MyService})
        interface MyInterface {
        };
      }
      `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-client-generator-core/require-client-suffix",
          severity: "warning",
          message: `Client name "MyInterface" must end with Client. Use @client({name: "...Client"}`,
        },
      ]);
  });
});
