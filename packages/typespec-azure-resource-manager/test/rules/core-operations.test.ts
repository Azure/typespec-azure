import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";

import { coreOperationsRule } from "../../src/rules/core-operations.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    coreOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostics if missing armResourceOperation decorators.", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Foo;
        
        model FooResource is TrackedResource<{}> {
          @key("foo") @segment("foo") @path
          name: string;
        }

        @armResourceOperations
        interface FooResources extends ResourceCollectionOperations<FooResource> {
          @put createOrUpdate( ...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<FooResource> | ErrorResponse;
          @get get(...ResourceInstanceParameters<FooResource>): ArmResponse<FooResource> | ErrorResponse;
          @patch(#{implicitOptionality: true}) update(...ResourceInstanceParameters<FooResource>, @bodyRoot properties: Foundations.ResourceUpdateModel<FooResource, {}>): ArmResponse<FooResource> | ErrorResponse;
          @delete delete(...ResourceInstanceParameters<FooResource>): | ArmDeletedResponse | ArmDeleteAcceptedResponse | ArmDeletedNoContentResponse | ErrorResponse;
          @post action(...ResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
        }
      `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
        message: "Resource PUT operation must be decorated with @armResourceCreateOrUpdate.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
        message:
          "Resource GET operation must be decorated with @armResourceRead or @armResourceList.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
        message: "Resource PATCH operation must be decorated with @armResourceUpdate.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
        message: "Resource DELETE operation must be decorated with @armResourceDelete.",
      },
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
        message:
          "Resource POST operation must be decorated with @armResourceAction or @armResourceCollectionAction.",
      },
    ]);
});

it("doesn't emit diagnostic for internal operations", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    namespace Microsoft.Foo;

    model VmSize {
      cpus: int32;
    }

    @armResourceOperations
    interface ProviderOperations {
      @get
      getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
    }
    `,
    )
    .toBeValid();
});

it("Detects operations outside interfaces", async () => {
  await tester
    .expect(
      `
          @armProviderNamespace
          namespace Microsoft.Foo;
    
          @route("/foo")
          @armResourceRead(FooResource)
          @get op getFoos(...ApiVersionParameter) : FooResource;
    
          model FooResource is TrackedResource<FooProperties> {
            @visibility(Lifecycle.Read)
            @key("foo")
            @segment("foo")
            @path
            name: string;
            ...ManagedServiceIdentityProperty;
          }
    
          @armResourceOperations
          interface FooResources
            extends TrackedResourceOperations<FooResource, FooProperties> {
            }
    
            enum ResourceState {
             Succeeded,
             Canceled,
             Failed
           }
    
           model FooProperties {
             displayName?: string = "default";
             provisioningState: ResourceState;
           }
        `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
      message: "All operations must be inside an interface declaration.",
    });
});

it("Detects missing api-version parameters", async () => {
  await tester
    .expect(
      `
        @armProviderNamespace
        namespace Microsoft.Foo;
  
        model FooResource is TrackedResource<FooProperties> {
          @visibility(Lifecycle.Read)
          @key("foo")
          @segment("foo")
          @path
          name: string;
          ...ManagedServiceIdentityProperty;
        }
        model MyResourceCommonParameters<TResource extends {}> {
          ...SubscriptionIdParameter;
          ...ResourceGroupParameter;
          ...ProviderNamespace<TResource>;
        }
  
        model MyResourceInstanceParameters<TResource extends {}> {
          ...MyResourceCommonParameters<TResource>;
          ...KeysOf<TResource>;
        }
  
        @armResourceOperations
        #suppress "deprecated" "test"
        interface FooResources
          extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
            @armResourceAction(FooResource)
            @action @post myFooAction(...MyResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
          }
  
        enum ResourceState {
          Succeeded,
          Canceled,
          Failed
        }

        model FooProperties {
          displayName?: string = "default";
          provisioningState: ResourceState;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
      message:
        "All Resource operations must use an api-version parameter. Please include Azure.ResourceManager.ApiVersionParameter in the operation parameter list using the spread (...ApiVersionParameter) operator, or using one of the common resource parameter models.",
    });
});

describe("Provider operations", () => {
  function providerOperationSetup(operation: string = "", content: string = ""): string {
    return `
      @armProviderNamespace
      namespace Microsoft.Foo;
  
      model Employee is TrackedResource<EmployeeProperties> {
        ...ResourceNameParameter<Employee>;
      }
  
      model EmployeeProperties {
        @visibility(Lifecycle.Read)
        provisioningState?: ProvisioningState;
      }
  
      union ProvisioningState {
        string,
        Succeeded: "Succeeded",
        Failed: "Failed",
        Canceled: "Canceled",
      }

      op ComputeProviderActionAsync<
        Request extends {} | void = void,
        Response extends {} | void = void,
        Parameters extends {} = {},
      > is ArmProviderActionAsync<Request, Response, TenantActionScope, Parameters>;
       
      ${content}

      interface Operations extends Azure.ResourceManager.Operations {}

      interface VirtualMachinesOperations {
        ${operation}
      }
    `;
  }

  it("doesn't emit a diagnostic for provider operations", async () => {
    const content = providerOperationSetup(
      `
        @autoRoute
        @get
        @action("virtualMachines")
        listByLocation is ComputeProviderActionAsync<Response = ResourceListResult<Employee>>;
        `,
    );
    await tester.expect(content).toBeValid();
  });

  it("doesn't emit a diagnostic for provider operations with location", async () => {
    const content = providerOperationSetup(
      `
        @autoRoute
        @get
        @action("virtualMachinesGet")
        get is ComputeProviderActionAsync<Response = ResourceListResult<Employee>, Parameters = LocationParameter>;
        `,
    );
    await tester.expect(content).toBeValid();
  });

  it("emit diagnostic for provider operations if it has dynamic segments", async () => {
    const content = providerOperationSetup(
      `
        @autoRoute
        @get
        @action("virtualMachines")
        listByLocation is ComputeProviderActionAsync<
          Response = ResourceListResult<Employee>,
          Parameters = LocationParameter & MoveResponseParameter
        >; 
        `,
      ` 
        model MoveResponseParameter {
          /** The name of Azure region. */
          @path
          @minLength(1)
          @segment("moves")
          move: string;
        }
        `,
    );

    await tester.expect(content).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation",
      message:
        "Resource GET operation must be decorated with @armResourceRead or @armResourceList.",
    });
  });
});
