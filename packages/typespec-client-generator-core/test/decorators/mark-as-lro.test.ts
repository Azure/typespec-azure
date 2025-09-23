import { FinalStateValue } from "@azure-tools/typespec-azure-core";
import { AzureCoreTestLibrary } from "@azure-tools/typespec-azure-core/testing";
import { AzureResourceManagerTestLibrary } from "@azure-tools/typespec-azure-resource-manager/testing";
import { OpenAPITestLibrary } from "@typespec/openapi/testing";
import { ok, strictEqual } from "assert";
import { beforeEach, it } from "vitest";
import { SdkTestRunner, createSdkTestRunner } from "../test-host.js";

let basicRunner: SdkTestRunner;

beforeEach(async () => {
  basicRunner = await createSdkTestRunner({
    emitterName: "@azure-tools/typespec-csharp",
  });
});

it("should mark regular operation as LRO when decorated with @markAsLro", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model DeploymentResult {
          id: string;
          status: "InProgress" | "Succeeded" | "Failed";
          location?: string;
        }

        model DeploymentConfig {
          name: string;
          template: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/deployments/{deploymentId}")
        @post
        op startDeployment(
          @path deploymentId: string,
          @body config: DeploymentConfig
        ): DeploymentResult;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "lro");
  strictEqual(method.name, "startDeployment");

  // Check LRO metadata exists
  const metadata = method.lroMetadata;
  ok(metadata);
  strictEqual(metadata.finalStateVia, FinalStateValue.originalUri);

  // Check that the response model is properly set
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "model");
  strictEqual(responseType.name, "DeploymentResult");
});

it("should apply @markAsLro with language scope", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model ProcessingResponse {
          jobId: string;
          status: string;
        }

        model ProcessingRequest {
          data: string;
        }

        @Azure.ClientGenerator.Core.Legacy.markAsLro("csharp")
        @route("/process")
        @post
        op processData(@body request: ProcessingRequest): ProcessingResponse;
      }
    `);

  strictEqual(basicRunner.context.sdkPackage.models.length, 2);
  const processingResponse = basicRunner.context.sdkPackage.models.find(
    (m) => m.name === "ProcessingResponse",
  );
  ok(processingResponse);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "lro");
  strictEqual(method.name, "processData");

  const metadata = method.lroMetadata;
  ok(metadata);
  strictEqual(metadata.envelopeResult, processingResponse);
  strictEqual(metadata.finalResponse?.envelopeResult, processingResponse);
  strictEqual(metadata.finalResponse?.result, processingResponse);
  ok(!metadata.finalResponse?.resultSegments);
});

it("should warn when @markAsLro is applied to operation not returning model", async () => {
  const diagnostics = await basicRunner.diagnose(`
      @service
      namespace TestService {
        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/simple")
        @post
        op simpleOperation(): string;
      }
    `);

  strictEqual(diagnostics.length, 1);
  strictEqual(
    diagnostics[0].code,
    "@azure-tools/typespec-client-generator-core/invalid-mark-as-lro-target",
  );
});

it("should work with complex model return types", async () => {
  await basicRunner.compile(`
      @service
      namespace TestService {
        model BaseResult {
          id: string;
          timestamp: utcDateTime;
        }

        model ComplexResult extends BaseResult {
          status: "Running" | "Completed" | "Failed";
          progress: int32;
          details?: {
            message: string;
            code?: int32;
          };
        }

        model RequestModel {
          name: string;
          options?: {
            timeout?: int32;
            priority?: "Low" | "Normal" | "High";
          };
        }

        @Azure.ClientGenerator.Core.Legacy.markAsLro
        @route("/complex")
        @post
        op complexOperation(@body request: RequestModel): ComplexResult;
      }
    `);

  const methods = basicRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "lro");
  strictEqual(method.name, "complexOperation");

  const metadata = method.lroMetadata;
  ok(metadata);

  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "model");
  strictEqual(responseType.name, "ComplexResult");
});

it("should work with ArmResourceRead", async () => {
  const armRunner = await createSdkTestRunner({
    librariesToAdd: [AzureResourceManagerTestLibrary, AzureCoreTestLibrary, OpenAPITestLibrary],
    autoUsings: ["Azure.ResourceManager", "Azure.Core"],
    emitterName: "@azure-tools/typespec-python",
  });
  await armRunner.compileWithBuiltInAzureResourceManagerService(`
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
      model EmployeeProperties {
        name: string;
      }
      @Azure.ClientGenerator.Core.Legacy.markAsLro
      op getProductionSiteDeploymentStatus is ArmResourceRead<
      Employee
    >;
    `);

  const methods = armRunner.context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);
  const method = methods[0];
  strictEqual(method.kind, "lro");
  strictEqual(method.name, "getProductionSiteDeploymentStatus");

  const metadata = method.lroMetadata;
  ok(metadata);
  strictEqual(metadata.finalStateVia, FinalStateValue.originalUri);
  strictEqual(method.response.type?.kind, "model");
  strictEqual(method.response.type?.name, "Employee");
  strictEqual(metadata.envelopeResult?.name, "Employee");
  strictEqual(metadata.finalResponse?.envelopeResult?.name, "Employee");
  strictEqual(metadata.finalResponse?.result?.name, "Employee");
  ok(!metadata.finalResponse?.resultSegments);
});
