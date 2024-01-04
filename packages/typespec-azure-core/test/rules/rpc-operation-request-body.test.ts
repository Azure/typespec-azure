import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { rpcOperationRequestBodyRule } from "../../src/rules/rpc-operation-request-body.js";
import { createAzureCoreTestRunner } from "../test-host.js";

describe("typespec-azure-core: rpc-operation-request-body", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureCoreTestRunner();
    tester = createLinterRuleTester(
      runner,
      rpcOperationRequestBodyRule,
      "@azure-tools/typespec-azure-core"
    );
  });

  it("emits warning when RPCOperation is marked with `@get` and has a request body", async () => {
    await tester
      .expect(
        `
        model Widget {
          name: string;
        }

        @get
        @route ("/")
        op getWidget is RpcOperation<{@body body: Widget}, Widget>;
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/rpc-operation-request-body",
        severity: "warning",
        message: `RPCOperation with '@get' cannot have a body.`,
      });
  });

  it("emits warning when RPCOperation is marked with `@delete` and has a request body", async () => {
    await tester
      .expect(
        `
        model Widget {
          name: string;
        }

        @delete
        @route ("/")
        op deleteWidget is RpcOperation<{@body body: Widget}, Widget>;
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-core/rpc-operation-request-body",
        severity: "warning",
        message: `RPCOperation with '@delete' cannot have a body.`,
      });
  });
});
