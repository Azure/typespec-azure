import { resolvePath } from "@typespec/compiler";
import { createTester, expectDiagnostics } from "@typespec/compiler/testing";
import { describe, it } from "vitest";

const Tester = createTester(resolvePath(import.meta.dirname, ".."), {
  libraries: ["@typespec/http", "@azure-tools/typespec-azure-core"],
})
  .importLibraries()
  .using("Http", "Azure.Core");

describe("validate @pollingOperationParameter reference a valid parameter", () => {
  it("implicit name", async () => {
    const diagnostics = await Tester.diagnose(`
    model PollingStatus {
      @lroStatus statusValue: "Succeeded" | "Failed" | "Running";
    }

    @pollingOperation(getStatus)
    op createWidget(body: string): {
      @statusCode _: 202;
      @pollingOperationParameter @header bar: string;
    };

    @route("/status")
    op getStatus(): PollingStatus;
  `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/invalid-polling-operation-parameter",
      message:
        "The @pollingOperationParameter 'bar' does not reference a valid parameter in the polling operation.",
    });
  });

  it("explicit name", async () => {
    const diagnostics = await Tester.diagnose(`
    model PollingStatus {
      @lroStatus statusValue: "Succeeded" | "Failed" | "Running";
    }

    @pollingOperation(getStatus)
    op createWidget(body: string): {
      @statusCode _: 202;
      @pollingOperationParameter("baz") @header bar: string;
    };

    @route("/status")
    op getStatus(bar: string): PollingStatus;
  `);

    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-azure-core/invalid-polling-operation-parameter",
      message:
        "The @pollingOperationParameter 'baz' does not reference a valid parameter in the polling operation.",
    });
  });
});
