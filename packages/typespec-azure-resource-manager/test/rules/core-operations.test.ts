import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { coreOperationsRule } from "../../src/rules/core-operations.js";

describe("typespec-azure-resource-manager: core operations rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
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
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
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
          @patch update(...ResourceInstanceParameters<FooResource>, @bodyRoot properties: Foundations.ResourceUpdateModel<FooResource, {}>): ArmResponse<FooResource> | ErrorResponse;
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
    @service(#{title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Foo;
    enum Versions {
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("The VM Size")
      model VmSize {
        @doc("number of cpus ")
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

  it("doesn't emit a diagnostic for armprovideroperation as it doesn't have a resource", async () => {
    await tester
      .expect(
        `
    @armProviderNamespace
    @service(#{title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Foo;
    enum Versions {
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v5)
        "2021-10-01-preview",
      }

    model Employee is TrackedResource<EmployeeProperties> {
      ...ResourceNameParameter<Employee>;
    }

    model EmployeeProperties {
      @visibility(Lifecycle.Read)
      provisioningState?: ProvisioningState;
    }

    union ProvisioningState {
      string,
      @doc(".") Succeeded: "Succeeded",
      @doc(".") Failed: "Failed",
      @doc(".") Canceled: "Canceled",
    }

    op ComputeProviderActionAsync<
      Request extends {} | void = void,
      Response extends {} | void = void
    > is ArmProviderActionAsync<Request, Response>;

    interface Operations extends Azure.ResourceManager.Operations {}

    #suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-interface-requires-decorator"
    interface VirtualMachinesOperations {
      @autoRoute
      @get
      @action("virtualMachines")
      listByLocation is ComputeProviderActionAsync<Response = ResourceListResult<Employee>>;
    }
    `,
      )
      .toBeValid();
  });

  it("Detects operations outside interfaces", async () => {
    await tester
      .expect(
        `
          @service(#{title: "Microsoft.Foo"})
          @versioned(Versions)
          @armProviderNamespace
          namespace Microsoft.Foo;
    
          @doc(".")
          enum Versions {
            @doc(".")
            @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
            @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
            v2021_09_21: "2022-09-21-preview",
            @doc(".")
            @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
            @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
            v2022_01_10: "2022-01-10-alpha.1"
          }
    
          interface Operations extends Azure.ResourceManager.Operations {}
    
          @route("/foo")
          @doc("get all the foos")
          @armResourceRead(FooResource)
          @get op getFoos(...ApiVersionParameter) : FooResource;
    
          @doc("Foo resource")
          model FooResource is TrackedResource<FooProperties> {
            @visibility(Lifecycle.Read)
            @doc("The name of the all properties resource.")
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
    
            @doc("The state of the resource")
            enum ResourceState {
             @doc(".") Succeeded,
             @doc(".") Canceled,
             @doc(".") Failed
           }
    
           @doc("The foo properties.")
           model FooProperties {
             @doc("Name of the resource")
             displayName?: string = "default";
             @doc("The provisioning State")
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
        @service(#{title: "Microsoft.Foo"})
        @versioned(Versions)
        @armProviderNamespace
        namespace Microsoft.Foo;
    
          @doc(".")
          enum Versions {
            @doc(".")
            @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
            @useDependency(Azure.Core.Versions.v1_0_Preview_1)
            @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
            v2021_09_21: "2022-09-21-preview",
            @doc(".")
            @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
            @useDependency(Azure.Core.Versions.v1_0_Preview_1)
            @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v4)
            v2022_01_10: "2022-01-10-alpha.1"
          }
    
          interface Operations extends Azure.ResourceManager.Operations {}
    
          @doc("Foo resource")
          model FooResource is TrackedResource<FooProperties> {
            @visibility(Lifecycle.Read)
            @doc("The name of the all properties resource.")
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
              @doc("Posts my Foos")
              @armResourceAction(FooResource)
              @action @post myFooAction(...MyResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
            }
    
            @doc("The state of the resource")
            enum ResourceState {
             @doc(".") Succeeded,
             @doc(".") Canceled,
             @doc(".") Failed
           }
    
           @doc("Foo resource")
           model FooProperties {
             @doc("Name of the resource")
             displayName?: string = "default";
             @doc("The provisioning State")
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
});
