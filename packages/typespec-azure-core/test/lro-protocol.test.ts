import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { getLroProtocolMetadata } from "../src/index.js";
import { getOperations } from "./test-host.js";

it("retains required final requests and polling parameter bindings as protocol facts", async () => {
  const [operations, diagnostics, runner] = await getOperations(`
    model Status {
      @lroStatus status: "Succeeded" | "Canceled" | "Failed" | "Running";
    }
    model Widget { value: string; }
    @route("/widgets/{id}") @get op read(@path id: string): Widget;
    @route("/operations/{operationId}") @get op poll(@path operationId: string): Status;
    @finalOperation(read, { id: RequestParameter<"id"> })
    @pollingOperation(poll, { operationId: ResponseProperty<"operationId"> })
    @route("/widgets/{id}") @put
    op start(@path id: string): {
      @statusCode statusCode: 202;
      @header operationId: string;
    };
  `);
  expectDiagnosticEmpty(diagnostics);
  const operation = operations.find((o) => o.operation.name === "start")!.operation;
  const protocol = getLroProtocolMetadata(runner.program, operation);
  ok(protocol);
  strictEqual(protocol.operation, operation);
  strictEqual(protocol.finalStateVia, "original-uri");
  strictEqual(protocol.originalUriHasGetOperation, undefined);
  strictEqual(protocol.finalStep?.kind, "finalOperationReference");
  const finalTarget = protocol.finalStep.target;
  strictEqual(
    finalTarget.operation,
    operations.find((o) => o.operation.name === "read")!.operation,
  );
  const finalParameter = finalTarget.parameters?.get("id");
  ok(finalParameter);
  strictEqual(finalParameter.source, operation.parameters.properties.get("id"));
  strictEqual(finalParameter.target, finalTarget.operation.parameters.properties.get("id"));
  strictEqual(finalParameter.sourceKind, "RequestParameter");
  strictEqual(protocol.statusMonitorStep?.kind, "nextOperationReference");
  const pollingParameter = protocol.statusMonitorStep.target.parameters?.get("operationId");
  ok(pollingParameter);
  strictEqual(pollingParameter.source, protocol.initialResponse.properties.get("operationId"));
  strictEqual(pollingParameter.sourceKind, "ResponseBody");
  strictEqual(protocol.pollingInfo.terminationStatus.kind, "model-property");
  strictEqual(
    protocol.pollingInfo.terminationStatus.property,
    protocol.pollingInfo.responseModel.properties.get("status"),
  );
  deepStrictEqual(protocol.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
  deepStrictEqual(Object.keys(protocol).sort(), [
    "finalStateVia",
    "finalStep",
    "initialResponse",
    "isAction",
    "operation",
    "originalUriHasGetOperation",
    "pollingInfo",
    "resourceOperation",
    "statusMonitorResult",
    "statusMonitorStep",
  ]);
  expectDiagnosticEmpty(runner.program.diagnostics);
});

it.each([false, true])("reports explicit original-uri GET availability: %s", async (hasGet) => {
  const [operations, diagnostics, runner] = await getOperations(`
    model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
    model Response {
      @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
    }
    @useFinalStateVia("original-uri")
    @route("/jobs") @post op start(): Response;
    ${hasGet ? '@route("/jobs") @get op read(): Status;' : ""}
  `);
  expectDiagnosticEmpty(diagnostics);
  const operation = operations.find((o) => o.operation.name === "start")!.operation;
  const protocol = getLroProtocolMetadata(runner.program, operation);
  ok(protocol);
  strictEqual(protocol.originalUriHasGetOperation, hasGet);
  strictEqual(protocol.finalStateVia, "original-uri");
  strictEqual(protocol.finalStep?.kind, "noPollingResult");
  if (hasGet) {
    expectDiagnosticEmpty(runner.program.diagnostics);
  } else {
    expectDiagnostics(runner.program.diagnostics, {
      code: "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
    });
  }
});

it("does not infer LRO protocol from an ordinary status-bearing response", async () => {
  const [operations, diagnostics, runner] = await getOperations(`
    @route("/jobs") @post op start(): {
      status: "Succeeded" | "Failed" | "Canceled";
    };
  `);
  expectDiagnosticEmpty(diagnostics);
  strictEqual(getLroProtocolMetadata(runner.program, operations[0].operation), undefined);
  expectDiagnosticEmpty(runner.program.diagnostics);
});
