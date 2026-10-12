import { ok, strictEqual } from "assert";
import { describe, expect, it } from "vitest";
import { type SdkLroServiceMethod, UsageFlags } from "../../src/interfaces.js";
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
  percentComplete?: int32;

  details: Details;
  sibling: Sibling;
}

model PollingMetadataBase {
  @clientName("requestToken")
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
@lroOperationId
@lroPollingMetadata(JobState.request_token)
@lroPollingMetadata(JobState.percentComplete)
@lroPollingMetadata(JobState.details)
op start is Azure.Core.Foundations.LongRunningOperation<
  {},
  AcceptedResponse,
  {},
  {}
>;
`;

describe("LRO polling metadata", () => {
  it("exposes the URI-derived ID source and exact typed polling properties", async () => {
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
    strictEqual(lro.lroMetadata.operationId?.extractionStrategy, "last-non-empty-path-segment");
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
      pollingProperties.find((x) => x.name === "requestToken"),
      pollingProperties.find((x) => x.name === "percentComplete"),
      pollingProperties.find((x) => x.name === "details"),
    ]);
    for (const property of pollingMetadata) {
      strictEqual(
        property,
        pollingProperties.find((candidate) => candidate.__raw === property.__raw),
      );
    }

    const percent = pollingMetadata[1];
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
      operation.replace("@lroOperationId\n", "").replaceAll(/@lroPollingMetadata\([^)]+\)\n/g, ""),
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
          "@lroPollingMetadata(JobState.request_token)",
          '@lroPollingMetadata(JobState.request_token, "python")',
        )
        .replace(
          "@lroPollingMetadata(JobState.percentComplete)",
          '@lroPollingMetadata(JobState.percentComplete, "!python")',
        ),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    expect(method.lroMetadata.pollingMetadata?.map((x) => x.name)).toEqual([
      "requestToken",
      "details",
    ]);
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

  it("reports invalid targets, duplicates, conflicts, and explicit internal exposure", async () => {
    const invalidCases = [
      {
        code: `
model Value { value: string; }
@Azure.ClientGenerator.Core.Legacy.markAsLro
@lroOperationId
@route("/ordinary")
op ordinary(): Value;
`,
        diagnostic: "lro-polling-metadata-non-lro",
      },
      {
        code: operation.replace(
          "@lroPollingMetadata(JobState.request_token)",
          "@lroPollingMetadata(JobState.sibling)\n@lroPollingMetadata(JobState.sibling)",
        ),
        diagnostic: "lro-polling-metadata-duplicate",
      },
      {
        code: operation
          .replace("model Sibling {", "model Other { value: string; }\nmodel Sibling {")
          .replace(
            "@lroPollingMetadata(JobState.request_token)",
            "@lroPollingMetadata(Other.value)",
          ),
        diagnostic: "lro-polling-metadata-unreachable",
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
        diagnostic: "lro-polling-metadata-internal-conflict",
      },
      {
        code: operation.replace("@lroOperationId", "@lroOperationId\n@lroOperationId"),
        diagnostic: "lro-operation-id-duplicate",
      },
      {
        code: `
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
@lroOperationId
op createWidget(@path id: string): {
  @statusCode _: 202;
  @header id: string;
  @header("operation-id") operationId: string;
};
`,
        diagnostic: "lro-operation-id-missing-link",
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

  it("does not change undecorated LRO metadata", async () => {
    const { program } = await Tester.compile(
      operation.replace("@lroOperationId\n", "").replaceAll(/@lroPollingMetadata\([^)]+\)\n/g, ""),
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
    strictEqual(method.lroMetadata.operationId?.extractionStrategy, "last-non-empty-path-segment");
    expect(method.lroMetadata.pollingMetadata?.map((x) => x.name)).toEqual([
      "requestToken",
      "percentComplete",
      "details",
    ]);
  });
});
