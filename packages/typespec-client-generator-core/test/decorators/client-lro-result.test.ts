import { expectDiagnosticEmpty, expectDiagnostics } from "@typespec/compiler/testing";
import { deepStrictEqual, notStrictEqual, ok, strictEqual } from "assert";
import { describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { ArmTester, AzureCoreTester, createSdkContextForTester } from "../tester.js";

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
  alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
  @resource("widgets")
  model Widget { @key id: string; value: string; }
  model Status {
    @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
  }
  @get @route("/widgets/{id}") op read(@path id: string): Widget;
  @get @route("/operations/{id}") op poll(@path id: string): Status;
  @pollingOperation(poll)
  op start is Operations.LongRunningResourceCreateOrReplace<Widget>;
`;

describe("@clientLroResult", () => {
  it("selects the completion envelope", async () => {
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
  });

  it("selects the protocol result property with a coherent type and path", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Status.result);
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
      ["result"],
    );
    strictEqual(response.resultSegments?.[0].type, response.result);
    strictEqual(method.lroMetadata.__raw.finalResultPath, "result");
  });

  it.each([
    {
      name: "Azure.Core resource PUT",
      tester: AzureCoreTester,
      finalStateVia: "original-uri",
      finalStep: "pollingSuccessProperty",
      code: `
        @service namespace TestService;
        alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
        @resource("widgets") model Widget { @key name: string; value: string; }
        alias StandardStatus = ResourceOperationStatus<Widget>;
        model WidgetStatus is StandardStatus;

        @get @route("/widgets/{name}/status")
        op poll(@path name: string): WidgetStatus;
        @pollingOperation(poll)
        op start is Operations.LongRunningResourceCreateOrReplace<Widget>;
      `,
    },
    {
      name: "ARM resource PUT with combined LRO headers",
      tester: ArmTester,
      finalStateVia: "location",
      finalStep: "finalOperationLink",
      code: `
        @armProviderNamespace
        @service
        @versioned(Versions)
        @armCommonTypesVersion(CommonTypes.Versions.v5)
        namespace TestService;
        enum Versions { v1: "2024-01-01" }

        model Widget is TrackedResource<WidgetProperties> {
          ...ResourceNameParameter<Widget>;
        }
        model WidgetProperties {
          provisioningState?: ResourceProvisioningState;
        }
        alias StandardStatus = ResourceOperationStatus<Widget>;
        model WidgetStatus is StandardStatus;

        op start is ArmResourceCreateOrReplaceAsync<
          Widget,
          LroHeaders = ArmCombinedLroHeaders<WidgetStatus, Widget>
        >;
      `,
    },
  ])(
    "selects a result property through a cloned polling model for $name",
    async ({ tester, code, finalStateVia, finalStep }) => {
      const { program } = await tester.compile(`
        ${code}
        @@clientLroResult(start, StandardStatus.result, "python");
      `);
      const [selection, diagnostics] = program.resolveTypeReference(
        "TestService.StandardStatus.result",
      );
      expectDiagnosticEmpty(diagnostics);
      ok(selection?.kind === "ModelProperty");

      for (const language of ["python", "java"]) {
        const context = await createSdkContextForTester(program, {
          emitterName: `@azure-tools/typespec-${language}`,
        });
        expectDiagnosticEmpty(context.diagnostics);
        const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
        ok(method);
        strictEqual(method.kind, "lro");
        const response = method.lroMetadata.finalResponse;
        ok(response);
        strictEqual(response.result.kind, "model");
        strictEqual(response.result.name, "Widget");
        strictEqual(response.envelopeResult.kind, "model");
        strictEqual(
          response.envelopeResult.name,
          language === "python" ? "WidgetStatus" : "Widget",
        );
        strictEqual(method.response.type, response.result);
        deepStrictEqual(
          response.resultSegments?.map((property) => property.name),
          language === "python" ? ["result"] : undefined,
        );
        strictEqual(
          response.resultSegments?.[0].type,
          language === "python" ? response.result : undefined,
        );
        deepStrictEqual(method.response.resultSegments, response.resultSegments);
        const raw = method.lroMetadata.__raw;
        strictEqual(raw.finalResultPath, language === "python" ? "result" : undefined);
        strictEqual(method.lroMetadata.finalStateVia, finalStateVia);
        strictEqual(raw.finalStep?.kind, finalStep);
        const resultProperty = raw.pollingInfo.resultProperty;
        ok(resultProperty);
        notStrictEqual(resultProperty.model, selection.model);
      }
    },
  );

  it("applies existing string, options-bag, exclusion, and override scopes", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Status, "!csharp");
      @@clientLroResult(start, Status.result, #{ scope: "java" });
    `);
    for (const [language, resultName, path] of [
      ["python", "Status", undefined],
      ["java", "Payload", "result"],
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

  it("rejects selecting the established result model without its protocol property", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      @@clientLroResult(start, Payload);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /not a response body available from the LRO protocol/,
    });
  });

  it.each([
    ["basic", ""],
    ["lro", "@Azure.ClientGenerator.Core.Legacy.markAsLro"],
  ])("ignores an invalid selection and preserves the %s method", async (kind, decorator) => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Widget { value: string; }
      ${decorator}
      @get op read(): Widget;
      @@clientLroResult(read, Widget, "python");
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
      message: /requires a discoverable LRO protocol/,
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 1);
    strictEqual(context.sdkPackage.clients[0].methods[0].kind, kind);

    const javascript = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-ts",
    });
    expectDiagnosticEmpty(javascript.diagnostics);
    strictEqual(javascript.sdkPackage.clients[0].methods.length, 1);
    strictEqual(javascript.sdkPackage.clients[0].methods[0].kind, kind);
  });

  it("selects the established original-URI PUT response", async () => {
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
    strictEqual(method.lroMetadata.finalStateVia, "original-uri");
    deepStrictEqual(
      method.lroMetadata.finalResponse?.resultSegments?.map((property) => property.name),
      undefined,
    );
  });

  it("reports a missing original-URI GET once when a client result is selected", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Payload { value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
      }
      @useFinalStateVia("original-uri")
      @post @route("/jobs") op start(): {
        @pollingLocation @header("Operation-Location") location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status.result);
    `);

    await createSdkContextForTester(program);
    strictEqual(
      program.diagnostics.filter(
        (diagnostic) =>
          diagnostic.code === "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
      ).length,
      1,
    );
  });

  it("rejects selecting a separate status-monitor body for a resource PUT", async () => {
    const { program } = await AzureCoreTester.compile(`
      ${resourceService}
      @@clientLroResult(start, Status);
    `);
    const unsupported = await createSdkContextForTester(program);
    expectDiagnostics(unsupported.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
    });
    const method = unsupported.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.finalStateVia, "original-uri");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Widget");
    const pollingModel = unsupported.sdkPackage.models.find((m) => m.name === "Status");
    ok(pollingModel);
    ok(pollingModel.usage & UsageFlags.LroPolling);
  });

  it("selects the shared-model PUT completion response", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
      model Payload { value: string; }
      @resource("jobs") model Job {
        @key id: string;
        @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
      }
      @get @route("/jobs/{id}") op read(@path id: string): Job;
      @get @route("/jobs/{id}/status") op poll(@path id: string): Job;
      @pollingOperation(poll)
      op start is Operations.LongRunningResourceCreateOrReplace<Job>;
      @@clientLroResult(start, Job);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Job");
    strictEqual(method.lroMetadata.finalStateVia, "original-uri");
    strictEqual(method.lroMetadata.__raw.finalStep?.kind, "pollingSuccessProperty");
    strictEqual(method.lroMetadata.__raw.finalResultPath, undefined);
    strictEqual(method.lroMetadata.finalResponse?.resultSegments, undefined);
  });

  it("allows a resource PUT to preserve an existing result-property contract", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
      model Payload { value: string; }
      @resource("jobs") model Job {
        @key id: string;
        @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
      }
      @get @route("/jobs/{id}") op read(@path id: string): Job;
      @get @route("/jobs/{id}/status") op poll(@path id: string): Job;
      @pollingOperation(poll)
      op start is Operations.LongRunningResourceCreateOrReplace<Job>;
      @@clientLroResult(start, Job.result);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Payload");
    const response = method.lroMetadata.finalResponse;
    ok(response);
    strictEqual(response.result.kind, "model");
    strictEqual(response.result.name, "Payload");
    strictEqual(response.envelopeResult.kind, "model");
    strictEqual(response.envelopeResult.name, "Job");
    deepStrictEqual(
      response.resultSegments?.map((property) => property.name),
      ["result"],
    );
    strictEqual(method.lroMetadata.__raw.finalResultPath, "result");
  });

  it("selects an inherited protocol result property for a resource PUT", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
      model Payload { value: string; }
      model ResultProperties { @lroResult result: Payload; }
      @resource("jobs") model Job extends ResultProperties {
        @key id: string;
        @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
      }
      @get @route("/jobs/{id}") op read(@path id: string): Job;
      @get @route("/jobs/{id}/status") op poll(@path id: string): Job;
      @pollingOperation(poll)
      op start is Operations.LongRunningResourceCreateOrReplace<Job>;
      @@clientLroResult(start, Job.result);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Payload");
    strictEqual(method.lroMetadata.__raw.finalResultPath, "result");
    deepStrictEqual(
      method.response.resultSegments?.map((property) => property.name),
      ["result"],
    );
  });

  it("selects a status-monitor result property for a custom PUT", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Widget { value: string; }
      model Payload { value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
      }
      @put op start(): {
        @statusCode statusCode: 201;
        @pollingLocation @header location: ResourceLocation<Status>;
        ...Widget;
      };
      @@clientLroResult(start, Status.result);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Payload");
    strictEqual(method.lroMetadata.__raw.finalResultPath, "result");
    deepStrictEqual(
      method.response.resultSegments?.map((property) => property.name),
      ["result"],
    );
  });

  it.each(["Widget", "Widget.value"])(
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
      if (selected !== "Widget") {
        expectDiagnostics(context.diagnostics, {
          code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
          severity: "error",
        });
        const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
        ok(method);
        strictEqual(method.kind, "lro");
        strictEqual(method.lroMetadata.finalStep?.kind, "finalOperationReference");
        strictEqual(method.response.type?.kind, "model");
        strictEqual(method.response.type.name, "Widget");
        const pollingModel = context.sdkPackage.models.find((m) => m.name === "Status");
        ok(pollingModel);
        ok(pollingModel.usage & UsageFlags.LroPolling);
        return;
      }
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "start");
      ok(method);
      strictEqual(method.kind, "lro");
      strictEqual(method.lroMetadata.finalStep?.kind, "finalOperationReference");
      strictEqual(method.lroMetadata.finalStep.target.operation.path, "/widgets/{id}");
      ok(method.lroMetadata.finalStep.target.parameters?.get("id"));
      strictEqual(method.response.type?.kind, "model");
      strictEqual(method.response.type.name, "Widget");
      strictEqual(method.response.resultSegments, undefined);
    },
  );

  it("preserves a required final-operation response model outside the client scope", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Artifact { value: string; }
      model Payload { value: string; }
      model Status {
        @lroStatus status: "Running" | "Succeeded" | "Failed" | "Canceled";
        @lroResult result: Payload;
      }
      @scope("java")
      @get @route("/artifacts/{id}") op read(@path id: string): Artifact;
      @get @route("/operations/{operationId}") op poll(@path operationId: string): Status;
      @finalOperation(read, { id: RequestParameter<"id"> })
      @pollingOperation(poll, { operationId: ResponseProperty<"operationId"> })
      @post @route("/artifacts/{id}:start") op start(@path id: string): {
        @statusCode statusCode: 202;
        @header operationId: string;
      };
      @@clientLroResult(start, Status.result);
    `);
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    expectDiagnosticEmpty(context.diagnostics);
    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(
      methods.some((method) => method.name === "read"),
      false,
    );
    const method = methods.find((method) => method.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Payload");
    const finalStep = method.lroMetadata.finalStep;
    strictEqual(finalStep?.kind, "finalOperationReference");
    const finalBody = finalStep.target.operation.responses[0].type;
    ok(finalBody?.kind === "model");
    strictEqual(finalBody.name, "Artifact");
    ok(context.sdkPackage.models.includes(finalBody));
    ok(finalBody.usage & UsageFlags.LroFinalEnvelope);
  });

  it("selects a declared final-location response", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Details { value: string; }
      model Artifact { content: string; details: Details; }
      model Status { @lroStatus status: "Succeeded" | "Failed" | "Canceled"; }
      @post @route("/exports") op start(): {
        @pollingLocation @header("Operation-Location") polling: ResourceLocation<Status>;
        @finalLocation @header("Location") final: ResourceLocation<Artifact>;
      };
      @@clientLroResult(start, Artifact);
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.finalStep?.kind, "finalOperationLink");
    const response = method.lroMetadata.finalResponse;
    ok(response);
    strictEqual(response.envelopeResult.kind, "model");
    strictEqual(response.envelopeResult.name, "Artifact");
    strictEqual(method.response.type, response.envelopeResult);
    strictEqual(method.response.resultSegments, undefined);
  });

  it.each([
    ["Status", "Status", undefined],
    ["Status.result", "Payload", "result"],
  ])(
    "selects %s from the status monitor even when a final location is declared",
    async (selected, resultName, path) => {
      const { program } = await AzureCoreTester.compile(`
        @service namespace TestService;
        model Payload { value: string; }
        model Artifact { content: string; }
        model Status {
          @lroStatus status: "Succeeded" | "Failed" | "Canceled";
          @lroResult result: Payload;
        }
        @post @route("/exports") op start(): {
          @pollingLocation @header("Operation-Location") polling: ResourceLocation<Status>;
          @finalLocation @header("Location") final: ResourceLocation<Artifact>;
        };
        @@clientLroResult(start, ${selected});
      `);
      const context = await createSdkContextForTester(program);
      expectDiagnosticEmpty(context.diagnostics);
      const method = context.sdkPackage.clients[0].methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.response.type?.kind, "model");
      strictEqual(method.response.type.name, resultName);
      deepStrictEqual(
        method.response.resultSegments?.map((property) => property.name),
        path ? [path] : undefined,
      );
    },
  );

  it.each([
    ["nested result property", "", "Status.result::type.value"],
    ["non-result response property", "", "Status.secondary"],
    ["unrelated property", "model Other { result: Payload; }", "Other.result"],
  ])("rejects %s", async (_, declarations, reference) => {
    const { program } = await AzureCoreTester.compile(`
      ${monitorService}
      ${declarations}
      @@clientLroResult(start, ${reference});
    `);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
    });
  });

  it("selects a scalar protocol result property", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service namespace TestService;
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @lroResult result: string;
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
    strictEqual(method.response.type?.kind, "string");
    deepStrictEqual(
      method.response.resultSegments?.map((p) => p.name),
      ["result"],
    );
  });

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

  it("maps the selected property into each version", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service @versioned(Versions) namespace TestService;
      enum Versions { v1, v2 }
      model Payload { @renamedFrom(Versions.v2, "oldValue") value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @renamedFrom(Versions.v2, "previous")
        @lroResult result: Payload;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status.result);
    `);
    for (const [version, name] of [
      ["v1", "previous"],
      ["v2", "result"],
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
      model Payload { @added(Versions.v2) value: string; }
      model Status {
        @lroStatus status: "Succeeded" | "Failed" | "Canceled";
        @added(Versions.v2) selected: string;
        @added(Versions.v2) @lroResult result: Payload;
      }
      @post op start(): {
        @pollingLocation @header location: ResourceLocation<Status>;
      };
      @@clientLroResult(start, Status.result);
    `);
    const context = await createSdkContextForTester(program, { "api-version": "v1" });
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/invalid-client-lro-result",
      severity: "error",
    });
    strictEqual(context.sdkPackage.clients[0].methods.length, 1);
    strictEqual(context.sdkPackage.clients[0].methods[0].kind, "lro");
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

  it("selects the status monitor for an action with no result property", async () => {
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
    expectDiagnosticEmpty(context.diagnostics);
    const method = context.sdkPackage.clients[0].methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.response.type?.kind, "model");
    strictEqual(method.response.type.name, "Status");
    strictEqual(method.response.resultSegments, undefined);
  });
});
