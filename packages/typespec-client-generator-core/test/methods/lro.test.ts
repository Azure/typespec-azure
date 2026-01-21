import { FinalStateValue } from "@azure-tools/typespec-azure-core";
import { deepStrictEqual, ok, strictEqual } from "assert";
import { assert, describe, it } from "vitest";
import { SdkClientType, SdkHttpOperation, UsageFlags } from "../../src/interfaces.js";
import { isAzureCoreModel } from "../../src/public-utils.js";
import { getAllModels } from "../../src/types.js";
import {
  ArmTester,
  AzureCoreBaseTester,
  AzureCoreTester,
  AzureCoreTesterWithService,
  createClientCustomizationInput,
  createSdkContextForTester,
} from "../tester.js";
import { hasFlag } from "../utils.js";

const LroVersionedServiceTester = AzureCoreTester.wrap(
  (x) => `
@service
@versioned(Versions)
namespace TestClient;
enum Versions {
  v1: "v1",
  v2: "v2",
}

alias ResourceOperations = global.Azure.Core.ResourceOperations<NoConditionalRequests &
  NoRepeatableRequests &
  NoClientRequestId>;
${x}
`,
);

const ArmVersionedServiceTester = ArmTester.wrap(
  (x) => `
@armProviderNamespace
@service
@versioned(Versions)
namespace TestClient;
enum Versions {
  @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
  v1: "v1",
}
${x}
`,
);

