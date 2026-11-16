import {
  FinalStateValue,
  getLroMetadata,
  isLroMarkedForEmitter,
} from "@azure-tools/typespec-azure-core";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
import { createTCGCContext, getMarkAsLro } from "../../src/index.js";
import { UsageFlags } from "../../src/interfaces.js";
import {
  ArmTesterWithService,
  AzureCoreTester,
  createSdkContextForTester,
  SimpleTester,
} from "../tester.js";

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

  const context = await createSdkContextForTester(program);
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
  strictEqual(getLroMetadata(program, metadata.__raw.operation), undefined);
  strictEqual(responseType.usage & UsageFlags.Output, UsageFlags.Output);
  strictEqual(
    responseType.usage &
      (UsageFlags.LroInitial | UsageFlags.LroPolling | UsageFlags.LroFinalEnvelope),
    0,
  );
});

it("warns when a native LRO is marked as LRO", async () => {
  const diagnostics = await AzureCoreTester.diagnose(`
    @service namespace TestService;
    alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
    @resource("jobs") model Job { @key name: string; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro
    op start is Operations.LongRunningResourceCreateOrReplace<Job>;
  `);
  expectDiagnostics(diagnostics, {
    code: "@azure-tools/typespec-client-generator-core/mark-as-lro-ineffective",
  });
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
    emitterName: "@azure-typespec/typespec-csharp",
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

it.each([
  ["all emitters", "", true, true],
  ["AutoRest", '("autorest")', true, false],
  ["excluding AutoRest", '("!autorest")', false, true],
  ["typed options", '(#{ scope: "autorest, python" })', true, true],
])("publishes the %s marker using TCGC scope semantics", async (_, scope, autorest, python) => {
  const { program } = await SimpleTester.compile(`
    @service namespace TestService {
      model Response { value: string; }
      @Azure.ClientGenerator.Core.Legacy.markAsLro${scope}
      @route("/marked") @post op marked(): Response;
      @route("/plain") @post op plain(): Response;
    }
  `);
  const service = program.getGlobalNamespaceType().namespaces.get("TestService")!;
  const marked = service.operations.get("marked")!;
  const plain = service.operations.get("plain")!;
  for (const [emitter, expected] of [
    ["@azure-tools/typespec-autorest", autorest],
    ["@azure-tools/typespec-python", python],
  ] as const) {
    const context = createTCGCContext(program, emitter, { mutateNamespace: false });
    strictEqual(isLroMarkedForEmitter(program, marked, emitter), expected);
    strictEqual(isLroMarkedForEmitter(program, marked, emitter), getMarkAsLro(context, marked));
    strictEqual(isLroMarkedForEmitter(program, plain, emitter), false);
  }
});

it.each([
  ["AutoRest", '("autorest")', undefined],
  [
    "Python",
    '("python")',
    "Synchronous PATCH operations must have only 200 and default responses.",
  ],
])("resolves the %s marker for the ARM rule without emission", async (_, scope, expected) => {
  const [, diagnostics] = await ArmTesterWithService.compileAndDiagnose(
    `
      model Ok { @statusCode code: 200; @body value: string; }
      model Accepted { @statusCode code: 202; }
      @Azure.ClientGenerator.Core.Legacy.markAsLro${scope}
      @route("/legacy") @patch op update(): Ok | Accepted | ErrorResponse;
    `,
    {
      compilerOptions: {
        noEmit: true,
        linterRuleSet: {
          enable: {
            "@azure-tools/typespec-azure-resource-manager/arm-patch-operation-response-codes": true,
          },
        },
      },
    },
  );
  const warnings = diagnostics.filter(
    (diagnostic) =>
      diagnostic.code ===
      "@azure-tools/typespec-azure-resource-manager/arm-patch-operation-response-codes",
  );
  strictEqual(warnings.length, expected === undefined ? 0 : 1);
  strictEqual(warnings[0]?.message, expected);
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

  const context = await createSdkContextForTester(program);
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

it("should work with ArmResourceRead", async () => {
  const { program } = await ArmTesterWithService.compile(`
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

  const context = await createSdkContextForTester(program);
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
  const { program } = await ArmTesterWithService.compile(`
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

  const context = await createSdkContextForTester(program);
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
