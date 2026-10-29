import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { getLroOperationIdLink, getStatusMonitorLink } from "../../src/lro-operation-id.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const Tester = AzureCoreTester.wrap(
  (code) => `
@service
namespace TestService;

@lroStatus
union LroStatus {
  @lroSucceeded succeeded: "succeeded",
  @lroFailed failed: "failed",
  @lroCanceled canceled: "canceled",
}

${code}
`,
);

const operation = `
model JobState {
  status: LroStatus;
}

@route("/jobs/{jobId}")
@get
op getJobStatus(
  @lroOperationId
  @path jobId: string
): JobState;

@route("/jobs")
@pollingOperation(getJobStatus)
op start is Azure.Core.Foundations.LongRunningOperation<
  {},
  AcceptedResponse,
  {},
  {}
>;
`;

const propertyOperation = `
model PropertyJobState {
  @lroOperationId
  operationId: string;
  status: LroStatus;
}

@route("/property-jobs/status")
@get
op getPropertyJobStatus(): PropertyJobState;

@route("/property-jobs")
@pollingOperation(getPropertyJobStatus)
op startPropertyJob is Azure.Core.Foundations.LongRunningOperation<
  {},
  AcceptedResponse,
  {},
  {}
>;
`;

describe("LRO operation ID", () => {
  it("accepts a next-operation reference with a status-monitor link", () => {
    const link = {
      kind: "link",
      location: "ResponseHeader",
      property: {} as any,
    } as const;
    const step = {
      kind: "nextOperationReference",
      responseModel: {} as any,
      target: {
        kind: "reference",
        operation: {} as any,
        link,
      },
    } as const;
    strictEqual(getStatusMonitorLink(step), link);
  });

  it("requires the operation ID target to belong to a linked status monitor", async () => {
    const diagnostics = await Tester.diagnose(`
model Invalid {
  @lroOperationId
  value: string;
}
`);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/lro-operation-id-invalid-target",
    });
  });

  it("exposes the exact linked operation ID path parameter", async () => {
    const { program } = await Tester.compile(operation);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.statusMonitorStep?.kind, "nextOperationLink");
    if (method.lroMetadata.statusMonitorStep?.kind === "nextOperationLink") {
      strictEqual(
        method.lroMetadata.operationId?.[0].kind === "path"
          ? method.lroMetadata.operationId[0].source
          : undefined,
        method.lroMetadata.statusMonitorStep.target,
      );
      strictEqual(
        method.lroMetadata.operationId?.[0].kind === "path"
          ? method.lroMetadata.operationId[0].pathParameter
          : undefined,
        method.lroMetadata.statusMonitorStep.operation?.parameters.find(
          (x) => x.kind === "path" && x.name === "jobId",
        ),
      );
    }
    strictEqual(method.lroMetadata.operationId?.[0].kind, "path");
    if (method.lroMetadata.operationId?.[0].kind === "path") {
      strictEqual(method.lroMetadata.operationId[0].pathParameter.name, "jobId");
      strictEqual(method.lroMetadata.operationId[0].pathParameter.__raw?.name, "jobId");
    }
  });

  it("honors emitter scope", async () => {
    const { program } = await Tester.compile(
      operation.replace("@lroOperationId\n", '@lroOperationId("python")\n'),
    );
    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const pythonMethod = pythonContext.sdkPackage.clients[0].methods.find(
      (x) => x.name === "start",
    );
    const csharpMethod = csharpContext.sdkPackage.clients[0].methods.find(
      (x) => x.name === "start",
    );
    ok(pythonMethod);
    ok(csharpMethod);
    strictEqual(pythonMethod.kind, "lro");
    strictEqual(csharpMethod.kind, "lro");
    strictEqual(pythonMethod.lroMetadata.operationId?.[0].kind, "path");
    if (pythonMethod.lroMetadata.operationId?.[0].kind === "path") {
      strictEqual(pythonMethod.lroMetadata.operationId[0].pathParameter.name, "jobId");
    }
    strictEqual(csharpMethod.lroMetadata.operationId, undefined);
  });

  it("exposes a status-monitor response property", async () => {
    const { program } = await Tester.compile(propertyOperation);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId?.length, 1);
    strictEqual(method.lroMetadata.operationId?.[0].kind, "property");
    if (method.lroMetadata.operationId?.[0].kind === "property") {
      strictEqual(method.lroMetadata.operationId[0].property.name, "operationId");
      strictEqual(method.lroMetadata.operationId[0].property.__raw?.name, "operationId");
      strictEqual(
        method.lroMetadata.operationId[0].property,
        method.lroMetadata.pollingInfo.responseModel.properties.find(
          (x) => x.name === "operationId",
        ),
      );
    }
  });

  it("exposes an inherited status-monitor response property", async () => {
    const { program } = await Tester.compile(`
model PropertyJobStateBase {
  @lroOperationId
  operationId: string;
}
model PropertyJobState extends PropertyJobStateBase {
  status: LroStatus;
}
@route("/property-jobs/status") @get
op getPropertyJobStatus(): PropertyJobState;
@route("/property-jobs") @pollingOperation(getPropertyJobStatus)
op startPropertyJob is Azure.Core.Foundations.LongRunningOperation<
  {}, AcceptedResponse, {}, {}
>;
`);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId?.[0].kind, "property");
    if (method.lroMetadata.operationId?.[0].kind === "property") {
      strictEqual(
        method.lroMetadata.operationId[0].property,
        method.lroMetadata.pollingInfo.responseModel.baseModel?.properties.find(
          (x) => x.name === "operationId",
        ),
      );
    }
  });

  it("rejects a non-string status-monitor response property", async () => {
    const diagnostics = await Tester.diagnose(
      propertyOperation.replace("operationId: string", "operationId: int32"),
    );
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/lro-operation-id-invalid-target",
    });
  });

  it("rejects a property outside the linked status-monitor response model", async () => {
    const diagnostics = await Tester.diagnose(`
model OtherStatus {
  @lroOperationId operationId: string;
}
${propertyOperation.replace("@lroOperationId\n  operationId: string;", "operationId: string;")}
`);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/lro-operation-id-invalid-target",
    });
  });

  it("honors decorator scope for a status-monitor response property", async () => {
    const { program } = await Tester.compile(
      propertyOperation.replace("@lroOperationId\n", '@lroOperationId("python")\n'),
    );
    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const pythonMethod = pythonContext.sdkPackage.clients[0].methods.find(
      (x) => x.name === "startPropertyJob",
    );
    const csharpMethod = csharpContext.sdkPackage.clients[0].methods.find(
      (x) => x.name === "startPropertyJob",
    );
    ok(pythonMethod);
    ok(csharpMethod);
    strictEqual(pythonMethod.kind, "lro");
    strictEqual(csharpMethod.kind, "lro");
    strictEqual(pythonMethod.lroMetadata.operationId?.[0].kind, "property");
    strictEqual(csharpMethod.lroMetadata.operationId, undefined);
  });

  it("excludes a response property outside the emitter scope", async () => {
    const { program } = await Tester.compile(
      propertyOperation.replace(
        "@lroOperationId\n  operationId",
        '@lroOperationId\n  @scope("python")\n  operationId',
      ),
    );
    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const pythonMethod = pythonContext.sdkPackage.clients[0].methods.find(
      (x) => x.name === "startPropertyJob",
    );
    const csharpMethod = csharpContext.sdkPackage.clients[0].methods.find(
      (x) => x.name === "startPropertyJob",
    );
    ok(pythonMethod);
    ok(csharpMethod);
    strictEqual(pythonMethod.kind, "lro");
    strictEqual(csharpMethod.kind, "lro");
    strictEqual(pythonMethod.lroMetadata.operationId?.[0].kind, "property");
    strictEqual(csharpMethod.lroMetadata.operationId, undefined);
  });

  it("excludes a response property without read visibility", async () => {
    const { program } = await Tester.compile(
      propertyOperation.replace(
        "@lroOperationId\n  operationId",
        "@lroOperationId\n  @visibility(Lifecycle.Create)\n  operationId",
      ),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId, undefined);
  });

  it("preserves ordered operation IDs alongside status metadata", async () => {
    const { program } = await Tester.compile(`
model CombinedJobState {
  @lroOperationId operationId: string;
  @lroStatusMetadata percentComplete?: int32;
  status: LroStatus;
}
@route("/combined-jobs/{operationId}") @get
op getCombinedJobStatus(
  @lroOperationId @path operationId: string
): CombinedJobState;
@route("/combined-jobs") @pollingOperation(getCombinedJobStatus)
op startCombinedJob is Azure.Core.Foundations.LongRunningOperation<
  {}, AcceptedResponse, {}, {}
>;
`);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startCombinedJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId?.length, 2);
    strictEqual(method.lroMetadata.operationId?.[0].kind, "path");
    strictEqual(method.lroMetadata.operationId?.[1].kind, "property");
    const progressProperty = method.lroMetadata.pollingInfo.responseModel.properties.find(
      (x) => x.name === "percentComplete",
    );
    ok(progressProperty);
    strictEqual(method.lroMetadata.statusMetadata?.length, 1);
    strictEqual(method.lroMetadata.statusMetadata[0].property, progressProperty);
  });

  it("reports duplicate active operation ID parameters", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@path jobId: string",
        `@path jobId: string,
  @lroOperationId
  @path otherId: string`,
      ),
    );
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics.map((x) => x.code)).toContain(
      "@azure-tools/typespec-client-generator-core/lro-operation-id-duplicate",
    );
  });

  it("reports duplicate active operation ID response properties", async () => {
    const { program } = await Tester.compile(
      propertyOperation.replace(
        "status: LroStatus;",
        `@lroOperationId
  alternateOperationId: string;
  status: LroStatus;`,
      ),
    );
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics.map((x) => x.code)).toContain(
      "@azure-tools/typespec-client-generator-core/lro-operation-id-duplicate",
    );
  });

  it("rejects a next-operation reference without a status-monitor link", async () => {
    const { program } = await Tester.compile(`
model PollingStatus {
  @lroStatus status: LroStatus;
}
@route("/widgets/{id}/operations/{operationId}")
@get op getStatus(
  @path id: string,
  @lroOperationId @path operationId: string
): PollingStatus;
@pollingOperation(getStatus, {
  id: ResponseProperty<"id">;
  operationId: ResponseProperty<"operationId">;
})
@route("/widgets/{id}")
@put
op createWidget(@path id: string): {
  @statusCode _: 202;
  @header id: string;
  @header("operation-id") operationId: string;
};
`);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "createWidget");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId, undefined);
    expect(context.diagnostics.map((x) => x.code)).toContain(
      "@azure-tools/typespec-client-generator-core/lro-operation-id-missing-link",
    );
  });

  it("accepts a next-operation reference with a compiled status-monitor link", async () => {
    const { program } = await Tester.compile(`
model PollingStatus {
  @lroStatus status: LroStatus;
}
@route("/widgets/{id}/operations/{operationId}")
@get op getStatus(
  @path id: string,
  @lroOperationId @path operationId: string
): PollingStatus;
@pollingOperation(getStatus, {
  id: RequestParameter<"id">;
  operationId: ResponseProperty<"operationId">;
})
@route("/widgets/{id}")
@put
op createWidget(@path id: string): {
  @statusCode _: 202;
  @header("operation-id") operationId: string;
  @pollingLocation
  @header("Operation-Location")
  operationLocation: ResourceLocation<PollingStatus>;
};
`);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "createWidget");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.statusMonitorStep?.kind, "nextOperationReference");
    if (method.lroMetadata.statusMonitorStep?.kind === "nextOperationReference") {
      ok(method.lroMetadata.statusMonitorStep.target.link);
      strictEqual(
        method.lroMetadata.operationId?.[0].kind === "path"
          ? method.lroMetadata.operationId[0].source
          : undefined,
        method.lroMetadata.statusMonitorStep.target.link,
      );
    }
    strictEqual(method.lroMetadata.operationId?.[0].kind, "path");
    if (method.lroMetadata.operationId?.[0].kind === "path") {
      strictEqual(method.lroMetadata.operationId[0].pathParameter.name, "operationId");
    }
  });

  it("retains a spread operation ID path parameter", async () => {
    const { program } = await Tester.compile(`
model PollingStatus {
  @lroStatus status: LroStatus;
}
model StatusParameters {
  @lroOperationId
  @path operationId: string;
}
@route("/widgets/operations/{operationId}")
@get op getStatus(...StatusParameters): PollingStatus;
@pollingOperation(getStatus)
@route("/widgets")
@post
op createWidget(): {
  @statusCode _: 202;
  @pollingLocation
  @header("Operation-Location")
  operationLocation: ResourceLocation<PollingStatus>;
};
`);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "createWidget");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId?.[0].kind, "path");
    if (method.lroMetadata.operationId?.[0].kind === "path") {
      strictEqual(method.lroMetadata.operationId[0].pathParameter.name, "operationId");
    }
  });

  it("accepts a URL-valued polling location in the response body", async () => {
    const { program } = await Tester.compile(`
model Monitor {
  @lroStatus status: LroStatus;
}

@route("/widgets/operations/{operationId}")
@get
op getStatus(@lroOperationId @path operationId: string): Monitor;

@pollingOperation(getStatus)
@route("/widgets")
@post
op createWidget(): {
  @statusCode _: 202;
  @pollingLocation
  @body
  location: ResourceLocation<Monitor>;
};
`);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "createWidget");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.statusMonitorStep?.kind, "nextOperationLink");
    if (method.lroMetadata.statusMonitorStep?.kind === "nextOperationLink") {
      strictEqual(method.lroMetadata.statusMonitorStep.target.location, "ResponseBody");
      strictEqual(
        method.lroMetadata.operationId?.[0].kind === "path"
          ? method.lroMetadata.operationId[0].source
          : undefined,
        method.lroMetadata.statusMonitorStep.target,
      );
    }
  });

  it("rejects a Self link whose body value is not a URL", async () => {
    const { program, Monitor } = await Tester.compile(`
@test model Monitor {
  @lroStatus status: LroStatus;
}
`);
    const context = await createSdkContextForTester(program);
    const property = Monitor.properties.get("status");
    ok(property);
    strictEqual(
      getLroOperationIdLink(context, {
        kind: "nextOperationLink",
        responseModel: Monitor,
        target: {
          kind: "link",
          location: "Self",
          property,
        },
      }),
      undefined,
    );
  });

  it("does not add operation ID metadata to an undecorated LRO", async () => {
    const { program } = await Tester.compile(operation.replace("  @lroOperationId\n", ""));
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId, undefined);
  });
});
