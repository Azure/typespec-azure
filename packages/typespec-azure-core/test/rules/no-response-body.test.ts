import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noResponseBodyRule } from "../../src/rules/no-response-body.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: require response body for non-204 responses", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(runner, noResponseBodyRule, "@azure-tools/typespec-azure-core");
  });

  it("emit a warning if non-204 response has no response body", async () => {
    await tester
      .expect(
        `
        @resource("widgets") model Widget { @key name: string; }

        @route("/api/widgets/{name}")
        op readWidget(name: string): {
           @statusCode statusCode: 200;
        };
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-response-body",
          severity: "warning",
          message: `The body of non-204 responses should not be empty.`,
        },
      ]);
  });

  it("emit a warning if non-204 error has no response body", async () => {
    await tester
      .expect(
        `
        @resource("widgets") model Widget { @key name: string; }

        @error
        model Error {
          @statusCode statusCode: 400;
        }

        @route("/api/widgets/{name}")
        op readWidget(name: string): Error;
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-response-body",
          severity: "warning",
          message: `The body of non-204 responses should not be empty.`,
        },
      ]);
  });

  it("emit a warning if a 204 response has a response body", async () => {
    await tester
      .expect(
        `
        @resource("widgets") model Widget { @key name: string; }

        @route("/api/widgets/{name}")
        op readWidget(name: string): {
          @statusCode statusCode: 204;
          @body body: Widget;
        };
        `,
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/no-response-body",
          severity: "warning",
          message: `The body of 204 response should be empty.`,
        },
      ]);
  });

  it("valid if a 204 response does not have a response body", async () => {
    await tester
      .expect(
        `
        @resource("widgets") model Widget { @key name: string; }

        @route("/api/widgets/{name}")
        op readWidget(name: string): {
          @statusCode statusCode: 204;
        };
        `,
      )
      .toBeValid();
  });
});