describe("data plane LRO templates", () => {
  /** https://github.com/Azure/cadl-ranch/blob/6272003539d6e7d16bacfd846090520d70279dbd/packages/cadl-ranch-specs/http/azure/core/lro/standard/main.tsp#L124 */
  describe("standard LRO template: Azure.Core.ResourceOperations", () => {
    it("LongRunningResourceCreateOrReplace", async () => {
      const { program } = await LroVersionedServiceTester.compile(`
        @resource("users")
        model User {
          @key
          @visibility(Lifecycle.Read)
          name: string;

          role: string;
        }

        op createOrReplace is ResourceOperations.LongRunningResourceCreateOrReplace<User>;
    `);
      const context = await createSdkContextForTester(program);
      const roundtripModel = context.sdkPackage.models.find((m) => m.name === "User");
      ok(roundtripModel);

      const methods = context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      const method = methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.name, "createOrReplace");
      assert.include(
        method.parameters.map((m) => m.type),
        roundtripModel,
      );
      const initialResponse = method.response.type;
      ok(initialResponse);
      strictEqual(initialResponse.kind, "model");
      assert.isTrue(
        hasFlag(initialResponse.usage, UsageFlags.LroInitial),
        "the response of a lro method should have the usage of LroInitial",
      );
      strictEqual(initialResponse.serializationOptions.json?.name, "User");

      const metadata = method.lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.originalUri);
      assert.isUndefined(metadata.finalStep);

      const pollingModel = context.sdkPackage.models.find((m) => m.name === "OperationStatusError");
      ok(pollingModel);
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroPolling),
        "polling model should have the usage of LroPolling",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Output),
        "polling model should not be output",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Input),
        "polling model should not be input",
      );
      strictEqual(pollingModel.serializationOptions.json?.name, "OperationStatus");
      strictEqual(metadata.pollingStep.responseBody, pollingModel);

      strictEqual(metadata.finalResponse?.envelopeResult, roundtripModel);
      strictEqual(metadata.finalResponse?.result, roundtripModel);
      assert.isTrue(
        hasFlag(roundtripModel.usage, UsageFlags.LroFinalEnvelope),
        "roundtrip model should have the usage of LroFinalEnvelope",
      );
      strictEqual(roundtripModel.serializationOptions.json?.name, "User");
      assert.isUndefined(metadata.finalResponse?.resultSegments);
    });

    it("LongRunningResourceDelete", async () => {
      const { program } = await LroVersionedServiceTester.compile(`
        @resource("users")
        model User {
          @key
          @visibility(Lifecycle.Read)
          name: string;

          role: string;
        }

        op delete is ResourceOperations.LongRunningResourceDelete<User>;
    `);
      const context = await createSdkContextForTester(program);
      const methods = context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      const method = methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.name, "delete");
      assert.notInclude(
        method.operation.parameters.map((m) => m.kind),
        "body",
      );

      const initialResponse = method.response.type;
      strictEqual(initialResponse, undefined);

      const metadata = method.lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
      strictEqual(metadata.finalStep?.kind, "noPollingResult");

      const pollingModel = context.sdkPackage.models.find((m) => m.name === "OperationStatusError");
      ok(pollingModel);
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroPolling),
        "polling model should have the usage of LroPolling",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Output),
        "polling model should not be output",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Input),
        "polling model should not be input",
      );
      strictEqual(metadata.pollingStep.responseBody, pollingModel);

      assert.isUndefined(metadata.finalResponse);
    });

    it("LongRunningResourceAction", async () => {
      const { program } = await LroVersionedServiceTester.compile(`
        @resource("users")
        model User {
          @key
          @visibility(Lifecycle.Read)
          name: string;

          role: string;
        }
        model UserExportParams {
          @query
          format: string;
        }
        model ExportedUser {
          name: string;

          resourceUri: string;
        }

        op export is ResourceOperations.LongRunningResourceAction<User, UserExportParams, ExportedUser>;
    `);
      const context = await createSdkContextForTester(program);
      const methods = context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      const method = methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.name, "export");
      assert.include(
        method.parameters.map((m) => m.name),
        "format",
      );

      const initialResponse = method.response.type;
      ok(initialResponse);
      strictEqual(initialResponse.kind, "model");
      assert.isTrue(
        hasFlag(initialResponse.usage, UsageFlags.LroInitial),
        "the response of a lro method should have the usage of LroInitial",
      );

      const metadata = method.lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
      strictEqual(metadata.finalStep?.kind, "pollingSuccessProperty");

      const pollingModel = context.sdkPackage.models.find(
        (m) => m.name === "OperationStatusExportedUserError",
      );
      ok(pollingModel);
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroPolling),
        "polling model should have the usage of LroPolling",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Output),
        "polling model should not be output",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Input),
        "polling model should not be input",
      );
      strictEqual(metadata.pollingStep.responseBody, pollingModel);

      const returnModel = context.sdkPackage.models.find((m) => m.name === "ExportedUser");
      ok(returnModel);

      strictEqual(metadata.finalResponse?.envelopeResult, pollingModel);
      strictEqual(metadata.finalResponse?.result, returnModel);
      // find the property
      const resultProperty = pollingModel.properties.find((p) => p.name === "result");
      ok(metadata.finalResponse?.resultSegments);
      strictEqual(metadata.finalResponse?.resultSegments[0], resultProperty);

      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroFinalEnvelope),
        "the polling model here is also the final envelope model, it should have the usage of LroFinalEnvelope",
      );
    });
  });

  describe("RPC LRO templates", () => {
    it("LongRunningRpcOperation", async () => {
      const { program } = await LroVersionedServiceTester.compile(`
        model GenerationOptions {
          @doc("Prompt.")
          prompt: string;
        }

        model GenerationResponse is global.Azure.Core.Foundations.OperationStatus<GenerationResult>;
        // fix warning in Azure.Core.Foundations.OperationStatus
        @@visibility(global.Azure.Core.Foundations.OperationStatus.id, Lifecycle.Read);

        model GenerationResult {
          @doc("The data.")
          data: string;
        }

        @route("/generations:submit")
        op longRunningRpc is global.Azure.Core.LongRunningRpcOperation<
          BodyParameter<GenerationOptions>,
          GenerationResponse,
          GenerationResult
        >;
        alias BodyParameter<T, TName extends valueof string = "body", TDoc extends valueof string = "The body parameter."> = {
          @doc(TDoc)
          @friendlyName(TName)
          @bodyRoot
          body: T;
        };
    `);
      const context = await createSdkContextForTester(program);
      const inputModel = context.sdkPackage.models.find((m) => m.name === "GenerationOptions");
      ok(inputModel);

      const methods = context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      const method = methods[0];
      strictEqual(method.kind, "lro");
      strictEqual(method.name, "longRunningRpc");
      assert.include(
        method.parameters.map((m) => m.type),
        inputModel,
      );

      const initialResponse = method.response.type;
      ok(initialResponse);
      strictEqual(initialResponse.kind, "model");
      assert.isTrue(
        hasFlag(initialResponse.usage, UsageFlags.LroInitial),
        "the response of a lro method should have the usage of LroInitial",
      );

      const metadata = method.lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
      strictEqual(metadata.finalStep?.kind, "pollingSuccessProperty");

      const pollingModel = context.sdkPackage.models.find(
        (m) => m.name === "OperationStatusGenerationResultError",
      );
      ok(pollingModel);
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroPolling),
        "polling model should have the usage of LroPolling",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Output),
        "polling model should not be output",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Input),
        "polling model should not be input",
      );
      strictEqual(metadata.pollingStep.responseBody, pollingModel);

      const returnModel = context.sdkPackage.models.find((m) => m.name === "GenerationResult");
      ok(returnModel);
      strictEqual(metadata.finalResponse?.envelopeResult, pollingModel);
      strictEqual(metadata.finalResponse?.result, returnModel);
      // find the property
      const resultProperty = pollingModel.properties.find((p) => p.name === "result");
      ok(metadata.finalResponse?.resultSegments);
      strictEqual(metadata.finalResponse?.resultSegments[0], resultProperty);
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroFinalEnvelope),
        "the polling model here is also the final envelope model, it should have the usage of LroFinalEnvelope",
      );
    });
  });
  describe("Custom LRO", () => {
    it("@lroResult with client name and/or encoded name", async () => {
      const { program } = await AzureCoreTesterWithService.compile(`
        op CustomLongRunningOperation<
          TParams extends TypeSpec.Reflection.Model,
          TResponse extends TypeSpec.Reflection.Model
        > is Foundations.Operation<
          TParams,
          AcceptedResponse & {
            @pollingLocation
            @header("Operation-Location")
            operationLocation: ResourceLocation<TResponse>;
          }
        >;

        @resource("resources")
        model Resource {
          @visibility(Lifecycle.Read)
          id: string;

          @key
          @visibility(Lifecycle.Read)
          name: string;

          description?: string;
          type: string;
        }

        // no "result" property
        model OperationDetails {
          @doc("Operation ID")
          @key
          @visibility(Lifecycle.Read, Lifecycle.Create)
          id: uuid;

          status: Azure.Core.Foundations.OperationState;
          error?: Azure.Core.Foundations.Error;

          @lroResult
          @clientName("longRunningResult")
          @encodedName("application/json", "lro_result")
          result?: Resource;
        }

        @doc("Response")
        @route("/response")
        interface ResponseOp {

          @route("/lro-result")
          lroInvalidResult is CustomLongRunningOperation<
            {
              @body request: Resource;
            },
            OperationDetails
          >;
        }
        `);
      const context = await createSdkContextForTester(program);
      const client = context.sdkPackage.clients[0];
      const resourceOpClient = client.children![0] as SdkClientType<SdkHttpOperation>;
      const lroMethod = resourceOpClient.methods[0];
      strictEqual(lroMethod.kind, "lro");
      const lroMetadata = lroMethod.lroMetadata;
      ok(lroMetadata);
      // find the model
      const envelopeResult = context.sdkPackage.models.find((m) => m.name === "OperationDetails");
      const resultProperty = envelopeResult?.properties.find((p) => p.name === "longRunningResult");
      ok(lroMetadata.finalResponse?.resultSegments);
      strictEqual(resultProperty, lroMetadata.finalResponse?.resultSegments[0]);
    });

    it("@pollingOperation", async () => {
      const { program } = await LroVersionedServiceTester.compile(`
        @resource("analyze/jobs")
        model JobState {
          @key
          @visibility(Lifecycle.Read)
          jobId: uuid;

          status: LroStatus;
        }
        
        @lroStatus
        union LroStatus {
          @lroSucceeded
          succeeded: "succeeded",
          @lroFailed
          failed: "failed",
          @lroCanceled
          canceled: "canceled",
        }

        model InputParams {
          @query
          format: string;
        }

        op getJobStatus is ResourceOperations.ResourceRead<JobState>;

        @route("/analyze")
        @pollingOperation(getJobStatus)
        op analyze is Azure.Core.Foundations.LongRunningOperation<
          InputParams,
          AcceptedResponse,
          {},
          {}
        >;
    `);
      const context = await createSdkContextForTester(program);
      const methods = context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 2);
      const method = methods.find((m) => m.name === "analyze");
      ok(method);
      strictEqual(method.kind, "lro");

      assert.include(
        method.parameters.map((m) => m.name),
        "format",
      );

      const initialResponse = method.response.type;
      assert.isUndefined(initialResponse);

      const metadata = method.lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
      strictEqual(metadata.finalStep?.kind, "noPollingResult");

      const pollingModel = context.sdkPackage.models.find((m) => m.name === "JobState");
      ok(pollingModel);
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroPolling),
        "polling model should have the usage of LroPolling",
      );
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.Output),
        "this polling model has output usage because there is a polling operation returning it",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Input),
        "polling model should not be input",
      );
      strictEqual(metadata.pollingStep.responseBody, pollingModel);

      assert.isUndefined(metadata.finalResponse);
    });

    it("@pollingLocation", async () => {
      const { program } = await LroVersionedServiceTester.compile(`
        @resource("analyze/jobs")
        model JobState {
          @key
          @visibility(Lifecycle.Read)
          jobId: uuid;

          status: LroStatus;
        }
        
        @lroStatus
        union LroStatus {
          @lroSucceeded
          succeeded: "succeeded",
          @lroFailed
          failed: "failed",
          @lroCanceled
          canceled: "canceled",
        }

        model InputParams {
          @query
          format: string;
        }

        op getJobStatus is ResourceOperations.ResourceRead<JobState>;

        @route("/analyze")
        @pollingOperation(getJobStatus)
        op analyze is Azure.Core.Foundations.LongRunningOperation<
          InputParams,
          AcceptedResponse & {
            @pollingLocation
            @header("Location")
            Location: ResourceLocation<JobState>;
          },
          {},
          {}
        >;
    `);
      const context = await createSdkContextForTester(program);
      const methods = context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 2);
      const method = methods.find((m) => m.name === "analyze");
      ok(method);
      strictEqual(method.kind, "lro");

      assert.include(
        method.parameters.map((m) => m.name),
        "format",
      );

      const initialResponse = method.response.type;
      assert.isUndefined(initialResponse);

      const metadata = method.lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.location);
      strictEqual(metadata.finalStep?.kind, "noPollingResult");

      const pollingModel = context.sdkPackage.models.find((m) => m.name === "JobState");
      ok(pollingModel);
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.LroPolling),
        "polling model should have the usage of LroPolling",
      );
      assert.isTrue(
        hasFlag(pollingModel.usage, UsageFlags.Output),
        "this polling model has output usage because there is a polling operation returning it",
      );
      assert.isFalse(
        hasFlag(pollingModel.usage, UsageFlags.Input),
        "polling model should not be input",
      );
      strictEqual(metadata.pollingStep.responseBody, pollingModel);

      assert.isUndefined(metadata.finalResponse);
    });
  });

  it("LRO defined in different namespace", async () => {
    const { program } = await AzureCoreTester.compile(`
      @service
      @versioned(Versions)
      namespace TestClient {
        enum Versions {
          v1: "v1",
                  v2: "v2",
        }
      
        alias ResourceOperations = global.Azure.Core.ResourceOperations<NoConditionalRequests &
          NoRepeatableRequests &
          NoClientRequestId>;

        model PollResponse {
          operationId: string;
          status: Azure.Core.Foundations.OperationState;
        }

        @pollingOperation(NonService.poll)
        @post
        @route("/post")
        op longRunning(): AcceptedResponse;
      }

      @useDependency(TestClient.Versions.v2)
      namespace NonService {
        @route("/poll")
        @get
        op poll(): TestClient.PollResponse;
      }`);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "longRunning");
    ok(method);
    strictEqual(method.kind, "lro");

    const initialResponse = method.response.type;
    assert.isUndefined(initialResponse);

    const metadata = method.lroMetadata;
    ok(metadata);
    const pollingModel = metadata.pollingStep.responseBody;
    ok(pollingModel);
    assert.isTrue(
      hasFlag(pollingModel.usage, UsageFlags.LroPolling),
      "polling model should have the usage of LroPolling",
    );
    assert.isFalse(
      hasFlag(pollingModel.usage, UsageFlags.Output),
      "polling model should not be output",
    );
    assert.isFalse(
      hasFlag(pollingModel.usage, UsageFlags.Input),
      "polling model should not be input",
    );
  });

  it("LRO final envelope result correctly marked when only used in ignored polling operation", async () => {
    const { program } = await AzureCoreBaseTester.compile(
      createClientCustomizationInput(
        `
@server("http://localhost:3000", "endpoint")
@service
namespace DocumentIntelligence;
  @lroStatus
  @doc("Operation status.")
  union DocumentIntelligenceOperationStatus {
    string,
    @doc("The operation has not started yet.")
    notStarted: "notStarted",
    @doc("The operation is in progress.")
    running: "running",
    @doc("The operation has failed.")
    @lroFailed
    failed: "failed",
    @doc("The operation has succeeded.")
    @lroSucceeded
    succeeded: "succeeded",
    @doc("The operation has been canceled.")
    @lroCanceled
    canceled: "canceled",
    @doc("The operation has been skipped.")
    @lroCanceled
    skipped: "skipped",
  }
  #suppress "@azure-tools/typespec-azure-core/long-running-polling-operation-required" "This is a template"
  op DocumentIntelligenceLongRunningOperation<
    TParams extends TypeSpec.Reflection.Model,
    TResponse extends TypeSpec.Reflection.Model
  > is Foundations.Operation<
    {
      ...TParams,
      @doc("Unique document model name.")
      @path
      @pattern("^[a-zA-Z0-9][a-zA-Z0-9._~-]{1,63}$")
      @maxLength(64)
      modelId: string;
    },
    AcceptedResponse &
      Foundations.RetryAfterHeader & {
        @pollingLocation
        @header("Operation-Location")
        operationLocation: ResourceLocation<TResponse>;
      },
    {},
    {}
  >;
  op DocumentIntelligenceOperation<
    TParams extends TypeSpec.Reflection.Model,
    TResponse extends TypeSpec.Reflection.Model & Foundations.RetryAfterHeader
  > is Foundations.Operation<
    TParams,
    TResponse,
    {},
    {}
  >;
  @doc("Document analysis result.")
  model AnalyzeResult {
    @doc("API version used to produce this result.")
    apiVersion: string;
    @doc("Document model ID used to produce this result.")
    @pattern("^[a-zA-Z0-9][a-zA-Z0-9._~-]{1,63}$")
    modelId: string;
  }
  @doc("Status and result of the analyze operation.")
  model AnalyzeOperation {
    @doc("Operation status.  notStarted, running, succeeded, or failed")
    status: DocumentIntelligenceOperationStatus;
    @doc("Date and time (UTC) when the analyze operation was submitted.")
    createdDateTime: utcDateTime;
    @doc("Date and time (UTC) when the status was last updated.")
    lastUpdatedDateTime: utcDateTime;
    @doc("Encountered error during document analysis.")
    error?: {};
    @lroResult
    @doc("Document analysis result.")
    analyzeResult?: AnalyzeResult;
  }
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Doesn't fit standard ops"
  @doc("Analyzes document with document model.")
  @post
  @pollingOperation(getAnalyzeResult)
  @sharedRoute
  @route("/documentModels/{modelId}:analyze")
  op analyzeDocument is DocumentIntelligenceLongRunningOperation<
    {
      @doc("Input content type.")
      @header
      contentType: "application/json";
      @doc("Analyze request parameters.")
      @bodyRoot
      @clientName("body", "python")
      analyzeRequest?: {};
    },
    AnalyzeOperation
  >;
  #suppress "@azure-tools/typespec-azure-core/use-standard-operations" "Doesn't fit standard ops"
  @doc("Gets the result of document analysis.")
  @route("/documentModels/{modelId}/analyzeResults/{resultId}")
  @get
  op getAnalyzeResult is DocumentIntelligenceOperation<
    {
      @doc("Unique document model name.")
      @path
      @pattern("^[a-zA-Z0-9][a-zA-Z0-9._~-]{1,63}$")
      @maxLength(64)
      modelId: string;
      @doc("Analyze operation result ID.")
      @path
      resultId: uuid;
    },
    AnalyzeOperation
  >;
      `,
        `
namespace ClientCustomizations;
@client({
  name: "DocumentIntelligenceClient",
  service: DocumentIntelligence,
})
interface DocumentIntelligenceClient {
  analyzeDocument is DocumentIntelligence.analyzeDocument;
}
      `,
        ["@azure-tools/typespec-azure-core"],
        ["Azure.Core", "Azure.Core.Traits"],
      ),
    );
    const context = await createSdkContextForTester(program);
    const models = context.sdkPackage.models;
    strictEqual(models.length, 4);
    const analyzeOperationModel = models.find((m) => m.name === "AnalyzeOperation");
    ok(analyzeOperationModel);
    const analyzeResultProp = analyzeOperationModel.properties.find(
      (p) => p.name === "analyzeResult",
    );
    ok(analyzeResultProp);
    const analyzeResultModel = models.find((m) => m.name === "AnalyzeResult");
    strictEqual(analyzeResultProp.type, analyzeResultModel);
    ok(analyzeResultModel);
    strictEqual(analyzeOperationModel.usage, UsageFlags.LroFinalEnvelope | UsageFlags.LroPolling);
    const analyzeDocument = context.sdkPackage.clients[0].methods[0];
    strictEqual(analyzeDocument.kind, "lro");
    const lroMetadata = analyzeDocument.lroMetadata;
    strictEqual(lroMetadata.envelopeResult, analyzeOperationModel);
    strictEqual(lroMetadata.finalEnvelopeResult, analyzeOperationModel);
    const finalResponse = lroMetadata.finalResponse;
    ok(finalResponse);
    strictEqual(finalResponse.envelopeResult, analyzeOperationModel);
    strictEqual(finalResponse.result, analyzeResultModel);
    strictEqual(finalResponse.resultSegments?.length, 1);
    strictEqual(finalResponse.resultSegments[0], analyzeResultProp);
    strictEqual(lroMetadata.finalResultPath, "analyzeResult");
    strictEqual(lroMetadata.finalStateVia, FinalStateValue.operationLocation);
    const finalStep = lroMetadata.finalStep;
    ok(finalStep);
    strictEqual(finalStep.kind, "pollingSuccessProperty");
    strictEqual(finalStep.responseModel, analyzeResultModel);
    strictEqual(finalStep.sourceProperty, analyzeResultProp);
    strictEqual(finalStep.target, analyzeResultProp);
    strictEqual(lroMetadata.logicalPath, "analyzeResult");
    strictEqual(lroMetadata.logicalResult, analyzeResultModel);
    const operation = lroMetadata.operation;
    strictEqual(operation.kind, "http");
    strictEqual(operation.path, "/documentModels/{modelId}:analyze");
    ok(operation.bodyParam);
    strictEqual(operation.verb, "post");
    const pollingInfo = lroMetadata.pollingInfo;
    strictEqual(pollingInfo.kind, "pollingOperationStep");
    strictEqual(pollingInfo.responseModel, analyzeOperationModel);
    strictEqual(pollingInfo.resultProperty, analyzeResultProp);
    strictEqual(
      pollingInfo.errorProperty,
      analyzeOperationModel.properties.find((p) => p.name === "error"),
    );
    const terminationStatus = pollingInfo.terminationStatus;
    strictEqual(terminationStatus.kind, "model-property");
    deepStrictEqual(terminationStatus.canceledState, ["canceled", "skipped"]);
    deepStrictEqual(terminationStatus.failedState, ["failed"]);
    deepStrictEqual(terminationStatus.succeededState, ["succeeded"]);
    strictEqual(
      terminationStatus.property,
      analyzeOperationModel.properties.find((p) => p.name === "status"),
    );
    strictEqual(lroMetadata.pollingStep.responseBody, analyzeOperationModel);
  });

  // https://github.com/Azure/typespec-azure/issues/2325
  it("LroMetadata synthetic anonymous ResourceOperationStatus", async () => {
    const { program } = await LroVersionedServiceTester.compile(`
      alias ServiceTraits = NoRepeatableRequests &
        NoConditionalRequests &
        NoClientRequestId;

      alias apiOperations = Azure.Core.ResourceOperations<ServiceTraits>;

      @doc("Create an instruction.")
      @pollingOperation(
        OperationProgress.getOperationResult
      )
      op update is apiOperations.LongRunningResourceCreateOrUpdate<Instruction>;

      @resource("instruction")
      model Instruction {
        @key
        @visibility(Lifecycle.Read)
        id: string;

        @visibility(Lifecycle.Update)
        instructionId: string;
      }

      @doc("Operation Response Model")
      @resource("operation")
      model OperationResultQuery {
        @doc("The operation status.")
        @visibility(Lifecycle.Read)
        status: Foundations.OperationState;

        @doc("The operation id.")
        @key("operationId")
        @visibility(Lifecycle.Read)
        operationId: string;

        @doc("The error message.")
        @visibility(Lifecycle.Read)
        errorMessage: string[];
      }

      model UpdateFinalResult {
        id2: string;
      }

      @doc("Get operation progress")
      interface OperationProgress {
        @doc("Get operation progress")
        getOperationResult is apiOperations.ResourceRead<OperationResultQuery>;
      }
    `);
    const context = await createSdkContextForTester(program);
    const method = context.sdkPackage.clients[0].methods.find((m) => m.name === "update");
    assert.exists(method);
    strictEqual(method.kind, "lro");
    const response = method.response.type;
    assert.strictEqual(response?.kind, "model");
    if (!response || response.kind !== "model") {
      assert.fail("Expected final response to be a model.");
    }
    assert.isTrue(response.isGeneratedName);
    const generatedName = response.name;
    // duplicate with existing model named "UpdateFinalResult" so the generated name will be "UpdateFinalResult1"
    assert.strictEqual("UpdateFinalResult1", generatedName);
    const crossLanguageId = response.crossLanguageDefinitionId;
    assert.isFalse(crossLanguageId.includes(".."));
    const lroMetadata = method.lroMetadata;
    assert.exists(lroMetadata);
    const finalResponse = lroMetadata.finalResponse;
    assert.exists(finalResponse);
    const finalResult = finalResponse.result;
    assert.exists(finalResult);
    assert.strictEqual(finalResult.name, "UpdateFinalResult1");
  });
});

