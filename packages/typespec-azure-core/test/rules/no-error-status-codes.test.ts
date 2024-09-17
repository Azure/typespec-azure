import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noErrorStatusCodesRule } from "../../src/rules/no-error-status-codes.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: no custom 4xx or 5xx responses", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      noErrorStatusCodesRule,
      "@azure-tools/typespec-azure-core",
    );
  });

  it("emit a warning if a custom 4xx is specified", async () => {
    await tester
      .expect(
        `
        @resource("widgets") model Widget { @key name: string; }

        @route("/api/widgets/{name}")
        op readWidget(name: string): {
           @statusCode statusCode: 404;
           @body message: "Not Found";
        };
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-error-status-codes",
          severity: "warning",
          message: `Azure REST API guidelines recommend using 'default' error response for all error cases. Avoid defining custom 4xx or 5xx error cases.`,
        },
      ]);
  });

  it("emit a warning if a custom 5xx is specified", async () => {
    await tester
      .expect(
        `
        @resource("widgets") model Widget { @key name: string; }

        @route("/api/widgets/{name}")
        op readWidget(name: string): {
           @statusCode statusCode: 503;
           @body message: "Service Unavailable";
        };
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-error-status-codes",
          severity: "warning",
          message: `Azure REST API guidelines recommend using 'default' error response for all error cases. Avoid defining custom 4xx or 5xx error cases.`,
        },
      ]);
  });
});
