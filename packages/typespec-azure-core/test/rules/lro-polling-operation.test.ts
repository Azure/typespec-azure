import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { longRunningOperationsRequirePollingOperation } from "../../src/rules/lro-polling-operation.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: long-running-polling-operation-required rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner({ omitServiceNamespace: true });
    tester = createLinterRuleTester(
      runner,
      longRunningOperationsRequirePollingOperation,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emits `long-running-polling-operation-required` when a long-running operation has no pollingOperation", async () => {
    await tester
      .expect(
        `
        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        namespace Test;

        op read(): Foundations.LongRunningStatusLocation;
        op readWithError(): Foundations.LongRunningStatusLocation | { error: string };
        op readWithCustomHeader(): {
          @TypeSpec.Http.header("operation-LOCATION")
          location: string;
        } | { error: string };
      `
      )
      .toEmitDiagnostics([
        {
          code: "@azure-tools/typespec-azure-core/long-running-polling-operation-required",
          message:
            "This operation has an 'Operation-Location' header but no polling operation. Use the '@pollingOperation' decorator to link a status polling operation.",
        },
        {
          code: "@azure-tools/typespec-azure-core/long-running-polling-operation-required",
          message:
            "This operation has an 'Operation-Location' header but no polling operation. Use the '@pollingOperation' decorator to link a status polling operation.",
        },
        {
          code: "@azure-tools/typespec-azure-core/long-running-polling-operation-required",
          message:
            "This operation has an 'Operation-Location' header but no polling operation. Use the '@pollingOperation' decorator to link a status polling operation.",
        },
      ]);
  });

  it("does not emit `long-running-polling-operation-required` when a long-running operation has a pollingOperation", async () => {
    await tester
      .expect(
        `
        @useDependency(Azure.Core.Versions.v1_0_Preview_2)
        namespace Test;

        op getOperationStatus is Foundations.GetOperationStatus;

        @pollingOperation(getOperationStatus)
        op read(): Foundations.LongRunningStatusLocation;

        @pollingOperation(getOperationStatus)
        op readWithError(): Foundations.LongRunningStatusLocation | { error: string };

        @pollingOperation(getOperationStatus)
        op readWithCustomHeader(): {
          @TypeSpec.Http.header("operation-LOCATION")
          location: string;
        } | { error: string };
      `
      )
      .toBeValid();
  });
});
