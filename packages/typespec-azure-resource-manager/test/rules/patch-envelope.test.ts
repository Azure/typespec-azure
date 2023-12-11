import { paramMessage } from "@typespec/compiler";
import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { patchEnvelopePropertiesRules } from "../../src/rules/patch-envelope-properties.js";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

describe("typespec-azure-resource-manager: patch identity should be present in the update request body", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      patchEnvelopePropertiesRules,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  async function expectUpdateEnvelopePropertiesResult(
    resourceName: string,
    propertyName: string,
    code: string
  ) {
    await tester.expect(code).toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/patch-envelope",
      message:
        paramMessage`The Resource PATCH request for resource '${"resourceName"}' is missing envelope properties:  [${"propertyName"}]. Since these properties are supported in the resource, they must also be updatable via PATCH.`(
          { resourceName: resourceName, propertyName: propertyName }
        ),
    });
  }

  it("emit diagnostic if identity property is missing", async () => {
    await expectUpdateEnvelopePropertiesResult(
      "FooResource",
      "identity, managedBy, plan, sku, tags",
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
        ...ManagedServiceIdentity;
        ...ManagedBy;
        ...ResourceSku;
        ...ResourcePlan;
      }

      @doc("Patch model")
      model MyPatchModel {
        @doc("The properties")
        properties: FooUpdateProperties;
      }

      @armResourceOperations
      interface FooResources
        extends ResourceRead<FooResource>,ResourceCreate<FooResource> ,ResourceDelete<FooResource>{
          @autoRoute
          @doc("Update a {name}", FooResource)
          @armResourceUpdate(FooResource)
          @patch 
          op update(...ResourceInstanceParameters<FooResource>,  
          @doc("The resource properties to be updated.")
          @body 
          properties: MyPatchModel):TrackedResource<FooResource> | ErrorResponse;
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
    );
  });

  it("emit diagnostic when there is no request body", async () => {
    await expectUpdateEnvelopePropertiesResult(
      "FooResource",
      "identity, managedBy, plan, sku, tags",
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
        ...ManagedServiceIdentity;
        ...ManagedBy;
        ...ResourceSku;
        ...ResourcePlan;
      }

      @doc("Patch model")
      model MyPatchModel {
        @doc("The properties")
        properties: FooUpdateProperties;
      }

      @armResourceOperations
      interface FooResources
        extends ResourceRead<FooResource>,ResourceCreate<FooResource> ,ResourceDelete<FooResource>{
          #suppress "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-patch-model" "Test"
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
    );
  });
});
