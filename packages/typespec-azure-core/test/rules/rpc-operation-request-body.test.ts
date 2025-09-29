import { Tester } from "#test/test-host.js";
import { LinterRuleTester, createLinterRuleTester } from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";
import { rpcOperationRequestBodyRule } from "../../src/rules/rpc-operation-request-body.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  const runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    rpcOperationRequestBodyRule,
    "@azure-tools/typespec-azure-core",
  );
});

it("allow RPCOperation with `@get` and empty body", async () => {
  await tester
    .expect(
      `
        model Widget {
          name: string;
        }

        @get
        @route ("/")
        op getWidget is RpcOperation<{}, Widget>;
      `,
    )
    .toBeValid();
});

it("with @bodyIgnore properties", async () => {
  await tester
    .expect(
      `
        @get
        @route ("/")
        op get is RpcOperation<{ @bodyIgnore options: { @query foo: string }}, {}>;
      `,
    )
    .toBeValid();
});

it("allow RPCOperation with `@delete` and empty body", async () => {
  await tester
    .expect(
      `
        model Widget {
          name: string;
        }

        @delete
        @route ("/")
        op deleteWidget is RpcOperation<{}, Widget>;
      `,
    )
    .toBeValid();
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
      `,
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
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-core/rpc-operation-request-body",
      severity: "warning",
      message: `RPCOperation with '@delete' cannot have a body.`,
    });
});
