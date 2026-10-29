import { getLroMetadata } from "@azure-tools/typespec-azure-core";
import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const monitorService = `
  @service namespace TestService;
  model Item { name: string; }
  model Details { value: string; }
  model Payload { value: string; items: Item[]; details: Details; }
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

  it.each([
    ["basic", ""],
    ["lro", "@Azure.ClientGenerator.Core.Legacy.markAsLro"],
  ])("does not fall back to a %s method after an invalid selection", async (kind, decorator) => {
    const [{ program }, diagnostics] = await AzureCoreTester.compileAndDiagnose(`
      @service namespace TestService;
      model Widget { value: string; }
      ${decorator}
      @get op read(): Widget;
      @@clientLroResult(read, Widget, "python");
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /requires a discoverable LRO protocol/,
    });
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /requires a discoverable LRO protocol/,
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 0);

    const javascript = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-ts",
    });
    expectDiagnosticEmpty(javascript.diagnostics);
    strictEqual(javascript.sdkPackage.clients[0].methods.length, 1);
    strictEqual(javascript.sdkPackage.clients[0].methods[0].kind, kind);
  });

  it("applies a nested selection only in the selected language scope", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Status.result::type.items, "python");
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const selected = context.sdkPackage.clients[0].methods[0];
    strictEqual(selected.kind, "lro");
    strictEqual(selected.response.type?.kind, "array");
    deepStrictEqual(
      selected.response.resultSegments?.map((property) => property.name),
      ["result", "items"],
    );
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
    ["Status.result::type.details::type.value", ["result", "details", "value"], "string"],
  ] as const)("preserves the complete path and leaf type for %s", async (reference, path, kind) => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, ${reference});
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    const response = method.lroMetadata.finalResponse;
    ok(response);
    strictEqual(response.envelopeResult.kind, "model");
    strictEqual(response.envelopeResult.name, "Status");
    strictEqual(response.result.kind, kind);
    deepStrictEqual(
      response.resultSegments?.map((property) => property.name),
      path,
    );
    strictEqual(response.resultSegments?.at(-1)?.type, response.result);
    strictEqual(method.response.type, response.result);
    strictEqual(method.response.resultSegments, response.resultSegments);
    strictEqual(method.lroMetadata.__raw.finalResultPath, undefined);
    strictEqual(method.lroMetadata.__raw.logicalPath, undefined);
    strictEqual(method.lroMetadata.finalResultPath, undefined);
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

  it("uses wire metadata independently of client property names throughout the path", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@encodedName(Status.secondary, "application/json", "wire_result");
      @@clientName(Status.secondary, "renamed", "javascript");
      @@encodedName(Payload.value, "application/json", "wire_value");
      @@clientName(Payload.value, "renamedValue", "javascript");
      @@clientLroResult(start, Status.secondary::type.value, "javascript");
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-ts",
    });
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    const segments = method.lroMetadata.finalResponse?.resultSegments;
    ok(segments);
    deepStrictEqual(
      segments.map((segment) => segment.name),
      ["renamed", "renamedValue"],
    );
    deepStrictEqual(
      segments.map((segment) => segment.serializationOptions.json?.name),
      ["wire_result", "wire_value"],
    );
    deepStrictEqual(
      segments.map((segment) => segment.__raw?.name),
      ["secondary", "value"],
    );
  });

  it.each([
    ["Status.token", "Status.token"],
    ["Status.result::type.value", "Payload.value"],
  ])(
    "uses the converted property type for %s and its extraction path",
    async (reference, property) => {
      const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@alternateType(${property}, int32, "python");
      @@clientLroResult(start, ${reference}, "python");
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.response.type?.kind, "int32");
      strictEqual(method.lroMetadata.finalResponse?.result, method.response.type);
      strictEqual(method.response.resultSegments?.at(-1)?.type, method.response.type);
    },
  );

  it.each([
    ["Status.secondary", "Status.secondary"],
    ["Status.result::type.value", "Payload.value"],
  ])(
    "marks the property-level alternate model for %s as an output",
    async (reference, property) => {
      const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      model Replacement { count: int32; }
      @@alternateType(${property}, Replacement);
      @@clientLroResult(start, ${reference});
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.response.type?.kind, "model");
      strictEqual(method.response.type.name, "Replacement");
      ok(method.response.type.usage & UsageFlags.Output);
      strictEqual(method.response.resultSegments?.at(-1)?.type, method.response.type);
    },
  );

  it("does not reroute a nested selection through an unrelated alternate-model property", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      model Replacement {
        @encodedName("application/json", "different") value: string;
      }
      @@alternateType(Status.result, Replacement);
      @@clientLroResult(start, Status.result::type.value);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /not available in the SDK response body/,
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 0);
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

  it.each(["Widget", "Widget.value"])(
    "selects %s from the established original-URI PUT response",
    async (selected) => {
      const { program } = await AzureCoreTester.compile(`
      ${resourceService}
      @@clientLroResult(start, ${selected});
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
      ok(method);
      strictEqual(method.kind, "lro");
      if (selected === "Widget") {
        strictEqual(method.response.type?.kind, "model");
        strictEqual(method.response.type.name, "Widget");
      } else {
        strictEqual(method.response.type?.kind, "string");
      }
      strictEqual(method.lroMetadata.pollingStep.responseBody?.name, "Status");
      strictEqual(method.lroMetadata.finalStateVia, "original-uri");
      deepStrictEqual(
        method.lroMetadata.finalResponse?.resultSegments?.map((property) => property.name),
        selected === "Widget" ? undefined : ["value"],
      );
    },
  );

  it("rejects a monitor selection that would bypass the required final GET", async () => {
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
  });

  it.each(["Job", "Job.result", "Job.result::type.value"])(
    "preserves shared-model PUT completion for %s",
    async (selected) => {
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
      @@clientLroResult(start, ${selected});
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
      ok(method);
      strictEqual(method.kind, "lro");
      const path =
        selected === "Job" ? [] : selected === "Job.result" ? ["result"] : ["result", "value"];
      if (path.length < 2) {
        strictEqual(method.response.type?.kind, "model");
        strictEqual(method.response.type.name, selected === "Job" ? "Job" : "Payload");
      } else {
        strictEqual(method.response.type?.kind, "string");
      }
      strictEqual(method.lroMetadata.finalStateVia, "original-uri");
      strictEqual(method.lroMetadata.__raw.finalStep?.kind, "pollingSuccessProperty");
      strictEqual(
        method.lroMetadata.__raw.finalResultPath,
        path.length === 1 ? "result" : undefined,
      );
      deepStrictEqual(
        method.lroMetadata.finalResponse?.resultSegments?.map((property) => property.name),
        path.length === 0 ? undefined : path,
      );
    },
  );

  it.each(["Widget", "Widget.value", "Status"])(
    "validates %s against the required final-operation reference",
    async (selected) => {
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
      @@clientLroResult(start, ${selected});
    `);
      const context = await createSdkContextForTester(program);
      if (selected === "Status") {
        expectDiagnostics(context.diagnostics, {
          code: "@azure-tools/typespec-client-generator-core/unsupported-client-lro-result",
          severity: "error",
        });
        strictEqual(
          context.sdkPackage.clients[0].methods.some((method) => method.name === "start"),
          false,
        );
        return;
      }
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
      ok(method);
      strictEqual(method.kind, "lro");
      strictEqual(method.lroMetadata.finalStep?.kind, "finalOperationReference");
      strictEqual(method.lroMetadata.finalStep.target.operation.path, "/widgets/{id}");
      ok(method.lroMetadata.finalStep.target.parameters?.get("id"));
      if (selected === "Widget") {
        strictEqual(method.response.type?.kind, "model");
        strictEqual(method.response.type.name, "Widget");
      } else {
        strictEqual(method.response.type?.kind, "string");
      }
      deepStrictEqual(
        method.response.resultSegments?.map((property) => property.name),
        selected === "Widget" ? undefined : ["value"],
      );
    },
  );

  it.each(["Artifact", "Artifact.content", "Artifact.details::type.value", "Status"])(
    "validates %s against a declared final-location response",
    async (selected) => {
      const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Details { value: string; }
      model Artifact { content: string; details: Details; }
      model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @post @route("/exports") op start(): {
        @pollingLocation @header("Operation-Location") polling: ResourceLocation<Status>;
        @finalLocation @header("Location") final: ResourceLocation<Artifact>;
      };
      @@clientLroResult(start, ${selected});
    `);
      const context = await createSdkContextForTester(program);
      if (selected === "Status") {
        expectDiagnostics(context.diagnostics, {
          code: "@azure-tools/typespec-client-generator-core/unsupported-client-lro-result",
          severity: "error",
        });
        strictEqual(context.sdkPackage.clients[0].methods.length, 0);
        return;
      }
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.lroMetadata.finalStep?.kind, "finalOperationLink");
      const response = method.lroMetadata.finalResponse;
      ok(response);
      strictEqual(response.envelopeResult.kind, "model");
      strictEqual(response.envelopeResult.name, "Artifact");
      if (selected === "Artifact") {
        strictEqual(method.response.type, response.envelopeResult);
      } else {
        strictEqual(method.response.type?.kind, "string");
        strictEqual(response.resultSegments?.at(-1)?.type, method.response.type);
      }
      deepStrictEqual(
        method.response.resultSegments?.map((property) => property.name),
        selected === "Artifact"
          ? undefined
          : selected === "Artifact.content"
            ? ["content"]
            : ["details", "value"],
      );
    },
  );

  it.each([
    ["nested model instead of its property", "", "Payload"],
    ["nested leaf alias", "alias Selected = Status.result::type.value;", "Selected"],
    ["nested property without its response root", "", "Payload.value"],
    ["unrelated property", "model Other { result: Payload; }", "Other.result"],
    ["unrelated nested path", "model Other { result: Payload; }", "Other.result::type.value"],
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

  it("accepts an alias to a direct response property", async () => {
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

  it.each(["Monitor.result", "Monitor.result::type.value"])(
    "supports %s on an inherited generic-instance alias",
    async (selected) => {
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
      @@clientLroResult(start, ${selected});
    `);
      const context = await createSdkContextForTester(program);
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "lro");
      if (selected === "Monitor.result") {
        strictEqual(method.response.type?.kind, "model");
        strictEqual(method.response.type.name, "Payload");
      } else {
        strictEqual(method.response.type?.kind, "string");
      }
      deepStrictEqual(
        method.response.resultSegments?.map((p) => p.name),
        selected === "Monitor.result" ? ["result"] : ["result", "value"],
      );
    },
  );

  it("applies a selector inherited from an instantiated operation template", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: string;
      }
      @clientLroResult(T)
      @post op Start<T extends {}>(): {
        @pollingLocation @header location: ResourceLocation<T>;
      };
      op start is Start<Status>;
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Status");
  });

  it("rejects a property from a different instance of the same generic monitor", async () => {
    const diagnostics = await AzureCoreTester.diagnose(`
      @service namespace TestService;
      model Payload { value: string; }
      model Status<T> {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: T;
      }
      alias Monitor = Status<Payload>;
      alias Other = Status<string>;
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Monitor>;
      };
      @@clientLroResult(start, Other.result);
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
    });
  });

  it.each(["Status.selected", "Status.selected::type.value"])(
    "maps %s into each version without sharing cached paths",
    async (selected) => {
      const { program } = await AzureCoreTester.compile(`
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1, v2 }
      model Payload { @renamedFrom(Versions.v2, "oldValue") value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
        @renamedFrom(Versions.v2, "previous")
        selected: Payload;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, ${selected});
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
          selected === "Status.selected" ? [name] : [name, version === "v1" ? "oldValue" : "value"],
        );
        strictEqual(
          method.lroMetadata.__raw.finalResultPath,
          selected === "Status.selected" ? name : undefined,
        );
        if (selected === "Status.selected") {
          strictEqual(method.response.type?.kind, "model");
          strictEqual(method.response.type.name, "Payload");
        } else {
          strictEqual(method.response.type?.kind, "string");
        }
      }
    },
  );

  it.each(["Status.selected", "Status.result::type.value"])(
    "errors when %s is absent in the requested version",
    async (selected) => {
      const { program } = await AzureCoreTester.compile(`
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1, v2 }
      model Payload { @added(Versions.v2) value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
        @added(Versions.v2) selected: string;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, ${selected});
    `);
      const context = await createSdkContextForTester(program, { "api-version": "v1" });
      expectDiagnostics(context.diagnostics, {
        code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
        severity: "error",
      });
      strictEqual(context.sdkPackage.clients[0].methods.length, 0);
    },
  );

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

  it("rejects nested traversal through an optional polling result", async () => {
    const diagnostics = await AzureCoreTester.diagnose(`
      @service namespace TestService;
      model Payload { value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result?: Payload;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status.result::type.value);
    `);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /Optional result properties require a missing-value contract/,
    });
  });

  it("rejects promoting a no-result polling protocol to a client result", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/unsupported-client-lro-result",
      severity: "error",
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 0);
  });
});
