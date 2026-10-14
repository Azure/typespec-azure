import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { type SdkLroServiceMethod, UsageFlags } from "../../src/interfaces.js";
import { getLroOperationIdLink, getStatusMonitorLink } from "../../src/lro-polling-metadata.js";
import { AzureCoreTester, createSdkContextForTester } from "../tester.js";

const Tester = AzureCoreTester.wrap(
  (code) => `
@service
namespace TestService;

alias ResourceOperations = global.Azure.Core.ResourceOperations<
  NoConditionalRequests & NoRepeatableRequests & NoClientRequestId
>;

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
@resource("jobs")
model JobState extends PollingMetadataBase {
  @key
  @visibility(Lifecycle.Read)
  jobId: string;

  status: LroStatus;

  @doc("Completion percentage")
  @encode(string)
  @encodedName("application/json", "percent_complete")
  @lroPollingMetadata
  percentComplete?: int32;

  @lroPollingMetadata
  details: Details;
  sibling: Sibling;
}

model PollingMetadataBase {
  @clientName("requestToken")
  @lroPollingMetadata
  request_token: string;
}

model Details {
  mode: DetailMode;
}

enum DetailMode {
  fast,
  slow,
}

model Sibling {
  value: string;
}

op getJobStatus is ResourceOperations.ResourceRead<JobState>;

@route("/jobs")
@pollingOperation(getJobStatus)
@lroOperationId("lastPathSegment")
op start is Azure.Core.Foundations.LongRunningOperation<
  {},
  AcceptedResponse,
  {},
  {}
>;
`;

describe("LRO polling metadata", () => {
  it("accepts a next-operation reference with a status-monitor link", () => {
    const rawLink = {
      kind: "link",
      location: "ResponseHeader",
      property: {} as any,
    } as const;
    const rawStep = {
      kind: "nextOperationReference",
      responseModel: {} as any,
      target: {
        kind: "reference",
        operation: {} as any,
        link: rawLink,
      },
    } as const;
    strictEqual(getStatusMonitorLink(rawStep), rawLink);

    const sdkLink = {
      kind: "link",
      location: "ResponseHeader",
      property: {} as any,
    } as const;
    const sdkStep = {
      kind: "nextOperationReference",
      responseModel: {} as any,
      target: {
        kind: "reference",
        operation: {} as any,
        link: sdkLink,
      },
    } as const;
    strictEqual(getStatusMonitorLink(sdkStep), sdkLink);
  });

  it("requires a supported operation ID strategy", async () => {
    const diagnostics = await Tester.diagnose(
      operation.replace("lastPathSegment", "firstPathSegment"),
    );
    expectDiagnostics(diagnostics, { code: "invalid-argument" });
  });

  it("exposes the URI-derived operation ID source and exact typed polling properties", async () => {
    const { program } = await Tester.compile(operation);
    const context = await createSdkContextForTester(
      program,
      {},
      { additionalDecorators: ["TypeSpec\\.@encode"] },
    );
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");

    const lro = method as SdkLroServiceMethod<any>;
    strictEqual(lro.lroMetadata.operationId?.strategy, "lastPathSegment");
    strictEqual(
      lro.lroMetadata.operationId?.source,
      lro.lroMetadata.statusMonitorStep?.kind === "nextOperationLink"
        ? lro.lroMetadata.statusMonitorStep.target
        : undefined,
    );

    const pollingModel = lro.lroMetadata.pollingInfo.responseModel;
    const pollingProperties = [
      ...pollingModel.properties,
      ...(pollingModel.baseModel?.properties ?? []),
    ];
    const pollingMetadata = lro.lroMetadata.pollingMetadata;
    ok(pollingMetadata);
    expect(pollingMetadata).toEqual([
      pollingProperties.find((x) => x.name === "percentComplete"),
      pollingProperties.find((x) => x.name === "details"),
      pollingProperties.find((x) => x.name === "requestToken"),
    ]);
    for (const property of pollingMetadata) {
      strictEqual(
        property,
        pollingProperties.find((candidate) => candidate.__raw === property.__raw),
      );
    }

    const percent = pollingMetadata[0];
    strictEqual(percent.name, "percentComplete");
    strictEqual(percent.serializationOptions.json?.name, "percent_complete");
    strictEqual(percent.optional, true);
    strictEqual(percent.type.kind, "int32");
    expect(percent.decorators.map((x) => x.name)).toContain("TypeSpec.@encode");
  });

  it("retains only the selected nested graph as output", async () => {
    const { program } = await Tester.compile(operation);
    const context = await createSdkContextForTester(program);
    const { program: undecoratedProgram } = await Tester.compile(
      operation
        .replace('@lroOperationId("lastPathSegment")\n', "")
        .replaceAll(/ {2}@lroPollingMetadata(?:\([^)]*\))?\n/g, ""),
    );
    const undecoratedContext = await createSdkContextForTester(undecoratedProgram);
    const details = context.sdkPackage.models.find((x) => x.name === "Details");
    const sibling = context.sdkPackage.models.find((x) => x.name === "Sibling");
    const detailMode = context.sdkPackage.enums.find((x) => x.name === "DetailMode");
    const undecoratedSibling = undecoratedContext.sdkPackage.models.find(
      (x) => x.name === "Sibling",
    );
    ok(details);
    ok(sibling);
    ok(detailMode);
    ok(undecoratedSibling);
    expect(details.usage & UsageFlags.Output).toBe(UsageFlags.Output);
    expect(detailMode.usage & UsageFlags.Output).toBe(UsageFlags.Output);
    strictEqual(sibling.usage, undecoratedSibling.usage);
    strictEqual(sibling.access, undecoratedSibling.access);
  });

  it("honors scoped inclusion and negation", async () => {
    const { program } = await Tester.compile(
      operation
        .replace(
          "@lroPollingMetadata\n  request_token",
          '@lroPollingMetadata("python")\n  request_token',
        )
        .replace(
          "@lroPollingMetadata\n  percentComplete",
          '@lroPollingMetadata("!python")\n  percentComplete',
        ),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    expect(method.lroMetadata.pollingMetadata?.map((x) => x.name)).toEqual([
      "details",
      "requestToken",
    ]);
  });

  it("excludes scoped-out polling properties and their type graphs", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroPollingMetadata\n  details",
        '@scope("!python")\n  @lroPollingMetadata\n  details',
      ),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    expect(
      method.lroMetadata.pollingInfo.responseModel.properties.map((x) => x.name),
    ).not.toContain("details");
    expect(method.lroMetadata.pollingMetadata?.map((x) => x.name)).not.toContain("details");
    expect(context.sdkPackage.models.find((x) => x.name === "Details")).toBeUndefined();
    expect(context.sdkPackage.enums.find((x) => x.name === "DetailMode")).toBeUndefined();
  });

  it("excludes lifecycle-invisible polling properties and their type graphs", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroPollingMetadata\n  details",
        "@invisible(Lifecycle)\n  @lroPollingMetadata\n  details",
      ),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    expect(
      method.lroMetadata.pollingInfo.responseModel.properties.map((x) => x.name),
    ).not.toContain("details");
    expect(method.lroMetadata.pollingMetadata?.map((x) => x.name)).not.toContain("details");
    expect(context.sdkPackage.models.find((x) => x.name === "Details")).toBeUndefined();
    expect(context.sdkPackage.enums.find((x) => x.name === "DetailMode")).toBeUndefined();
  });

  it("preserves internal access for internal operations", async () => {
    const { program } = await Tester.compile(
      operation
        .replace("op getJobStatus", "@access(Access.internal)\nop getJobStatus")
        .replace('@route("/jobs")', '@access(Access.internal)\n@route("/jobs")'),
    );
    const context = await createSdkContextForTester(program);
    const details = context.sdkPackage.models.find((x) => x.name === "Details");
    ok(details);
    strictEqual(details.access, "internal");
    expect(context.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/lro-polling-metadata-internal-conflict",
    );
  });

  it("preserves a selected property's scoped internal access through its graph", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroPollingMetadata\n  details",
        '@access(Access.internal, "python")\n  @lroPollingMetadata\n  details',
      ),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    const details = context.sdkPackage.models.find((x) => x.name === "Details");
    const detailMode = context.sdkPackage.enums.find((x) => x.name === "DetailMode");
    ok(method);
    ok(details);
    ok(detailMode);
    strictEqual(method.kind, "lro");
    const property = method.lroMetadata.pollingMetadata?.find((x) => x.name === "details");
    ok(property);
    strictEqual(property.type, details);
    strictEqual(details.access, "internal");
    strictEqual(detailMode.access, "internal");
    expect(context.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/conflict-access-override",
    );
  });

  it("keeps scoped usage authoritative", async () => {
    const { program } = await Tester.compile(
      operation.replace("model Details {", '@usage(Usage.input, "python")\nmodel Details {'),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    const details = context.sdkPackage.models.find((x) => x.name === "Details");
    const csharpDetails = csharpContext.sdkPackage.models.find((x) => x.name === "Details");
    ok(details);
    ok(csharpDetails);
    expect(details.usage & UsageFlags.Input).toBe(UsageFlags.Input);
    expect(details.usage & UsageFlags.Output).toBe(UsageFlags.Output);
    expect(csharpDetails.usage & UsageFlags.Input).toBe(0);
  });

  it("reports invalid operation IDs, duplicates, conflicts, and explicit internal exposure", async () => {
    const invalidCases = [
      {
        code: `
model Value { value: string; }
@Azure.ClientGenerator.Core.Legacy.markAsLro
@lroOperationId("lastPathSegment")
@route("/ordinary")
op ordinary(): Value;
`,
        diagnostic: "lro-operation-id-non-lro",
      },
      {
        code: operation.replace(
          "@lroPollingMetadata\n  request_token",
          "@lroPollingMetadata\n  @lroPollingMetadata\n  request_token",
        ),
        diagnostic: "lro-polling-metadata-duplicate",
      },
      {
        code: operation.replace(
          "percentComplete?: int32;",
          '@clientName("requestToken")\n  percentComplete?: int32;',
        ),
        diagnostic: "lro-polling-metadata-name-conflict",
      },
      {
        code: operation.replace('@clientName("requestToken")', '@clientName("operationId")'),
        diagnostic: "lro-polling-metadata-name-conflict",
      },
      {
        code: operation.replace("model Details {", "@access(Access.internal)\nmodel Details {"),
        diagnostic: "conflict-access-override",
      },
      {
        code: operation.replace(
          '@lroOperationId("lastPathSegment")',
          '@lroOperationId("lastPathSegment")\n@lroOperationId("lastPathSegment")',
        ),
        diagnostic: "lro-operation-id-duplicate",
      },
    ];

    for (const testCase of invalidCases) {
      const { program } = await Tester.compile(testCase.code);
      const context = await createSdkContextForTester(program);
      expect(context.diagnostics.map((x) => x.code)).toContain(
        `@azure-tools/typespec-client-generator-core/${testCase.diagnostic}`,
      );
    }
  });

  it("ignores decorated properties that are not used by an LRO", async () => {
    const code = operation.replace(
      "model Sibling {",
      `model Other {
  @lroPollingMetadata
  value: string;
}

model Sibling {`,
    );
    const { program } = await Tester.compile(code);
    const context = await createSdkContextForTester(program);
    expect(context.diagnostics).toHaveLength(0);
    expect(context.sdkPackage.models.find((x) => x.name === "Other")).toBeUndefined();
  });

  it("applies a shared decorated property to every LRO monitor model that inherits it", async () => {
    const { program } = await Tester.compile(
      `${operation}

@resource("secondJobs")
model SecondJobState extends PollingMetadataBase {
  @key
  @visibility(Lifecycle.Read)
  jobId: string;

  status: LroStatus;
}

op getSecondJobStatus is ResourceOperations.ResourceRead<SecondJobState>;

@route("/jobs/second")
@pollingOperation(getSecondJobStatus)
op startSecond is Azure.Core.Foundations.LongRunningOperation<
  {},
  AcceptedResponse,
  {},
  {}
>;
`,
    );
    const context = await createSdkContextForTester(program);
    const start = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    const startSecond = context.sdkPackage.clients[0].methods.find((x) => x.name === "startSecond");
    ok(start);
    ok(startSecond);
    strictEqual(start.kind, "lro");
    strictEqual(startSecond.kind, "lro");
    expect(start.lroMetadata.pollingMetadata?.map((x) => x.name)).toEqual([
      "percentComplete",
      "details",
      "requestToken",
    ]);
    expect(startSecond.lroMetadata.pollingMetadata?.map((x) => x.name)).toEqual(["requestToken"]);
    strictEqual(
      start.lroMetadata.pollingMetadata?.[2],
      startSecond.lroMetadata.pollingMetadata?.[0],
    );
  });

  it("ignores an overridden decorated base property", async () => {
    const { program } = await Tester.compile(
      operation.replace('@clientName("requestToken")', '@clientName("operationId")').replace(
        "model JobState extends PollingMetadataBase {",
        `model JobState extends PollingMetadataBase {
  request_token: string;`,
      ),
    );
    const context = await createSdkContextForTester(program);
    const start = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(start);
    strictEqual(start.kind, "lro");
    expect(start.lroMetadata.pollingMetadata?.map((x) => x.name)).toEqual([
      "percentComplete",
      "details",
    ]);
    expect(context.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/lro-polling-metadata-name-conflict",
    );
  });

  it("reports only overlapping active scoped property decorators", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroPollingMetadata\n  request_token",
        '@lroPollingMetadata\n  @lroPollingMetadata("python")\n  request_token',
      ),
    );
    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    expect(pythonContext.diagnostics.map((x) => x.code)).toContain(
      "@azure-tools/typespec-client-generator-core/lro-polling-metadata-duplicate",
    );
    expect(csharpContext.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/lro-polling-metadata-duplicate",
    );
  });

  it("rejects a next-operation reference without a status-monitor link", async () => {
    const { program } = await Tester.compile(`
model PollingStatus {
  @lroStatus status: LroStatus;
}
@route("/widgets/{id}/operations/{operationId}")
@get op getStatus(@path id: string, @path operationId: string): PollingStatus;
@pollingOperation(getStatus, {
  id: ResponseProperty<"id">;
  operationId: ResponseProperty<"operationId">;
})
@route("/widgets/{id}")
@put
@lroOperationId("lastPathSegment")
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
    strictEqual(method.lroMetadata.statusMonitorStep?.kind, "nextOperationReference");
    if (method.lroMetadata.statusMonitorStep?.kind === "nextOperationReference") {
      strictEqual(method.lroMetadata.statusMonitorStep.target.link, undefined);
    }
    strictEqual(method.lroMetadata.operationId, undefined);
    expect(context.diagnostics.map((x) => x.code)).toContain(
      "@azure-tools/typespec-client-generator-core/lro-operation-id-missing-link",
    );
  });

  it("accepts a URL-valued polling location in the response body", async () => {
    const { program } = await Tester.compile(`
model Monitor {
  @lroStatus status: LroStatus;
}

@route("/widgets")
@post
@lroOperationId("lastPathSegment")
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
      strictEqual(method.lroMetadata.statusMonitorStep.target.location, "Self");
      strictEqual(
        method.lroMetadata.operationId?.source,
        method.lroMetadata.statusMonitorStep.target,
      );
    }
    strictEqual(method.lroMetadata.operationId?.strategy, "lastPathSegment");
    expect(context.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/lro-operation-id-missing-link",
    );
  });

  it("rejects a stepwise Self link whose body value is not a URI", async () => {
    const { program, Monitor } = await Tester.compile(`
@test model Monitor {
  @lroStatus status: LroStatus;
}
`);
    const context = await createSdkContextForTester(program);
    const property = Monitor.properties.get("status");
    ok(property);
    const link = {
      kind: "link",
      location: "Self",
      property,
    } as const;
    strictEqual(
      getLroOperationIdLink(context, {
        kind: "nextOperationLink",
        responseModel: Monitor,
        target: link,
      }),
      undefined,
    );
  });

  it("does not change undecorated LRO metadata", async () => {
    const { program } = await Tester.compile(
      operation
        .replace('@lroOperationId("lastPathSegment")\n', "")
        .replaceAll(/ {2}@lroPollingMetadata(?:\([^)]*\))?\n/g, ""),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.operationId, undefined);
    strictEqual(method.lroMetadata.pollingMetadata, undefined);
  });

  it("carries polling metadata through LRO and paging composition", async () => {
    const { program } = await Tester.compile(
      operation
        .replace(
          '@route("/jobs")',
          `model StartResponse {
  @statusCode statusCode: 202;
  @pollingLocation
  @header("Operation-Location")
  operationLocation: ResourceLocation<JobState>;
  @pageItems items: string[];
}

@route("/jobs")`,
        )
        .replace(
          `op start is Azure.Core.Foundations.LongRunningOperation<
  {},
  AcceptedResponse,
  {},
  {}
>;`,
          `@list
op start(): StartResponse;`,
        ),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lropaging");
    strictEqual(method.lroMetadata.operationId?.strategy, "lastPathSegment");
    expect(method.lroMetadata.pollingMetadata?.map((x) => x.name)).toEqual([
      "percentComplete",
      "details",
      "requestToken",
    ]);
  });
});
