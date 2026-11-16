import { expectDiagnosticEmpty, expectDiagnostics, t } from "@typespec/compiler/testing";
import { $ } from "@typespec/compiler/typekit";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { it } from "vitest";
import { getLroMetadata, getLroProtocolMetadata } from "../src/index.js";
import { getOperations, TesterWithService } from "./test-host.js";

it("retains required final requests and polling parameter bindings as protocol facts", async () => {
  const [operations, diagnostics, runner] = await getOperations(`
    model Status {
      @lroStatus status: "Succeeded" | "Canceled" | "Failed" | "Running";
      @lroResult result: unknown;
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
  strictEqual(protocol.completion.finalStateVia, "original-uri");
  strictEqual(protocol.completion.originalUriHasGetOperation, undefined);
  strictEqual(protocol.completion.finalStep?.kind, "finalOperationReference");
  strictEqual(protocol.polling.statusMonitorResult, undefined);
  const finalTarget = protocol.completion.finalStep.target;
  strictEqual(
    finalTarget.operation,
    operations.find((o) => o.operation.name === "read")!.operation,
  );
  const finalParameter = finalTarget.parameters?.get("id");
  ok(finalParameter);
  strictEqual(finalParameter.source, operation.parameters.properties.get("id"));
  strictEqual(finalParameter.target, finalTarget.operation.parameters.properties.get("id"));
  strictEqual(finalParameter.sourceKind, "RequestParameter");
  strictEqual(protocol.polling.statusMonitorStep?.kind, "nextOperationReference");
  const pollingParameter = protocol.polling.statusMonitorStep.target.parameters?.get("operationId");
  ok(pollingParameter);
  strictEqual(
    pollingParameter.source,
    protocol.initial.initialResponse.properties.get("operationId"),
  );
  strictEqual(pollingParameter.sourceKind, "ResponseBody");
  strictEqual(protocol.polling.pollingInfo.terminationStatus.kind, "model-property");
  strictEqual(
    protocol.polling.pollingInfo.terminationStatus.property,
    protocol.polling.pollingInfo.responseModel.properties.get("status"),
  );
  deepStrictEqual(protocol.polling.pollingInfo.terminationStatus.succeededState, ["Succeeded"]);
  deepStrictEqual(Object.keys(protocol).sort(), ["completion", "initial", "operation", "polling"]);
  deepStrictEqual(Object.keys(protocol.initial).sort(), [
    "initialResponse",
    "isAction",
    "resourceOperation",
  ]);
  deepStrictEqual(Object.keys(protocol.polling).sort(), [
    "pollingInfo",
    "statusMonitorResult",
    "statusMonitorStep",
  ]);
  deepStrictEqual(Object.keys(protocol.completion).sort(), [
    "finalStateVia",
    "finalStep",
    "originalUriHasGetOperation",
  ]);
  expectDiagnosticEmpty(runner.program.diagnostics);
});

it.each([false, true])(
  "exposes fallback monitor result facts with a success property: %s",
  async (hasResult) => {
    const [operations, diagnostics, runner] = await getOperations(`
    model Status {
      @lroStatus status: "Succeeded" | "Failed" | "Canceled";
      ${hasResult ? "@lroResult result: unknown;" : ""}
    }
    @route("/jobs") @post op start(): {
      @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
    };
  `);
    expectDiagnosticEmpty(diagnostics);
    const protocol = getLroProtocolMetadata(runner.program, operations[0].operation);
    ok(protocol);
    const result = protocol.polling.statusMonitorResult;
    ok(result);
    if (hasResult) {
      const property = protocol.polling.pollingInfo.responseModel.properties.get("result");
      ok(property);
      strictEqual(result.type.kind, "Intrinsic");
      strictEqual(result.type.name, "unknown");
      strictEqual(result.type, property.type);
      strictEqual(result.property, property);
      strictEqual(protocol.completion.finalStep, undefined);
    } else {
      strictEqual(result.type, $(runner.program).intrinsic.void);
      strictEqual(result.property, undefined);
      strictEqual(protocol.completion.finalStep?.kind, "noPollingResult");
    }
    expectDiagnosticEmpty(runner.program.diagnostics);
  },
);

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
  const classification = getLroProtocolMetadata(runner.program, operation, {
    reportDiagnostics: false,
    resolveOriginalUriGetOperation: false,
  });
  ok(classification);
  strictEqual(classification.completion.originalUriHasGetOperation, undefined);
  strictEqual(classification.completion.finalStateVia, "original-uri");
  expectDiagnosticEmpty(runner.program.diagnostics);

  const protocol = getLroProtocolMetadata(runner.program, operation);
  ok(protocol);
  strictEqual(protocol.completion.originalUriHasGetOperation, hasGet);
  strictEqual(protocol.completion.finalStateVia, "original-uri");
  strictEqual(protocol.completion.finalStep?.kind, "noPollingResult");
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

it("does not re-report returned HTTP diagnostics for a quiet metadata lookup", async () => {
  const [{ program, start }, diagnostics] = await TesterWithService.compileAndDiagnose(t.code`
    @route("/jobs") @patch
    op ${t.op("start")}(@header("content-type") contentType: "application/json"): {
      @statusCode code: 200;
      @body value: string;
    };
  `);
  const warning = "@typespec/http/content-type-ignored";
  const count = () =>
    program.diagnostics.filter((diagnostic) => diagnostic.code === warning).length;
  expectDiagnostics(diagnostics, { code: warning });
  const baseline = count();
  strictEqual(getLroMetadata(program, start, { reportDiagnostics: false }), undefined);
  strictEqual(count(), baseline);
  strictEqual(getLroMetadata(program, start), undefined);
  ok(count() > baseline);
});

it("preserves LRO metadata and default reporting when lookup diagnostics are disabled", async () => {
  const { program, start } = await TesterWithService.compile(t.code`
    model Status {
      @lroStatus status: "Succeeded" | "Failed" | "Canceled";
      @lroResult result: string;
    }
    @useFinalStateVia("original-uri")
    @route("/jobs") @patch op ${t.op("start")}(): {
      @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
    };
  `);
  const classificationOptions = {
    reportDiagnostics: false,
    resolveOriginalUriGetOperation: false,
  };
  const classification = getLroProtocolMetadata(program, start, classificationOptions);
  const protocol = getLroProtocolMetadata(program, start, { reportDiagnostics: false });
  const legacy = getLroMetadata(program, start, classificationOptions);
  ok(classification);
  ok(protocol);
  ok(legacy);
  strictEqual(classification.completion.originalUriHasGetOperation, undefined);
  strictEqual(protocol.completion.finalStateVia, legacy.finalStateVia);
  strictEqual(protocol.completion.originalUriHasGetOperation, false);
  strictEqual(legacy.finalResult, "void");
  expectDiagnosticEmpty(program.diagnostics);

  const normal = getLroProtocolMetadata(program, start);
  ok(normal);
  strictEqual(normal.completion.finalStateVia, protocol.completion.finalStateVia);
  strictEqual(normal.completion.originalUriHasGetOperation, false);
  expectDiagnostics(program.diagnostics, {
    code: "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
  });
});
