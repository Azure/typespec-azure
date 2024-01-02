import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { noRpcPathParamsRule } from "../../src/rules/no-rpc-path-params.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: RPC operations", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      noRpcPathParamsRule,
      "@azure-tools/typespec-azure-core"
    );
  });

  describe("cannot contain path parameters", () => {
    it("as @path parameters", async () => {
      await tester
        .expect(
          `
          @route("/one")
          op testOne is RpcOperation<{ @path bar: string }, { }>;

          op customOp<TFoo extends TypeSpec.Reflection.Model> is RpcOperation<{ @path bar: string }, TFoo>;

          @route("/two")
          op testTwo is customOp<{}>;
        `
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-core/no-rpc-path-params",
            severity: "warning",
            message: `Operations defined using RpcOperation should not have path parameters. Consider using ResourceAction or ResourceCollectionAction instead.`,
          },
          {
            code: "@azure-tools/typespec-azure-core/no-rpc-path-params",
            severity: "warning",
            message: `Operations defined using RpcOperation should not have path parameters. Consider using ResourceAction or ResourceCollectionAction instead.`,
          },
        ]);
    });

    it("as route parameters", async () => {
      await tester
        .expect(
          `
          op customOp<TFoo extends TypeSpec.Reflection.Model> is RpcOperation<{ @path bar: string }, TFoo>;

          @route("/two/{bar}")
          op testTwo is customOp<{ }>;
        `
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-core/no-rpc-path-params",
            severity: "warning",
            message: `Operations defined using RpcOperation should not have path parameters. Consider using ResourceAction or ResourceCollectionAction instead.`,
          },
        ]);
    });

    it("also checks LongRunningRpcOperation", async () => {
      await tester
        .expect(
          `
          @doc("get lro status")
          @route("/lrRpcOp/{operationId}")
          @get op getStatus(@doc("The operation") @path operationId: string): PollingStatus;

          model PollingStatus {
            @doc("PollingLocation")
            @header location?: ResourceLocation<PollingStatus>;

            @doc("The status of the operation")
            @Azure.Core.lroStatus
            statusValue: "Succeeded" | "Canceled" | "Failed" | "Running";
          }

          model StatusError { message: string; }
          @test @pollingOperation(getStatus) @route("/lrRpcOp") op lrRpcOp is Azure.Core.LongRunningRpcOperation<{ @path foo: string }, {}, PollingStatus, StatusError>;
        `
        )
        .toEmitDiagnostics([
          {
            code: "@azure-tools/typespec-azure-core/no-rpc-path-params",
            severity: "warning",
            message: `Operations defined using RpcOperation should not have path parameters. Consider using ResourceAction or ResourceCollectionAction instead.`,
          },
        ]);
    });
  });
});
