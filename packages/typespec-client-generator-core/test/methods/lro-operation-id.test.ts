import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { getLroOperationIdLink } from "../../src/lro-operation-id.js";
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
  it("ignores an operation ID annotation unused by an LRO", async () => {
    const { program } = await Tester.compile(`
model Invalid {
  @lroOperationId
  value: int32;
}
`);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
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
    const { program } = await Tester.compile(
      propertyOperation.replace(
        "@lroOperationId\n",
        '@lroOperationId\n  @clientName("jobId")\n  @encodedName("application/json", "job_id")\n',
      ),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId?.length, 1);
    strictEqual(method.lroMetadata.operationId?.[0].kind, "property");
    if (method.lroMetadata.operationId?.[0].kind === "property") {
      strictEqual(method.lroMetadata.operationId[0].property.name, "jobId");
      strictEqual(method.lroMetadata.operationId[0].property.__raw?.name, "operationId");
      strictEqual(
        method.lroMetadata.operationId[0].property,
        method.lroMetadata.pollingInfo.responseModel.properties.find((x) => x.name === "jobId"),
      );
      strictEqual(method.lroMetadata.operationId[0].propertySegments.length, 1);
      strictEqual(
        method.lroMetadata.operationId[0].propertySegments[0],
        method.lroMetadata.operationId[0].property,
      );
      strictEqual(
        method.lroMetadata.operationId[0].propertySegments[0].serializationOptions.json?.name,
        "job_id",
      );
    }
  });

  it("uses common scope precedence for repeated declarations on one source", async () => {
    const { program } = await Tester.compile(
      propertyOperation.replace(
        "@lroOperationId\n",
        '@lroOperationId(#{ scope: "python" })\n  @lroOperationId\n',
      ),
    );
    for (const emitterName of ["@azure-tools/typespec-python", "@azure-tools/typespec-csharp"]) {
      const context = await createSdkContextForTester(program, { emitterName });
      expectDiagnostics(context.diagnostics, []);
      const method = context.sdkPackage.clients[0].methods.find(
        (x) => x.name === "startPropertyJob",
      );
      ok(method);
      strictEqual(method.kind, "lro");
      strictEqual(method.lroMetadata.operationId?.length, 1);
      strictEqual(method.lroMetadata.operationId[0].kind, "property");
    }
  });

  it("selects different response properties for positive and negated scopes", async () => {
    const { program } = await Tester.compile(
      propertyOperation
        .replace("@lroOperationId\n", '@lroOperationId(#{ scope: "!python" })\n')
        .replace(
          "status: LroStatus;",
          `@lroOperationId("python")
  pythonId: string;
  status: LroStatus;`,
        ),
    );
    for (const [emitterName, propertyName] of [
      ["@azure-tools/typespec-python", "pythonId"],
      ["@azure-tools/typespec-csharp", "operationId"],
    ]) {
      const context = await createSdkContextForTester(program, { emitterName });
      expectDiagnostics(context.diagnostics, []);
      const method = context.sdkPackage.clients[0].methods.find(
        (x) => x.name === "startPropertyJob",
      );
      ok(method);
      strictEqual(method.kind, "lro");
      strictEqual(method.lroMetadata.operationId?.length, 1);
      const operationId = method.lroMetadata.operationId[0];
      strictEqual(operationId.kind, "property");
      strictEqual(operationId.property.name, propertyName);
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
      strictEqual(method.lroMetadata.operationId[0].propertySegments.length, 1);
      strictEqual(
        method.lroMetadata.operationId[0].propertySegments[0],
        method.lroMetadata.operationId[0].property,
      );
      strictEqual(
        method.lroMetadata.operationId[0].property,
        method.lroMetadata.pollingInfo.responseModel.baseModel?.properties.find(
          (x) => x.name === "operationId",
        ),
      );
    }
  });

  it("rejects a non-string status-monitor response property", async () => {
    const { program } = await Tester.compile(
      propertyOperation.replace("operationId: string", "operationId: int32"),
    );
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/lro-operation-id-invalid-target",
    });
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId, undefined);
  });

  it.each([
    '@lroOperationId("python")',
    '@lroOperationId @scope("python")',
    "@lroOperationId @visibility(Lifecycle.Create)",
  ])("does not validate an excluded response ID: %s", async (decorators) => {
    const { program } = await Tester.compile(
      propertyOperation
        .replace("@lroOperationId", decorators)
        .replace("operationId: string", "operationId: int32"),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    expectDiagnostics(context.diagnostics, []);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId, undefined);
  });

  it.each(["@lroOperationId @path", "@path @lroOperationId"])(
    "accepts a numeric path ID with decorator order %s",
    async (decorators) => {
      const { program } = await Tester.compile(
        operation.replace("@lroOperationId\n  @path jobId: string", `${decorators} jobId: int32`),
      );
      const context = await createSdkContextForTester(program);
      expectDiagnostics(context.diagnostics, []);
      const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
      ok(method);
      strictEqual(method.kind, "lro");
      strictEqual(method.lroMetadata.operationId?.[0].kind, "path");
    },
  );

  it("selects only the effective operation ID when a derived monitor overrides it", async () => {
    const { program } = await Tester.compile(`
model BaseJobState {
  @lroOperationId operationId: string;
  status: LroStatus;
}
model DerivedJobState extends BaseJobState {
  @lroOperationId operationId: string;
}
@route("/base-jobs/status") @get
op getBaseJobStatus(): BaseJobState;
@route("/base-jobs") @pollingOperation(getBaseJobStatus)
op startBaseJob is Azure.Core.Foundations.LongRunningOperation<
  {}, AcceptedResponse, {}, {}
>;
@route("/derived-jobs/status") @get
op getDerivedJobStatus(): DerivedJobState;
@route("/derived-jobs") @pollingOperation(getDerivedJobStatus)
op startDerivedJob is Azure.Core.Foundations.LongRunningOperation<
  {}, AcceptedResponse, {}, {}
>;
`);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    for (const name of ["startBaseJob", "startDerivedJob"]) {
      const method = context.sdkPackage.clients[0].methods.find((x) => x.name === name);
      ok(method);
      strictEqual(method.kind, "lro");
      strictEqual(method.lroMetadata.operationId?.length, 1);
      const operationId = method.lroMetadata.operationId[0];
      strictEqual(operationId.kind, "property");
      strictEqual(
        operationId.property,
        method.lroMetadata.pollingInfo.responseModel.properties.find(
          (x) => x.name === "operationId",
        ),
      );
    }
  });

  it("uses the retained operation ID property after hierarchy rebasing", async () => {
    const { program } = await Tester.compile(
      propertyOperation.replace(
        "model PropertyJobState {",
        `model NewJobState {
  @clientName("rebasedId")
  @encodedName("application/json", "rebased_id")
  operationId: string;
}
@Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(NewJobState)
model PropertyJobState {`,
      ),
    );
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId?.length, 1);
    const operationId = method.lroMetadata.operationId[0];
    strictEqual(operationId.kind, "property");
    strictEqual(
      operationId.property,
      method.lroMetadata.pollingInfo.responseModel.baseModel?.properties.find(
        (x) => x.name === "rebasedId",
      ),
    );
    strictEqual(operationId.property.serializationOptions.json?.name, "rebased_id");
    strictEqual(operationId.propertySegments.length, 1);
    strictEqual(operationId.propertySegments[0], operationId.property);
  });

  it("ignores a property outside the linked status-monitor response model", async () => {
    const { program } = await Tester.compile(`
model OtherStatus {
  @lroOperationId operationId: string;
}
${propertyOperation.replace("@lroOperationId\n  operationId: string;", "operationId: string;")}
`);
    const context = await createSdkContextForTester(program);
    expectDiagnostics(context.diagnostics, []);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "startPropertyJob");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId, undefined);
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
    ok("kind" in Monitor && Monitor.kind === "Model");
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