describe("Arm LRO templates", () => {
  it("ArmResourceCreateOrReplaceAsync", async () => {
    const { program } = await ArmVersionedServiceTester.compile(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      model EmployeeProperties {
        age?: int32;
      }

      op createOrReplace is ArmResourceCreateOrReplaceAsync<Employee>;
  `);
    const context = await createSdkContextForTester(program);
    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);
    const method = methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.name, "createOrReplace");
    assert.include(
      method.parameters.map((m) => m.name),
      "employeeName",
    );
    assert.include(
      method.parameters.map((m) => m.name),
      "resource",
    );

    const initialResponse = method.response.type;
    ok(initialResponse);
    strictEqual(initialResponse.kind, "model");
    assert.isTrue(
      hasFlag(initialResponse.usage, UsageFlags.LroInitial),
      "the response of a lro method should have the usage of LroInitial",
    );

    const roundtripModel = context.sdkPackage.models.find((m) => m.name === "Employee");
    ok(roundtripModel);
    strictEqual(
      initialResponse,
      roundtripModel,
      "in this case the initial response is the same as the final",
    );
    assert.include(
      method.parameters.map((m) => m.type),
      roundtripModel,
    );
    // validate the model should be roundtrip here
    assert.isTrue(
      hasFlag(roundtripModel.usage, UsageFlags.Input | UsageFlags.Output),
      "model should be input and output",
    );
    strictEqual(roundtripModel.serializationOptions.json?.name, "Employee");

    const metadata = method.lroMetadata;
    ok(metadata);
    strictEqual(metadata.finalStateVia, FinalStateValue.azureAsyncOperation);
    strictEqual(metadata.finalStep?.kind, "finalOperationLink");

    // ARM LRO core types are different
    const pollingModel = context.sdkPackage.models.find(
      (m) => m.name === "ArmOperationStatusResourceProvisioningState",
    );
    ok(pollingModel);
    strictEqual(metadata.pollingStep.responseBody, pollingModel);
    assert.isTrue(
      hasFlag(pollingModel.usage, UsageFlags.LroPolling),
      "polling model should have the usage of LroPolling",
    );

    strictEqual(metadata.finalResponse?.envelopeResult, roundtripModel);
    strictEqual(metadata.finalResponse?.result, roundtripModel);
    assert.isUndefined(metadata.finalResponse.resultSegments);
  });

  it("ArmResourceDeleteWithoutOkAsync", async () => {
    const { program } = await ArmVersionedServiceTester.compile(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      model EmployeeProperties {
        age?: int32;
      }

      op delete is ArmResourceDeleteWithoutOkAsync<Employee>;
    `);
    const context = await createSdkContextForTester(program);
    const roundtripModel = context.sdkPackage.models.find((m) => m.name === "Employee");
    assert.isUndefined(roundtripModel);
    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);
    const method = methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.name, "delete");
    assert.include(
      method.parameters.map((m) => m.name),
      "employeeName",
    );
    assert.notInclude(
      method.parameters.map((m) => m.name),
      "resource",
    );

    const initialResponse = method.response.type;
    assert.isUndefined(initialResponse);

    const metadata = method.lroMetadata;
    ok(metadata);
    strictEqual(metadata.finalStateVia, FinalStateValue.location);
    strictEqual(metadata.finalStep?.kind, "finalOperationLink");

    // ARM LRO core types are different
    const pollingModel = context.sdkPackage.models.find(
      (m) => m.name === "ArmOperationStatusResourceProvisioningState",
    );
    ok(pollingModel);
    strictEqual(metadata.pollingStep.responseBody, pollingModel);
    assert.isTrue(
      hasFlag(pollingModel.usage, UsageFlags.LroPolling),
      "polling model should have the usage of LroPolling",
    );
    assert.isFalse(
      hasFlag(pollingModel.usage, UsageFlags.Output),
      "polling model should not be output",
    );
    assert.isFalse(
      hasFlag(pollingModel.usage, UsageFlags.Input),
      "polling model should not be input",
    );

    assert.isUndefined(metadata.finalResponse);
  });

  it("ArmResourceActionAsync", async () => {
    const { program } = await ArmVersionedServiceTester.compile(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }

      model EmployeeProperties {
        /** Age of employee */
        age?: int32;
      }

      op actionAsync is ArmResourceActionAsync<Employee, void, void>;
  `);
    const context = await createSdkContextForTester(program);
    const methods = context.sdkPackage.clients[0].methods;
    strictEqual(methods.length, 1);
    const method = methods[0];
    strictEqual(method.kind, "lro");
    strictEqual(method.name, "actionAsync");
    assert.include(
      method.parameters.map((m) => m.name),
      "employeeName",
    );

    const initialResponse = method.response.type;
    assert.isUndefined(initialResponse);

    const metadata = method.lroMetadata;
    ok(metadata);
    strictEqual(metadata.finalStateVia, FinalStateValue.location);
    strictEqual(metadata.finalStep?.kind, "finalOperationLink");

    // ARM LRO core types are different
    const pollingModel = context.sdkPackage.models.find(
      (m) => m.name === "ArmOperationStatusResourceProvisioningState",
    );
    ok(pollingModel);
    strictEqual(metadata.pollingStep.responseBody, pollingModel);
    assert.isTrue(
      hasFlag(pollingModel.usage, UsageFlags.LroPolling),
      "polling model should have the usage of LroPolling",
    );
    assert.isFalse(
      hasFlag(pollingModel.usage, UsageFlags.Output),
      "polling model should not be output",
    );
    assert.isFalse(
      hasFlag(pollingModel.usage, UsageFlags.Input),
      "polling model should not be input",
    );
    strictEqual(
      metadata.pollingStep.responseBody?.name,
      "ArmOperationStatusResourceProvisioningState",
    );

    assert.isUndefined(metadata.finalResponse);
  });
});
it("customized lro delete", async () => {
  const { program } = await AzureCoreTester.compile(`
    @versioned(MyVersions)
    @server("http://localhost:3000", "endpoint")
    @service
    namespace My.Service;

    enum MyVersions {
      v1: "v1",
    }

    op delete(): {
      ...AcceptedResponse,
      @header("Location")
      @Azure.Core.pollingLocation(Azure.Core.StatusMonitorPollingOptions<ArmOperationStatus>)
      @Azure.Core.finalLocation(void)
      location?: string;
    };

    @Azure.Core.lroStatus
    union ResourceProvisioningState {
      Succeeded: "Succeeded",
      Failed: "Failed",
      Canceled: "Canceled",
      string,
    }

    model ArmOperationStatus {
      @Azure.Core.lroStatus
      status: ResourceProvisioningState;
      @key
      @path
      @segment("operationStatuses")
      id: Azure.Core.uuid;
      @visibility(Lifecycle.Read)
      name?: string;
    }
  `);
  const context = await createSdkContextForTester(program);
  const sdkPackage = context.sdkPackage;
  strictEqual(sdkPackage.models.length, 1);
  strictEqual(sdkPackage.enums.length, 2);
});
describe("getLroMetadata", () => {
  const lroCode = `
    @versioned(Versions)
    @service(#{title: "Test Service"})
    namespace TestService;
    alias ResourceOperations = Azure.Core.ResourceOperations<NoConditionalRequests &
    NoRepeatableRequests &
    NoClientRequestId>;

    @doc("The API version.")
    enum Versions {
      @doc("The 2022-12-01-preview version.")
          v2022_12_01_preview: "2022-12-01-preview",
    }

    @resource("users")
    @doc("Details about a user.")
    model User {
    @key
    @visibility(Lifecycle.Read)
    @doc("The name of user.")
    name: string;

    @doc("The role of user")
    role: string;
    }

    @doc("The parameters for exporting a user.")
    model UserExportParams {
    @query
    @doc("The format of the data.")
    format: string;
    }

    @doc("The exported user data.")
    model ExportedUser {
    @doc("The name of user.")
    name: string;

    @doc("The exported URI.")
    resourceUri: string;
    }

    op export is ResourceOperations.LongRunningResourceAction<User, UserExportParams, ExportedUser>;
  `;
  it("filter-out-core-models true", async () => {
    const { program } = await AzureCoreTester.compile(lroCode);
    const context = await createSdkContextForTester(program);
    const models = context.sdkPackage.models.filter((x) => !isAzureCoreModel(x));
    strictEqual(models.length, 1);
    deepStrictEqual(models[0].name, "ExportedUser");
  });
  it("filter-out-core-models false", async () => {
    const { program } = await AzureCoreTester.compile(lroCode);
    const context = await createSdkContextForTester(program);
    const models = getAllModels(context);
    strictEqual(models.length, 8);
    // there should only be one non-core model
    deepStrictEqual(
      models.map((x) => x.name).sort(),
      [
        "ResourceOperationStatusUserExportedUserError",
        "OperationState",
        "Error",
        "InnerError",
        "ExportedUser",
        "ErrorResponse",
        "OperationStatusExportedUserError",
        "Versions",
      ].sort(),
    );
  });
});

it("versioned LRO with customization", async () => {
  const { program } = await AzureCoreBaseTester.compile(
    createClientCustomizationInput(
      `
@service
@versioned(Versions)
namespace TestService;

enum Versions {
  v1,
  v2,
}

alias TestOperations = ResourceOperations<NoConditionalRequests & NoClientRequestId & NoRepeatableRequests>;

@resource("id")
model TestResult {
  @key
  id: string;

  @lroStatus
  status: JobStatus;
}

@lroStatus
union JobStatus {
  string,
  NotStarted: "notStarted",
  Running: "running",

  @lroSucceeded
  Succeeded: "succeeded",

  @lroFailed
  Failed: "failed",

  Canceled: "canceled",
}

@get
op get is TestOperations.ResourceRead<TestResult>;

@pollingOperation(get)
op create is TestOperations.LongRunningResourceCreateOrReplace<TestResult>;
    `,
      `
@client({
  service: TestService,
})
namespace TestClient;

op test is TestService.create;
    `,
      ["@azure-tools/typespec-azure-core"],
      ["Azure.Core", "Azure.Core.Traits"],
    ),
  );
  const context = await createSdkContextForTester(program);
  strictEqual(context.diagnostics.length, 0);
  const client = context.sdkPackage.clients[0];
  strictEqual(client.methods.length, 1);
  const method = client.methods[0];
  strictEqual(method.name, "test");
  strictEqual(method.kind, "lro");
  const lroMetadata = method.lroMetadata;
  ok(lroMetadata);
});
