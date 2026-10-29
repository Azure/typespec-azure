import { FinalStateValue, getLroMetadata, isLroDeclared } from "@azure-tools/typespec-azure-core";
import type { Namespace } from "@typespec/compiler";
import { unsafe_mutateSubgraphWithNamespace, unsafe_Realm } from "@typespec/compiler/experimental";
import { expectDiagnostics } from "@typespec/compiler/testing";
import { getAllHttpServices } from "@typespec/http";
import { getVersioningMutators } from "@typespec/versioning";
import { ok, strictEqual } from "assert";
import { it } from "vitest";
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

const armGetLroRule = "@azure-tools/typespec-azure-resource-manager/no-get-lro";

it.each([
  [undefined, 1],
  ['"autorest"', 1],
  ['"csharp"', 0],
  ['"!autorest"', 0],
  ['#{ scope: "autorest" }', 1],
] as const)(
  "enforces accepted ARM GET declarations for AutoRest scope %s",
  async (scope, count) => {
    const [{ program }, diagnostics] = await ArmTesterWithService.compileAndDiagnose(
      `
    model Employee is TrackedResource<{}> { ...ResourceNameParameter<Employee>; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro${scope === undefined ? "" : `(${scope})`}
    op read is ArmResourceRead<Employee>;
  `,
      { compilerOptions: { linterRuleSet: { enable: { [armGetLroRule]: true } } } },
    );
    expectDiagnostics(
      diagnostics,
      Array.from({ length: count }, () => ({
        code: armGetLroRule,
        message:
          "GET operations must not be explicitly declared long-running. Remove the LRO declaration; polling responses do not need an LRO declaration.",
      })),
    );
    const operation = getAllHttpServices(program)[0][0].operations[0].operation;
    strictEqual(isLroDeclared(program, operation, "@azure-tools/typespec-autorest"), count === 1);
  },
);

it("preserves the declaration through cloning and version mutation without capturing source types", async () => {
  const { program } = await ArmTesterWithService.compile(`
    model Employee is TrackedResource<{}> { ...ResourceNameParameter<Employee>; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro
    op read is ArmResourceRead<Employee>;
  `);
  const service = getAllHttpServices(program)[0][0];
  const operation = service.operations[0].operation;
  const clone = new unsafe_Realm(program, "LRO declaration clone").clone(operation);
  strictEqual(isLroDeclared(program, clone, "@azure-tools/typespec-autorest"), true);
  const versions = getVersioningMutators(program, service.namespace);
  strictEqual(versions?.kind, "versioned");
  if (versions?.kind !== "versioned") return;
  const mutated = unsafe_mutateSubgraphWithNamespace(
    program,
    [versions.snapshots[0].mutator],
    service.namespace,
  ).type as Namespace;
  const mutatedOperation = mutated.operations.get("read")!;
  strictEqual(isLroDeclared(program, mutatedOperation, "@azure-tools/typespec-autorest"), true);
  strictEqual(isLroDeclared(program, mutatedOperation, "@azure-typespec/typespec-csharp"), true);
});

it("publishes no declaration when a marker is invalid or ineffective", async () => {
  const [{ program }, diagnostics] = await AzureCoreTester.compileAndDiagnose(`
    @service namespace Test;
    @Azure.ClientGenerator.Core.Legacy.markAsLro
    @get @route("/primitive") op primitive(): string;
    alias Operations = ResourceOperations<NoConditionalRequests & NoRepeatableRequests & NoClientRequestId>;
    @resource("jobs") model Job { @key name: string; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro
    op start is Operations.LongRunningResourceCreateOrReplace<Job>;
  `);
  expectDiagnostics(diagnostics, [
    { code: "@azure-tools/typespec-client-generator-core/invalid-mark-as-lro-target" },
    { code: "@azure-tools/typespec-client-generator-core/mark-as-lro-ineffective" },
  ]);
  for (const operation of getAllHttpServices(program)[0][0].operations) {
    strictEqual(
      isLroDeclared(program, operation.operation, "@azure-tools/typespec-autorest"),
      false,
    );
  }
});

it("keeps live positive and negative scopes when declarations are repeated", async () => {
  const { program } = await ArmTesterWithService.compile(`
    model Employee is TrackedResource<{}> { ...ResourceNameParameter<Employee>; }
    @Azure.ClientGenerator.Core.Legacy.markAsLro("autorest")
    @Azure.ClientGenerator.Core.Legacy.markAsLro("csharp")
    op read is ArmResourceRead<Employee>;
  `);
  const operation = getAllHttpServices(program)[0][0].operations[0].operation;
  strictEqual(isLroDeclared(program, operation, "@azure-tools/typespec-autorest"), true);
  strictEqual(isLroDeclared(program, operation, "@azure-typespec/typespec-csharp"), true);
  strictEqual(isLroDeclared(program, operation, "@azure-tools/typespec-java"), false);
});
