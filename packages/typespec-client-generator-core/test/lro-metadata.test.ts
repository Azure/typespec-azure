import { getLroMetadata, getLroProtocolMetadata } from "@azure-tools/typespec-azure-core";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { getAllHttpServices } from "@typespec/http";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { getNativeLroMetadata, resolveLroClientResult } from "../src/lro-metadata.js";
import { AzureCoreTester } from "./tester.js";

const prefix = `
  @service namespace TestService;
  alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
  @resource("widgets") model Widget { @key name: string; value: string; }
`;

it.each([
  ["resource PUT", "op start is Operations.LongRunningResourceCreateOrReplace<Widget>;"],
  [
    "resource PUT with polling result",
    `op poll is Operations.GetResourceOperationStatus<Widget>;
     @pollingOperation(poll)
     op start is Operations.LongRunningResourceCreateOrReplace<Widget>;`,
  ],
  ["resource DELETE", "op start is Operations.LongRunningResourceDelete<Widget>;"],
  ["resource action", "op start is Operations.LongRunningResourceAction<Widget, {}, Widget>;"],
  [
    "RPC",
    '@route("/jobs") op start is LongRunningRpcOperation<{}, Widget, NoRepeatableRequests & NoClientRequestId>;',
  ],
  ...["Widget", "string", "unknown", "never"].map((result) => [
    `custom status result ${result}`,
    `model Status {
       @lroStatus status: "Succeeded" | "Failed" | "Canceled";
       @lroResult result: ${result};
     }
     @route("/jobs") @post op start(): {
       @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
     };`,
  ]),
  [
    "linked final request",
    `model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
     @route("/widgets/{name}") @get op read(@path name: string): Widget;
     @route("/jobs/{name}") @get op poll(@path name: string): Status;
     @finalOperation(read)
     @pollingOperation(poll)
     @route("/widgets/{name}") @put op start(@path name: string): Widget;`,
  ],
  [
    "final-location link",
    `model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
     @route("/jobs") @post op start(): {
       @pollingLocation @header("Operation-Location") polling: ResourceLocation<Status>;
       @finalLocation @header("Location") result: ResourceLocation<Widget>;
     };`,
  ],
])("selects the same raw result contract as Core for %s", async (_, code) => {
  const { program } = await AzureCoreTester.compile(prefix + code);
  const [services] = getAllHttpServices(program);
  const operation = services[0].operations.find((o) => o.operation.name === "start")!.operation;
  const protocol = getLroProtocolMetadata(program, operation);
  ok(protocol);
  const before = { ...protocol };
  Object.freeze(protocol);
  if (protocol.finalStep) Object.freeze(protocol.finalStep);
  const selected = resolveLroClientResult(protocol);
  const native = getNativeLroMetadata(program, operation);
  const legacy = getLroMetadata(program, operation);
  ok(native);
  ok(legacy);
  deepStrictEqual(native, legacy);
  for (const key of [
    "logicalResult",
    "logicalPath",
    "envelopeResult",
    "finalResult",
    "finalEnvelopeResult",
    "finalResultPath",
  ] as const) {
    strictEqual(selected[key], legacy[key], key);
  }
  deepStrictEqual(protocol, before);
  expectDiagnosticEmpty(program.diagnostics);
});

it("does not synthesize native LRO metadata for an ordinary operation", async () => {
  const { program } = await AzureCoreTester.compile(
    prefix + '@get @route("/widgets") op start(): Widget;',
  );
  const [services] = getAllHttpServices(program);
  strictEqual(getNativeLroMetadata(program, services[0].operations[0].operation), undefined);
  expectDiagnosticEmpty(program.diagnostics);
});

it.each([getLroMetadata, getNativeLroMetadata])(
  "preserves explicit-original-uri diagnostics in %s",
  async (getMetadata) => {
    const { program } = await AzureCoreTester.compile(
      prefix +
        `
      model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @useFinalStateVia("original-uri")
      @route("/jobs") @post op start(): {
        @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
      };
    `,
    );
    const [services] = getAllHttpServices(program);
    const metadata = getMetadata(program, services[0].operations[0].operation);
    ok(metadata);
    strictEqual(metadata.finalResult, "void");
    strictEqual(metadata.finalEnvelopeResult, "void");
    strictEqual(metadata.finalStateVia, "original-uri");
    expectDiagnostics(program.diagnostics, {
      code: "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
    });
  },
);
