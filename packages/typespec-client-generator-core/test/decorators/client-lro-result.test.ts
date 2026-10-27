import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const monitorService = `
  @service namespace TestService;
  model Item { name: string; }
  model Payload { value: string; items: Item[]; }
  model Status {
    @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
    @lroResult result: Payload;
    secondary: Payload;
    token: string;
    collection: Item[];
    optionalValue?: string;
    nullableValue: string | null;
    @header requestId: string;
  }
  @post @route("/jobs") op start(): {
    @statusCode statusCode: 202;
    @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
  };
`;

const resourceService = `
  @service namespace TestService;
  @resource("widgets")
  model Widget { @key id: string; value: string; }
  model Status {
    @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
  }
  @get @route("/widgets/{id}") op read(@path id: string): Widget;
  @get @route("/operations/{id}") op poll(@path id: string): Status;
  @pollingOperation(poll)
  @createsOrReplacesResource(Widget)
  @put @route("/widgets/{id}") op start(@path id: string): Widget;
`;

describe("@clientLroResult", () => {
  it("selects the whole monitor body without changing Core's default", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Status, "python");
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    const response = method.lroMetadata.finalResponse;
    ok(response);
    strictEqual(response.result.kind, "model");
    strictEqual(response.result.name, "Status");
    strictEqual(response.result, response.envelopeResult);
    strictEqual(response.resultSegments, undefined);
    strictEqual(method.response.type, response.result);
    strictEqual(method.response.resultSegments, undefined);
    ok(response.result.usage & UsageFlags.Output);
    ok(response.result.usage & UsageFlags.LroPolling);
    ok(response.result.usage & UsageFlags.LroFinalEnvelope);
    const raw = method.lroMetadata.__raw;
    strictEqual(raw.finalResult, raw.pollingInfo.responseModel);
    strictEqual(raw.finalResultPath, undefined);
    strictEqual(raw.finalStep?.kind, "pollingSuccessProperty");
    const core = getLroMetadata(program, raw.operation);
    ok(core?.finalResult && core.finalResult !== "void");
    strictEqual(core.finalResult.name, "Payload");
    strictEqual(core.finalResultPath, "result");
  });

  it("selects a different monitor property with a coherent type and path", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Status.secondary);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    const response = method.lroMetadata.finalResponse;
    ok(response);
    strictEqual(response.result.kind, "model");
    strictEqual(response.result.name, "Payload");
    strictEqual(response.envelopeResult.kind, "model");
    strictEqual(response.envelopeResult.name, "Status");
    deepStrictEqual(
      response.resultSegments?.map((p) => p.name),
      ["secondary"],
    );
    strictEqual(response.resultSegments?.[0].type, response.result);
    strictEqual(method.lroMetadata.__raw.finalResultPath, "secondary");
  });

  it("applies existing string, options-bag, exclusion, and override scopes", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Status, "!csharp");
      @@clientLroResult(start, Status.secondary, #{ scope: "java" });
    `);
    for (const [language, resultName, path] of [
      ["python", "Status", undefined],
      ["java", "Payload", "secondary"],
      ["csharp", "Payload", "result"],
    ]) {
      const context = await createSdkContextForTester(program, {
        emitterName: `@azure-tools/typespec-${language}`,
      });
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.response.type?.kind, "model");
      strictEqual(method.response.type.name, resultName);
      strictEqual(method.lroMetadata.__raw.finalResultPath, path);
    }
  });

  it("rejects an unrelated response model", async () => {
    const diagnostics = await AzureCoreTester.diagnose(`
      ${monitorService}
      model Unrelated { value: string; }
      @@clientLroResult(start, Unrelated);
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /does not select a response body or property of this operation/,
    });
  });

  it("rejects a non-LRO target", async () => {
    const diagnostics = await AzureCoreTester.diagnose(`
      @service namespace TestService;
      model Widget { value: string; }
      @get op read(): Widget;
      @@clientLroResult(read, Widget);
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /requires a discoverable LRO protocol/,
    });
  });

  it("blocks advanced paths unless the emitter explicitly supports them", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Status.result::type.items, "python");
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/unsupported-client-lro-result",
      severity: "error",
      message: /emitter has not enabled advanced LRO result selection/,
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 0);
    const javascript = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-ts",
    });
    expectDiagnosticEmpty(javascript.diagnostics);
    const method = javascript.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    deepStrictEqual(
      method.response.resultSegments?.map((p) => p.name),
      ["result"],
    );
  });

  it.each([
    ["Status.result::type.value", ["result", "value"], "string"],
    ["Status.secondary::type.items", ["secondary", "items"], "array"],
  ] as const)("preserves the complete path for %s", async (reference, path, kind) => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, ${reference});
    `);
    const context = await createSdkContextForTester(
      program,
      {},
      { supportsAdvancedLroResultSelection: true },
    );
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    const response = method.lroMetadata.finalResponse;
    ok(response);
    strictEqual(response.result.kind, kind);
    deepStrictEqual(
      response.resultSegments?.map((p) => p.name),
      path,
    );
    strictEqual(response.resultSegments?.at(-1)?.type, response.result);
    strictEqual(method.response.type, response.result);
    strictEqual(method.response.resultSegments, response.resultSegments);
    deepStrictEqual(
      method.lroMetadata.__raw.finalResultSegments?.map((p) => p.name),
      path,
    );
    strictEqual(method.lroMetadata.__raw.finalResultPath, undefined);
    strictEqual(response.resultSource?.kind, "polling");
  });

  it.each([
    ["Status.token", "string"],
    ["Status.collection", "array"],
  ])("supports a single-property %s result", async (reference, kind) => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, ${reference});
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, kind);
    strictEqual(method.lroMetadata.finalResponse?.resultSegments?.[0].type, method.response.type);
    if (method.response.type.kind === "array") {
      strictEqual(method.response.type.valueType.kind, "model");
      ok(method.response.type.valueType.usage & UsageFlags.Output);
    }
  });

  it("uses wire metadata independently of client property names", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@encodedName(Status.secondary, "application/json", "wire_result");
      @@clientName(Status.secondary, "renamed", "javascript");
      @@clientLroResult(start, Status.secondary, "javascript");
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-ts",
    });
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    const segment = method.lroMetadata.finalResponse?.resultSegments?.[0];
    ok(segment);
    strictEqual(segment.name, "renamed");
    strictEqual(segment.serializationOptions.json?.name, "wire_result");
    strictEqual(segment.__raw?.name, "secondary");
  });

  it("uses the converted property type for both the SDK result and its extraction path", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@alternateType(Status.token, int32, "python");
      @@clientLroResult(start, Status.token, "python");
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "int32");
    strictEqual(method.lroMetadata.finalResponse?.result, method.response.type);
    strictEqual(method.response.resultSegments?.[0].type, method.response.type);
  });

  it("rejects a converted property type outside the SDK LRO result contract", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@alternateType(Status.token, utcDateTime);
      @@clientLroResult(start, Status.token);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /cannot be represented as an SDK LRO result/,
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 0);
  });

  it("selects the proven original-URI resource when PUT models differ", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${resourceService}
      @@clientLroResult(start, Widget);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Widget");
    strictEqual(method.lroMetadata.pollingStep.responseBody?.name, "Status");
    strictEqual(method.lroMetadata.finalResponse?.resultSource?.kind, "original-uri");
    const source = method.lroMetadata.__raw.finalResultSource;
    strictEqual(source?.kind, "original-uri");
    strictEqual(source.operation.name, "read");
    strictEqual(method.lroMetadata.finalResponse.resultSegments, undefined);
  });

  it("gates a monitor selection that must retain a required final GET", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${resourceService}
      @@clientLroResult(start, Status);
    `);
    const unsupported = await createSdkContextForTester(program);
    expectDiagnostics(unsupported.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/unsupported-client-lro-result",
      severity: "error",
    });
    strictEqual(
      unsupported.sdkPackage.clients[0].methods.some((m) => m.name === "start"),
      false,
    );
    const supported = await createSdkContextForTester(
      program,
      {},
      { supportsAdvancedLroResultSelection: true },
    );
    expectDiagnosticEmpty(supported.diagnostics);
    const method = supported.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Status");
    strictEqual(method.lroMetadata.finalResponse?.resultSource?.kind, "polling");
    strictEqual(method.lroMetadata.finalStateVia, "original-uri");
  });

  it("preserves the established source for a shared-model PUT", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Payload { value: string; }
      @resource("jobs") model Job {
        @key id: string;
        @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
      }
      @get @route("/jobs/{id}") op read(@path id: string): Job;
      @get @route("/jobs/{id}/status") op poll(@path id: string): Job;
      @pollingOperation(poll)
      @createsOrReplacesResource(Job)
      @put @route("/jobs/{id}") op start(@path id: string): Job;
      @@clientLroResult(start, Job);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Job");
    strictEqual(method.lroMetadata.finalResponse?.resultSource?.kind, "original-uri");
    strictEqual(method.lroMetadata.__raw.finalStep?.kind, "pollingSuccessProperty");
    strictEqual(method.lroMetadata.__raw.finalResultPath, undefined);
    strictEqual(method.lroMetadata.finalResponse.resultSegments, undefined);
  });

  it("rejects a PUT resource with no proven GET", async () => {
    const diagnostics = await AzureCoreTester.diagnose(`
      @service namespace TestService;
      @resource("widgets") model Widget { @key id: string; }
      model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @get @route("/operations/{id}") op poll(@path id: string): Status;
      @pollingOperation(poll)
      @createsOrReplacesResource(Widget)
      @put @route("/widgets/{id}") op start(@path id: string): Widget;
      @@clientLroResult(start, Widget);
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /does not select a response body or property/,
    });
  });

  it("preserves a required final-operation reference and its bindings", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Widget { value: string; }
      model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @get @route("/widgets/{id}") op read(@path id: string): Widget;
      @get @route("/operations/{operationId}") op poll(@path operationId: string): Status;
      @finalOperation(read, { id: RequestParameter<"id"> })
      @pollingOperation(poll, { operationId: ResponseProperty<"operationId"> })
      @put @route("/widgets/{id}") op start(@path id: string): {
        @statusCode statusCode: 202;
        @header operationId: string;
      };
      @@clientLroResult(start, Status);
    `);
    const context = await createSdkContextForTester(
      program,
      {},
      { supportsAdvancedLroResultSelection: true },
    );
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.finalStep?.kind, "finalOperationReference");
    strictEqual(method.lroMetadata.finalStep.target.operation.path, "/widgets/{id}");
    ok(method.lroMetadata.finalStep.target.parameters?.get("id"));
    strictEqual(method.lroMetadata.finalResponse?.resultSource?.kind, "polling");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Status");
  });

  it("projects a declared final-location response", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Artifact { content: string; }
      model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @post @route("/exports") op start(): {
        @pollingLocation @header("Operation-Location") polling: ResourceLocation<Status>;
        @finalLocation @header("Location") final: ResourceLocation<Artifact>;
      };
      @@clientLroResult(start, Artifact.content);
    `);
    const context = await createSdkContextForTester(
      program,
      {},
      { supportsAdvancedLroResultSelection: true },
    );
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.finalStep?.kind, "finalOperationLink");
    strictEqual(method.lroMetadata.finalResponse?.resultSource?.kind, "final-operation");
    strictEqual(method.response.type?.kind, "string");
    deepStrictEqual(
      method.response.resultSegments?.map((p) => p.name),
      ["content"],
    );
  });

  it.each([
    ["unrelated prefix", "model Other { result: Payload; }", "Other.result::type.value"],
    ["nested model instead of its property", "", "Payload"],
    ["ambiguous leaf alias", "alias Selected = Status.result::type.value;", "Selected"],
    ["ambiguous partial property", "", "Payload.value"],
    ["optional property", "", "Status.optionalValue"],
    ["nullable property", "", "Status.nullableValue"],
    ["HTTP header property", "", "Status.requestId"],
  ])("rejects %s", async (_, declarations, reference) => {
    const diagnostics = await AzureCoreTester.diagnose(`
      ${monitorService}
      ${declarations}
      @@clientLroResult(start, ${reference});
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
    });
  });

  it("recovers an unambiguous property alias", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      alias Selected = Status.secondary;
      @@clientLroResult(start, Selected);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    deepStrictEqual(
      method.response.resultSegments?.map((p) => p.name),
      ["secondary"],
    );
  });

  it("supports an inherited property on a generic-instance alias", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Payload { value: string; }
      model Base<T> {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: T;
      }
      model Status<T> extends Base<T> {}
      alias Monitor = Status<Payload>;
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Monitor>;
      };
      @@clientLroResult(start, Monitor.result::type.value);
    `);
    const context = await createSdkContextForTester(
      program,
      {},
      { supportsAdvancedLroResultSelection: true },
    );
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "string");
    deepStrictEqual(
      method.response.resultSegments?.map((p) => p.name),
      ["result", "value"],
    );
  });

  it("applies a selector inherited from an instantiated operation template", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
      }
      @clientLroResult(T)
      @post op Start<T extends {}>(): {
        @pollingLocation @header location: ResourceLocation<T>;
      };
      op start is Start<Status>;
    `);
    const context = await createSdkContextForTester(
      program,
      {},
      { supportsAdvancedLroResultSelection: true },
    );
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Status");
  });

  it("maps renamed property references into each version without sharing cached selections", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1, v2 }
      model Payload { value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
        @renamedFrom(Versions.v2, "previous")
        selected: Payload;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status.selected);
    `);
    for (const [version, name] of [
      ["v1", "previous"],
      ["v2", "selected"],
    ]) {
      const context = await createSdkContextForTester(program, { "api-version": version });
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "lro");
      deepStrictEqual(
        method.response.resultSegments?.map((p) => p.name),
        [name],
      );
      strictEqual(method.lroMetadata.__raw.finalResultPath, name);
      strictEqual(method.response.type?.kind, "model");
      strictEqual(method.response.type.name, "Payload");
    }
  });

  it("errors when the selected property is absent in the requested version", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1, v2 }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @added(Versions.v2) selected: string;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status.selected);
    `);
    const context = await createSdkContextForTester(program, { "api-version": "v1" });
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 0);
  });

  it("preserves the existing optional polling success-property contract", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Payload { value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result?: Payload;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status.result);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Payload");
    deepStrictEqual(
      method.response.resultSegments?.map((p) => p.name),
      ["result"],
    );
  });

  it("rejects recursive ambiguity rather than choosing an arbitrary leaf-alias route", async () => {
    const diagnostics = await AzureCoreTester.diagnose(`
      @service namespace TestService;
      model Payload { value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
        next: Status;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      alias Selected = Status.result::type.value;
      @@clientLroResult(start, Selected);
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /ambiguous/,
    });
  });

  it("rejects an original-URI GET that requires an additional request parameter", async () => {
    const diagnostics = await AzureCoreTester.diagnose(`
      @service namespace TestService;
      @resource("widgets") model Widget { @key id: string; }
      model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @get @route("/widgets/{id}")
      op read(@path id: string, @header requiredToken: string): Widget;
      @get @route("/operations/{id}") op poll(@path id: string): Status;
      @pollingOperation(poll)
      @createsOrReplacesResource(Widget)
      @put @route("/widgets/{id}") op start(@path id: string): Widget;
      @@clientLroResult(start, Widget);
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
    });
  });
});
