import { FinalStateValue } from "@azure-tools/typespec-azure-core";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { ok, strictEqual } from "assert";
import { assert, beforeEach, describe, it } from "vitest";
import { SdkHttpOperation, SdkLroServiceMethod } from "../../src/interfaces.js";
import { createSdkTestRunner, SdkTestRunner } from "../test-host.js";

describe("typespec-client-generator-core: long running operation metadata", () => {
  let runner: SdkTestRunner;

  describe("data plane LRO templates", () => {
    beforeEach(async () => {
      runner = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits"],
        "filter-out-core-models": false, // need to check some Azure.Core models
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
          }
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
          roundtripModel
        );

        const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
        ok(metadata);
        strictEqual(metadata.finalStateVia, FinalStateValue.originalUri);
        assert.isUndefined(metadata.finalStep);

        const pollingModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "OperationStatusError"
        );
        ok(pollingModel);
        strictEqual(metadata.pollingStep.responseBody, pollingModel);

        strictEqual(metadata.finalResponse?.envelopeResult, roundtripModel);
        strictEqual(metadata.finalResponse?.result, roundtripModel);
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
        const lroMethod = method as SdkLroServiceMethod<SdkHttpOperation>;
        assert.notInclude(
          lroMethod.operation.parameters.map((m) => m.kind),
          "body"
        );

        const metadata = lroMethod.lroMetadata;
        ok(metadata);
        strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
        strictEqual(metadata.finalStep?.kind, "noPollingResult");

        const pollingModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "OperationStatusError"
        );
        ok(pollingModel);
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
          "format"
        );

        const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
        ok(metadata);
        strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
        strictEqual(metadata.finalStep?.kind, "pollingSuccessProperty");

        const pollingModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "OperationStatusExportedUserError"
        );
        ok(pollingModel);
        strictEqual(metadata.pollingStep.responseBody, pollingModel);

        const returnModel = runner.context.sdkPackage.models.find((m) => m.name === "ExportedUser");
        ok(returnModel);

        strictEqual(metadata.finalResponse?.envelopeResult, pollingModel);
        strictEqual(metadata.finalResponse?.result, returnModel);
        strictEqual(metadata.finalResponse?.resultPath, "result");
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
          (m) => m.name === "GenerationOptions"
        );
        ok(inputModel);

        const methods = runner.context.sdkPackage.clients[0].methods;
        strictEqual(methods.length, 1);
        const method = methods[0];
        strictEqual(method.kind, "lro");
        strictEqual(method.name, "longRunningRpc");
        assert.include(
          method.parameters.map((m) => m.type),
          inputModel
        );

        const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
        ok(metadata);
        strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
        strictEqual(metadata.finalStep?.kind, "pollingSuccessProperty");

        const pollingModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "OperationStatusGenerationResultError"
        );
        ok(pollingModel);
        strictEqual(metadata.pollingStep.responseBody, pollingModel);

        const returnModel = runner.context.sdkPackage.models.find(
          (m) => m.name === "GenerationResult"
        );
        ok(returnModel);
        strictEqual(metadata.finalResponse?.envelopeResult, pollingModel);
        strictEqual(metadata.finalResponse?.result, returnModel);
        strictEqual(metadata.finalResponse?.resultPath, "result");
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

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations"
        op getJobStatus is ResourceOperations.ResourceRead<JobState>;

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations"
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
          "format"
        );

        const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
        ok(metadata);
        strictEqual(metadata.finalStateVia, FinalStateValue.operationLocation);
        strictEqual(metadata.finalStep?.kind, "noPollingResult");

        const pollingModel = runner.context.sdkPackage.models.find((m) => m.name === "JobState");
        ok(pollingModel);
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

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations"
        op getJobStatus is ResourceOperations.ResourceRead<JobState>;

        #suppress "@azure-tools/typespec-azure-core/use-standard-operations"
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
          "format"
        );

        const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
        ok(metadata);
        strictEqual(metadata.finalStateVia, FinalStateValue.location);
        strictEqual(metadata.finalStep?.kind, "noPollingResult");

        const pollingModel = runner.context.sdkPackage.models.find((m) => m.name === "JobState");
        ok(pollingModel);
        strictEqual(metadata.pollingStep.responseBody, pollingModel);

        assert.isUndefined(metadata.finalResponse);
      });
    });
  });

  describe("Arm LRO templates", () => {
    beforeEach(async () => {
      runner = await createSdkTestRunner({
        librariesToAdd: [AzureCoreTestLibrary, AzureResourceManagerTestLibrary, OpenAPITestLibrary],
        autoUsings: ["Azure.Core", "Azure.Core.Traits", "Azure.ResourceManager"],
        "filter-out-core-models": false, // need to check some Azure.Core models
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
          }
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

        #suppress "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
        op createOrReplace is ArmResourceCreateOrReplaceAsync<Employee>;
    `);
      const methods = runner.context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      const method = methods[0];
      strictEqual(method.name, "createOrReplace");
      assert.include(
        method.parameters.map((m) => m.name),
        "employeeName"
      );
      assert.include(
        method.parameters.map((m) => m.name),
        "resource"
      );
      const roundtripModel = runner.context.sdkPackage.models.find((m) => m.name === "Employee");
      ok(roundtripModel);
      assert.include(
        method.parameters.map((m) => m.type),
        roundtripModel
      );

      const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.azureAsyncOperation);
      strictEqual(metadata.finalStep?.kind, "finalOperationLink");

      // ARM LRO core types are different
      // const pollingModel = runner.context.sdkPackage.models.find(
      //   (m) => m.name === "ArmOperationStatusResourceProvisioningState"
      // );
      // ok(pollingModel);
      // strictEqual(metadata.pollingStep.responseBody, pollingModel);
      // TODO: TCGC bug to not include polling model https://github.com/Azure/typespec-azure/issues/1530
      strictEqual(
        metadata.pollingStep.responseBody?.name,
        "ArmOperationStatusResourceProvisioningState"
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

        #suppress "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
        op delete is ArmResourceDeleteWithoutOkAsync<Employee>;
    `);
      const roundtripModel = runner.context.sdkPackage.models.find((m) => m.name === "Employee");
      assert.isUndefined(roundtripModel);
      const methods = runner.context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      const method = methods[0];
      strictEqual(method.name, "delete");
      assert.include(
        method.parameters.map((m) => m.name),
        "employeeName"
      );
      assert.notInclude(
        method.parameters.map((m) => m.name),
        "resource"
      );

      const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.location);
      strictEqual(metadata.finalStep?.kind, "finalOperationLink");

      // ARM LRO core types are different
      // const pollingModel = runner.context.sdkPackage.models.find(
      //   (m) => m.name === "ArmOperationStatusResourceProvisioningState"
      // );
      // ok(pollingModel);
      // strictEqual(metadata.pollingStep.responseBody, pollingModel);
      // TODO: TCGC bug to not include polling model
      strictEqual(
        metadata.pollingStep.responseBody?.name,
        "ArmOperationStatusResourceProvisioningState"
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

        #suppress "@azure-tools/typespec-azure-resource-manager/arm-post-operation-response-codes"
        op actionAsync is ArmResourceActionAsync<Employee, void, void>;
    `);
      const methods = runner.context.sdkPackage.clients[0].methods;
      strictEqual(methods.length, 1);
      const method = methods[0];
      strictEqual(method.name, "actionAsync");
      assert.include(
        method.parameters.map((m) => m.name),
        "employeeName"
      );

      const metadata = (method as SdkLroServiceMethod<SdkHttpOperation>).lroMetadata;
      ok(metadata);
      strictEqual(metadata.finalStateVia, FinalStateValue.location);
      strictEqual(metadata.finalStep?.kind, "finalOperationLink");

      // ARM LRO core types are different
      // const pollingModel = runner.context.sdkPackage.models.find(
      //   (m) => m.name === "ArmOperationStatusResourceProvisioningState"
      // );
      // ok(pollingModel);
      // strictEqual(metadata.pollingStep.responseBody, pollingModel);
      // TODO: TCGC bug to not include polling model
      strictEqual(
        metadata.pollingStep.responseBody?.name,
        "ArmOperationStatusResourceProvisioningState"
      );

      assert.isUndefined(metadata.finalResponse);
    });
  });
});
