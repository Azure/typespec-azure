import { Tester } from "#test/tester.js";
import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { createLinterRuleTester, t, type LinterRuleTester } from "@typespec/compiler/testing";
import { getHttpOperation } from "@typespec/http";
import { strictEqual } from "node:assert";
import { beforeEach, it } from "vitest";
import { noGetLroRule } from "../../src/rules/no-get-lro.js";

let tester: LinterRuleTester;

beforeEach(async () => {
  tester = createLinterRuleTester(
    await Tester.createInstance(),
    noGetLroRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

const resource = `
  @armProviderNamespace namespace Microsoft.Test;
  model Widget is ProxyResource<{}> { ...ResourceNameParameter<Widget>; }
`;

const diagnostic = {
  code: "@azure-tools/typespec-azure-resource-manager/no-get-lro",
  message: "GET operations must not be long-running. Use a non-GET operation to initiate an LRO.",
};

it("recognizes a customized GET LRO using the existing Core helper", async () => {
  const { program, read } = await Tester.compile(t.code`
    ${resource}
    @armResourceOperations interface Widgets {
      ${t.op("read")} is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
    }
  `);
  strictEqual(getHttpOperation(program, read)[0].verb, "get");
  strictEqual(getLroMetadata(program, read)?.operation, read);
});

it("reports a resource read customized with a long-running response", async () => {
  await tester
    .expect(
      `
    ${resource}
    @armResourceOperations interface Widgets {
      read is ArmResourceRead<Widget, Response = ArmAcceptedLroResponse>;
    }
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("reports a GET linked to a polling operation", async () => {
  await tester
    .expect(
      `
    ${resource}
    model Status { @Azure.Core.lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
    @route("/status") @get op poll(): Status;
    @Azure.Core.pollingOperation(poll, {})
    @route("/start") @get op start(): { @statusCode statusCode: 202; };
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it("allows a synchronous resource read", async () => {
  await tester
    .expect(
      `
    ${resource}
    @armResourceOperations interface Widgets { read is ArmResourceRead<Widget>; }
  `,
    )
    .toBeValid();
});

it("excludes LRO helpers outside the HTTP service", async () => {
  await tester
    .expect(
      `
    @service namespace Api {
      @get @route("/read") op read(): { value: string; };
    }
    namespace Helpers {
      @get @route("/helper") op helper(): ArmAcceptedLroResponse;
    }
  `,
    )
    .toBeValid();
});

it("checks global HTTP operations when no service is declared", async () => {
  await tester
    .expect(
      `
    @get @route("/read") op read(): ArmAcceptedLroResponse;
  `,
    )
    .toEmitDiagnostics(diagnostic);
});

it.each(["post", "put", "patch", "delete"])("allows a long-running %s", async (verb) => {
  await tester
    .expect(
      `
    ${resource}
    @route("/start") @${verb} op start(): ArmAcceptedLroResponse;
  `,
    )
    .toBeValid();
});
