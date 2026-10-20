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

  it("requires the operation ID target to be a path parameter", async () => {
    const diagnostics = await Tester.diagnose(`
model Invalid {
  @lroOperationId
  value: string;
}
`);
    expectDiagnostics(diagnostics, {
      code: "@azure-tools/typespec-client-generator-core/lro-operation-id-not-path",
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
        method.lroMetadata.operationId?.source,
        method.lroMetadata.statusMonitorStep.target,
      );
      strictEqual(
        method.lroMetadata.operationId?.pathParameter,
        method.lroMetadata.statusMonitorStep.operation?.parameters.find(
          (x) => x.kind === "path" && x.name === "jobId",
        ),
      );
    }
    strictEqual(method.lroMetadata.operationId?.pathParameter.name, "jobId");
    strictEqual(method.lroMetadata.operationId?.pathParameter.__raw?.name, "jobId");
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
    strictEqual(pythonMethod.lroMetadata.operationId?.pathParameter.name, "jobId");
    strictEqual(csharpMethod.lroMetadata.operationId, undefined);
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
        method.lroMetadata.operationId?.source,
        method.lroMetadata.statusMonitorStep.target.link,
      );
    }
    strictEqual(method.lroMetadata.operationId?.pathParameter.name, "operationId");
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
    strictEqual(method.lroMetadata.operationId?.pathParameter.name, "operationId");
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
        method.lroMetadata.operationId?.source,
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
