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
model JobState extends PollingMetadataBase {
  jobId: string;

  status: LroStatus;

  @doc("Completion percentage")
  @encode(string)
  @encodedName("application/json", "percent_complete")
  @lroStatusMetadata
  percentComplete?: int32;

  @lroStatusMetadata
  details: Details;
  sibling: Sibling;
}

model PollingMetadataBase {
  @clientName("requestToken")
  @lroStatusMetadata
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

@route("/jobs/{jobId}")
@get
op getJobStatus(
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

describe("LRO status metadata", () => {
  it("exposes exact typed status properties", async () => {
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
    const pollingModel = lro.lroMetadata.pollingInfo.responseModel;
    const pollingProperties = [
      ...pollingModel.properties,
      ...(pollingModel.baseModel?.properties ?? []),
    ];
    const statusMetadata = lro.lroMetadata.statusMetadata;
    ok(statusMetadata);
    expect(statusMetadata.map((x) => x.property)).toEqual([
      pollingProperties.find((x) => x.name === "percentComplete"),
      pollingProperties.find((x) => x.name === "details"),
      pollingProperties.find((x) => x.name === "requestToken"),
    ]);
    for (const { property } of statusMetadata) {
      strictEqual(
        property,
        pollingProperties.find((candidate) => candidate.__raw === property.__raw),
      );
    }

    const percent = statusMetadata[0].property;
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
      operation.replaceAll(/ {2}@lroStatusMetadata(?:\([^)]*\))?\n/g, ""),
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
          "@lroStatusMetadata\n  request_token",
          '@lroStatusMetadata("python")\n  request_token',
        )
        .replace(
          "@lroStatusMetadata\n  percentComplete",
          '@lroStatusMetadata("!python")\n  percentComplete',
        ),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    expect(method.lroMetadata.statusMetadata?.map((x) => x.property.name)).toEqual([
      "details",
      "requestToken",
    ]);
  });

  it("excludes scoped-out polling properties and their type graphs", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroStatusMetadata\n  details",
        '@scope("!python")\n  @lroStatusMetadata\n  details',
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
    expect(method.lroMetadata.statusMetadata?.map((x) => x.property.name)).not.toContain("details");
    expect(context.sdkPackage.models.find((x) => x.name === "Details")).toBeUndefined();
    expect(context.sdkPackage.enums.find((x) => x.name === "DetailMode")).toBeUndefined();
  });

  it("excludes lifecycle-invisible polling properties and their type graphs", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroStatusMetadata\n  details",
        "@invisible(Lifecycle)\n  @lroStatusMetadata\n  details",
      ),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    expect(
      method.lroMetadata.pollingInfo.responseModel.properties.map((x) => x.name),
    ).not.toContain("details");
    expect(method.lroMetadata.statusMetadata?.map((x) => x.property.name)).not.toContain("details");
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
      "@azure-tools/typespec-client-generator-core/lro-status-metadata-internal-conflict",
    );
  });

  it("preserves a selected property's scoped internal access through its graph", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroStatusMetadata\n  details",
        '@access(Access.internal, "python")\n  @lroStatusMetadata\n  details',
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
    const metadata = method.lroMetadata.statusMetadata?.find((x) => x.property.name === "details");
    ok(metadata);
    strictEqual(metadata.property.type, details);
    strictEqual(details.access, "internal");
    strictEqual(detailMode.access, "internal");
    expect(context.diagnostics.map((x) => x.code)).toContain(
      "@azure-tools/typespec-client-generator-core/conflict-access-override",
    );
  });

  it("uses the retained polling property after hierarchy rebasing", async () => {
    const { program } = await Tester.compile(
      operation
        .replace(
          "@lroStatusMetadata\n  details",
          '@clientName("metadataDetails")\n  @lroStatusMetadata\n  details',
        )
        .replace(
          `model JobState extends PollingMetadataBase {`,
          `model RebasedDetails {
  replacement: string;
}

model NewJobState {
  @clientName("rebasedDetails")
  @encodedName("application/json", "rebased_details")
  details: RebasedDetails;
}

@Azure.ClientGenerator.Core.Legacy.hierarchyBuilding(NewJobState)
model JobState extends PollingMetadataBase {`,
        ),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    const rebasedDetails = context.sdkPackage.models.find((x) => x.name === "RebasedDetails");
    ok(method);
    ok(rebasedDetails);
    strictEqual(method.kind, "lro");
    const metadata = method.lroMetadata.statusMetadata?.find(
      (x) => x.property.name === "rebasedDetails",
    );
    ok(metadata);
    strictEqual(metadata.property.type, rebasedDetails);
    strictEqual(metadata.property.serializationOptions.json?.name, "rebased_details");
    expect(rebasedDetails.usage & UsageFlags.Output).toBe(UsageFlags.Output);
    expect(context.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/lro-status-metadata-name-conflict",
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

  it("reports duplicates, conflicts, and explicit internal exposure", async () => {
    const invalidCases = [
      {
        code: operation.replace(
          "@lroStatusMetadata\n  request_token",
          "@lroStatusMetadata\n  @lroStatusMetadata\n  request_token",
        ),
        diagnostic: "lro-status-metadata-duplicate",
      },
      {
        code: operation.replace(
          "percentComplete?: int32;",
          '@clientName("requestToken")\n  percentComplete?: int32;',
        ),
        diagnostic: "lro-status-metadata-name-conflict",
      },
      {
        code: operation.replace("model Details {", "@access(Access.internal)\nmodel Details {"),
        diagnostic: "conflict-access-override",
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

  it("rejects structural LRO properties as status metadata", async () => {
    const invalidCases = [
      operation.replace("  status: LroStatus;", "  @lroStatusMetadata\n  status: LroStatus;"),
      operation.replace(
        "  @lroStatusMetadata\n  details: Details;",
        "  @lroResult\n  @lroStatusMetadata\n  details: Details;",
      ),
      operation.replace(
        "  @lroStatusMetadata\n  details: Details;",
        "  @lroErrorResult\n  @lroStatusMetadata\n  details: Details;",
      ),
      operation.replace(
        "  sibling: Sibling;",
        `  sibling: Sibling;

  @finalLocation
  @lroStatusMetadata
  finalLocation: ResourceLocation<Details>;`,
      ),
    ];

    for (const code of invalidCases) {
      const { program } = await Tester.compile(code);
      const context = await createSdkContextForTester(program);
      expect(context.diagnostics.map((x) => x.code)).toContain(
        "@azure-tools/typespec-client-generator-core/lro-status-metadata-structural-property",
      );
    }
  });

  it("ignores decorated properties that are not used by an LRO", async () => {
    const code = operation.replace(
      "model Sibling {",
      `model Other {
  @lroStatusMetadata
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

@route("/secondJobs/{jobId}")
@get
op getSecondJobStatus(@path jobId: string): SecondJobState;

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
    expect(start.lroMetadata.statusMetadata?.map((x) => x.property.name)).toEqual([
      "percentComplete",
      "details",
      "requestToken",
    ]);
    expect(startSecond.lroMetadata.statusMetadata?.map((x) => x.property.name)).toEqual([
      "requestToken",
    ]);
    strictEqual(
      start.lroMetadata.statusMetadata?.[2].property,
      startSecond.lroMetadata.statusMetadata?.[0].property,
    );
  });

  it("ignores an overridden decorated base property", async () => {
    const { program } = await Tester.compile(
      operation.replace('@clientName("requestToken")', '@clientName("details")').replace(
        "model JobState extends PollingMetadataBase {",
        `model JobState extends PollingMetadataBase {
  request_token: string;`,
      ),
    );
    const context = await createSdkContextForTester(program);
    const start = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(start);
    strictEqual(start.kind, "lro");
    expect(start.lroMetadata.statusMetadata?.map((x) => x.property.name)).toEqual([
      "percentComplete",
      "details",
    ]);
    expect(context.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/lro-status-metadata-name-conflict",
    );
  });

  it("reports only overlapping active scoped property decorators", async () => {
    const { program } = await Tester.compile(
      operation.replace(
        "@lroStatusMetadata\n  request_token",
        '@lroStatusMetadata\n  @lroStatusMetadata("python")\n  request_token',
      ),
    );
    const pythonContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const csharpContext = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-csharp",
    });
    expect(pythonContext.diagnostics.map((x) => x.code)).toContain(
      "@azure-tools/typespec-client-generator-core/lro-status-metadata-duplicate",
    );
    expect(csharpContext.diagnostics.map((x) => x.code)).not.toContain(
      "@azure-tools/typespec-client-generator-core/lro-status-metadata-duplicate",
    );
  });

  it("does not change undecorated LRO metadata", async () => {
    const { program } = await Tester.compile(
      operation.replaceAll(/ {2}@lroStatusMetadata(?:\([^)]*\))?\n/g, ""),
    );
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.statusMetadata, undefined);
  });

  it("preserves alternate types for the polling response body", async () => {
    const { program } = await Tester.compile(
      operation.replaceAll(/ {2}@lroStatusMetadata(?:\([^)]*\))?\n/g, "").replace(
        "model Details {",
        `model ClientJobState {
  jobId: string;
  status: LroStatus;
  percentComplete?: int32;
  details: Details;
  sibling: Sibling;
  request_token: string;
}

@@alternateType(JobState, ClientJobState, "python");

model Details {`,
      ),
    );
    const context = await createSdkContextForTester(program, {
      emitterName: "@azure-tools/typespec-python",
    });
    const method = context.sdkPackage.clients[0].methods.find((x) => x.name === "start");
    ok(method);
    strictEqual(method.kind, "lro");
    strictEqual(method.lroMetadata.pollingStep.responseBody?.name, "ClientJobState");
  });

  it("does not duplicate native diagnostics for an undecorated LRO", async () => {
    const { program } = await Tester.compile(`
model Status {
  @lroStatus status: LroStatus;
}
@useFinalStateVia("original-uri")
@route("/jobs")
@post
op start(): {
  @pollingLocation
  @header("Operation-Location")
  location: ResourceLocation<Status>;
};
`);
    await createSdkContextForTester(program);
    expect(
      program.diagnostics.filter(
        (x) => x.code === "@azure-tools/typespec-azure-core/no-operation-at-original-uri",
      ),
    ).toHaveLength(1);
  });

  it("carries status metadata through LRO and paging composition", async () => {
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
    expect(method.lroMetadata.statusMetadata?.map((x) => x.property.name)).toEqual([
      "percentComplete",
      "details",
      "requestToken",
    ]);
  });
});
