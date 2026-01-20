import { FinalStateValue } from "@azure-tools/typespec-azure-core";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { ArmServiceTester, createSdkContextForTester, SimpleTester } from "../tester.js";

it("should mark regular operation as LRO when decorated with @markAsLro", async () => {
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);

  const method = methods[0];
  strictEqual(method.kind, "lro");
  strictEqual(method.name, "startDeployment");

  // Check LRO metadata exists
  const metadata = method.lroMetadata;
  ok(metadata);
  strictEqual(metadata.finalStateVia, FinalStateValue.location);

  // Check that the response model is properly set
  const responseType = method.response.type;
  ok(responseType);
  strictEqual(responseType.kind, "model");
  strictEqual(responseType.name, "DeploymentResult");
});

it("should apply @markAsLro with language scope", async () => {
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  strictEqual(context.sdkPackage.models.length, 2);
  const processingResponse = context.sdkPackage.models.find((m) => m.name === "ProcessingResponse");
  ok(processingResponse);

  const methods = context.sdkPackage.clients[0].methods;
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
  const diagnostics = await SimpleTester.diagnose(`
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
  const { program } = await SimpleTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-csharp",
  });
  const methods = context.sdkPackage.clients[0].methods;
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

it("should work with ArmResourceRead", { timeout: 30000 }, async () => {
  const { program } = await ArmServiceTester.compile(`
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

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);
  const method = methods[0];
  strictEqual(method.kind, "lro");
  strictEqual(method.name, "getProductionSiteDeploymentStatus");

  const metadata = method.lroMetadata;
  ok(metadata);
  strictEqual(metadata.finalStateVia, FinalStateValue.location);
  strictEqual(method.response.type?.kind, "model");
  strictEqual(method.response.type?.name, "Employee");
  strictEqual(metadata.envelopeResult?.name, "Employee");
  strictEqual(metadata.finalResponse?.envelopeResult?.name, "Employee");
  strictEqual(metadata.finalResponse?.result?.name, "Employee");
  ok(!metadata.finalResponse?.resultSegments);
});

it("Extension.Read", async () => {
  const { program } = await ArmServiceTester.compile(`
    /** A ContosoProviderHub resource */
    model Employee is TrackedResource<{}> {
      ...ResourceNameParameter<Employee>;
    }
    @Azure.ClientGenerator.Core.Legacy.markAsLro
    op get is Extension.Read<
      Extension.ScopeParameter,
      Employee,
      Response = ArmResponse<Employee> | ArmAcceptedResponse,
      Error = ErrorResponse
    >;
    `);

  const context = await createSdkContextForTester(program, {
    emitterName: "@azure-tools/typespec-python",
  });
  const methods = context.sdkPackage.clients[0].methods;
  strictEqual(methods.length, 1);
  const method = methods[0];
  strictEqual(method.kind, "lro");
  strictEqual(method.name, "get");

  const metadata = method.lroMetadata;
  ok(metadata);
  strictEqual(metadata.finalStateVia, FinalStateValue.location);
  strictEqual(method.response.type?.kind, "model");
  strictEqual(method.response.type?.name, "Employee");
  strictEqual(metadata.envelopeResult?.name, "Employee");
  strictEqual(metadata.finalResponse?.envelopeResult?.name, "Employee");
  strictEqual(metadata.finalResponse?.result?.name, "Employee");
  ok(!metadata.finalResponse?.resultSegments);
});
