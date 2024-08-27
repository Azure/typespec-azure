import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { patchOperationsRule } from "../../src/rules/arm-resource-patch.js";

describe("typespec-azure-resource-manager: core operations rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      patchOperationsRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("Requires PATCH to be a proper subset of resource for model references", async () => {
    await tester
      .expect(
        `
    @service({title: "Microsoft.Foo"})
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

      @doc("Foo resource")
      model FooResource is TrackedResource<FooProperties> {
        @visibility("read")
        @doc("The name of the all properties resource.")
        @key("foo")
        @segment("foo")
        @path
        name: string;
        ...ManagedServiceIdentityProperty;
      }

      #suppress "@azure-tools/typespec-azure-resource-manager/patch-envelope" "Testing"
      @doc("A bad patch")
      model MyBadPatch {
        @doc("Blah?")
        blah?: string;
        @doc("Blahdeeblah?")
        blahdeeblah?: string;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @doc("Updates my Foos")
         @armResourceUpdate(FooResource)
         @patch myFooUpdate(...ResourceInstanceParameters<FooResource>, @doc("The body") @bodyRoot body: MyBadPatch) : ArmResponse<FooResource> | ErrorResponse;
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
    `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "Resource PATCH models must be a subset of the resource type. The following properties: [blah, blahdeeblah] do not exist in resource Model 'FooResource'.",
      });
  });

  it("Requires PATCH to be a proper subset of resource for model spread", async () => {
    await tester
      .expect(
        `
    @service({title: "Microsoft.Foo"})
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

      @doc("Foo resource")
      model FooResource is TrackedResource<FooProperties> {
        @visibility("read")
        @doc("The name of the all properties resource.")
        @key("foo")
        @segment("foo")
        @path
        name: string;
        ...ManagedServiceIdentityProperty;
      }

      #suppress "@azure-tools/typespec-azure-resource-manager/patch-envelope" "Testing"
      @doc("A bad patch")
      model MyBadPatch {
        ...ManagedServiceIdentityProperty;
        ...Foundations.ArmTagsProperty;

        @doc("Blah?")
        blah?: string;
        @doc("Blahdeeblah?")
        blahdeeblah?: string;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @doc("Updates my Foos")
         @armResourceUpdate(FooResource)
         @patch myFooUpdate(...ResourceInstanceParameters<FooResource>, ...MyBadPatch) : ArmResponse<FooResource> | ErrorResponse;
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
    `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "Resource PATCH models must be a subset of the resource type. The following properties: [blah, blahdeeblah] do not exist in resource Model 'FooResource'.",
      });
  });

  it("emit diagnostic when there is no request body", async () => {
    await tester
      .expect(
        `
      @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
      @armProviderNamespace
      namespace Microsoft.Foo;

      interface Operations extends Azure.ResourceManager.Operations {}

      @doc("Foo resource")
      model FooResource is TrackedResource<FooProperties> {
        @doc("The name of the all properties resource.")
        @key("foo")
        @segment("foo")
        @path
        name: string;
        ...ManagedServiceIdentityProperty;
        ...ManagedByProperty;
        ...ResourceSkuProperty;
        ...ResourcePlanProperty;
      }

      @doc("Patch model")
      model MyPatchModel {
        @doc("The properties")
        properties: FooUpdateProperties;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>,ResourceCreate<FooResource> ,ResourceDelete<FooResource>{
          @autoRoute
          @doc("Update a {name}", FooResource)
          @armResourceUpdate(FooResource)
          @patch 
          op update(...ResourceInstanceParameters<FooResource>
          ):TrackedResource<FooResource> | ErrorResponse;
      }

      @doc("The state of the resource")
        enum ResourceState {
         @doc(".") Succeeded,
         @doc(".") Canceled,
         @doc(".") Failed
       }

       @doc("Foo properties")
       model FooProperties {
         @doc("Name of the resource")
         displayName?: string = "default";
         @doc("The provisioning State")
         provisioningState: ResourceState;
       }

      @doc("Foo update properties")
      model FooUpdateProperties {
        @doc("Name of the resource")
        extra?: string ;
      }

    `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message: "The request body of a PATCH must be a model with a subset of resource properties",
      });
  });
});
