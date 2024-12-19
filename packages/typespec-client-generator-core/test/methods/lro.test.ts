import { FinalStateValue } from "@azure-tools/typespec-azure-core";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { ok, strictEqual } from "assert";
import { assert, beforeEach, describe, it } from "vitest";
import { UsageFlags } from "../../src/interfaces.js";
import { createSdkTestRunner, hasFlag, SdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: long running operation metadata", () => {
  let runner: SdkTestRunner;

  describe("data plane LRO templates", () => {
    beforeEach(async () => {
      runner = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
      });
      const baseCompile = runner.compile;
      runner.compileWithVersionedService = async function (code) {
        return await baseCompile(
          `
        @service({})
        @versioned(Versions)
        namespace TestClient;
        enum Versions {
          @useDependency(Azure.Core.Versions.v1_0_Preview_1)
          v1: "v1",
          @useDependency(Azure.Core.Versions.v1_0_Preview_2)
          v2: "v2",
        }
      
        alias ResourceOperations = global.Azure.Core.ResourceOperations<NoConditionalRequests &
          NoRepeatableRequests &
          NoClientRequestId>;
        ${code}`,
          {
            noEmit: true,
          },
        );
      };
    });

    /** https://github.com/Azure/cadl-ranch/blob/6272003539d6e7d16bacfd846090520d70279dbd/packages/cadl-ranch-specs/http/azure/core/lro/standard/main.tsp#L124 */
    describe("standard LRO template: Azure.Core.ResourceOperations", () => {
      it("LongRunningResourceCreateOrReplace", async () => {
        await runner.compileWithVersionedService(`
        @resource("users")
        model User {
          @key
          @visibility("read")
          name: string;

          role: string;
        }

        op createOrReplace is ResourceOperations.LongRunningResourceCreateOrReplace<User>;
    `);

        const roundtripModel = runner.context.sdkPackage.models.find((m) => m.name === "User");
        ok(roundtripModel);

        const methods = runner.context.sdkPackage.clients[0].methods;
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

        const metadata = method.lroMetadata;
        ok(metadata);
        strictEqual(metadata.finalStateVia, FinalStateValue.originalUri);
        assert.isUndefined(metadata.finalStep);

        const pollingModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "OperationStatusError",
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

        strictEqual(metadata.finalResponse?.envelopeResult, roundtripModel);
        strictEqual(metadata.finalResponse?.result, roundtripModel);
        assert.isTrue(
          hasFlag(roundtripModel.usage, UsageFlags.LroFinalEnvelope),
          "roundtrip model should have the usage of LroFinalEnvelope",
        );
        assert.isUndefined(metadata.finalResponse?.resultPath);
      });

      it("LongRunningResourceDelete", async () => {
        await runner.compileWithVersionedService(`
        @resource("users")
        model User {
          @key
          @visibility("read")
          name: string;

          role: string;
        }

        op delete is ResourceOperations.LongRunningResourceDelete<User>;
    `);

        const methods = runner.context.sdkPackage.clients[0].methods;
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

        const pollingModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "OperationStatusError",
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

        assert.isUndefined(metadata.finalResponse);
      });

      it("LongRunningResourceAction", async () => {
        await runner.compileWithVersionedService(`
        @resource("users")
        model User {
          @key
          @visibility("read")
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

        const methods = runner.context.sdkPackage.clients[0].methods;
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

        const pollingModel = runner.context.sdkPackage.models.find(
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

        const returnModel = runner.context.sdkPackage.models.find((m) => m.name === "ExportedUser");
        ok(returnModel);

        strictEqual(metadata.finalResponse?.envelopeResult, pollingModel);
        strictEqual(metadata.finalResponse?.result, returnModel);
        strictEqual(metadata.finalResponse?.resultPath, "result");
        assert.isTrue(
          hasFlag(pollingModel.usage, UsageFlags.LroFinalEnvelope),
          "the polling model here is also the final envelope model, it should have the usage of LroFinalEnvelope",
        );
      });
    });

    describe("RPC LRO templates", () => {
      it("LongRunningRpcOperation", async () => {
        await runner.compileWithVersionedService(`
        model GenerationOptions {
          @doc("Prompt.")
          prompt: string;
        }

        model GenerationResponse is global.Azure.Core.Foundations.OperationStatus<GenerationResult>;
        // fix warning in Azure.Core.Foundations.OperationStatus
        @@visibility(global.Azure.Core.Foundations.OperationStatus.id, "read");

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

        const inputModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "GenerationOptions",
        );
        ok(inputModel);

        const methods = runner.context.sdkPackage.clients[0].methods;
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

        const pollingModel = runner.context.sdkPackage.models.find(
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

        const returnModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "GenerationResult",
        );
        ok(returnModel);
        strictEqual(metadata.finalResponse?.envelopeResult, pollingModel);
        strictEqual(metadata.finalResponse?.result, returnModel);
        strictEqual(metadata.finalResponse?.resultPath, "result");
        assert.isTrue(
          hasFlag(pollingModel.usage, UsageFlags.LroFinalEnvelope),
          "the polling model here is also the final envelope model, it should have the usage of LroFinalEnvelope",
        );
      });
    });
    describe("Custom LRO", () => {
      it("@pollingOperation", async () => {
        await runner.compileWithVersionedService(`
        @resource("analyze/jobs")
        model JobState {
          @key
          @visibility("read")
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

        const methods = runner.context.sdkPackage.clients[0].methods;
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

        const pollingModel = runner.context.sdkPackage.models.find((m) => m.name === "JobState");
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
        await runner.compileWithVersionedService(`
        @resource("analyze/jobs")
        model JobState {
          @key
          @visibility("read")
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

        const methods = runner.context.sdkPackage.clients[0].methods;
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

        const pollingModel = runner.context.sdkPackage.models.find((m) => m.name === "JobState");
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
      await runner.compile(`
        @service({})
        @versioned(Versions)
        namespace TestClient {
          enum Versions {
            @useDependency(Azure.Core.Versions.v1_0_Preview_1)
            v1: "v1",
            @useDependency(Azure.Core.Versions.v1_0_Preview_2)
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

        @useDependency(Azure.Core.Versions.v1_0_Preview_2, TestClient.Versions.v2)
        namespace NonService {
          @route("/poll")
          @get
          op poll(): TestClient.PollResponse;
        }`);
      const method = runner.context.sdkPackage.clients[0].methods.find(
        (m) => m.name === "longRunning",
      );
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
      const runnerWithCore = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        emitterName: "@azure-tools/typespec-java",
      });
      await runnerWithCore.compileWithCustomization(
        `
        @useDependency(Versions.v1_0_Preview_2)
        @server("http://localhost:3000", "endpoint")
        @service()
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
      );
      const models = runnerWithCore.context.sdkPackage.models;
      strictEqual(models.length, 4);
      const analyzeOperationModel = models.find((m) => m.name === "AnalyzeOperation");
      ok(analyzeOperationModel);
      strictEqual(analyzeOperationModel.usage, UsageFlags.LroFinalEnvelope | UsageFlags.LroPolling);
    });
  });

  describe("Arm LRO templates", () => {
    beforeEach(async () => {
      runner = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary, AzureResourceManagerTestLibrary, OpenAPITestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits", "Azure.ResourceManager"],
      });
      const baseCompile = runner.compile;
      runner.compileWithVersionedService = async function (code) {
        return await baseCompile(
          `
        @armProviderNamespace
        @service({})
        @versioned(Versions)
        namespace TestClient;
        enum Versions {
          @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
          @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
          v1: "v1",
        }
        ${code}`,
          {
            noEmit: true,
          },
        );
      };
    });

    it("ArmResourceCreateOrReplaceAsync", async () => {
      await runner.compileWithVersionedService(`
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }

        model EmployeeProperties {
          age?: int32;
        }

        op createOrReplace is ArmResourceCreateOrReplaceAsync<Employee>;
    `);
      const methods = runner.context.sdkPackage.clients[0].methods;
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

      const roundtripModel = runner.context.sdkPackage.models.find((m) => m.name === "Employee");
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

      const metadata = method.lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.azureAsyncOperation);
      strictEqual(metadata.finalStep?.kind, "finalOperationLink");

      // ARM LRO core types are different
      const pollingModel = runner.context.sdkPackage.models.find(
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
      assert.isUndefined(metadata.finalResponse.resultPath);
    });

    it("ArmResourceDeleteWithoutOkAsync", async () => {
      await runner.compileWithVersionedService(`
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }

        model EmployeeProperties {
          age?: int32;
        }

        op delete is ArmResourceDeleteWithoutOkAsync<Employee>;
    `);
      const roundtripModel = runner.context.sdkPackage.models.find((m) => m.name === "Employee");
      assert.isUndefined(roundtripModel);
      const methods = runner.context.sdkPackage.clients[0].methods;
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
      const pollingModel = runner.context.sdkPackage.models.find(
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
      await runner.compileWithVersionedService(`
        model Employee is TrackedResource<EmployeeProperties> {
          ...ResourceNameParameter<Employee>;
        }

        model EmployeeProperties {
          /** Age of employee */
          age?: int32;
        }

        op actionAsync is ArmResourceActionAsync<Employee, void, void>;
    `);
      const methods = runner.context.sdkPackage.clients[0].methods;
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
      const pollingModel = runner.context.sdkPackage.models.find(
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
});