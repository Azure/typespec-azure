import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { patchOperationsRule } from "../../src/rules/arm-resource-patch.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    patchOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Requires PATCH to be a proper subset of resource for model references", async () => {
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

      model MyBadPatch {
        blah?: string;
        blahdeeblah?: string;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(...ResourceInstanceParameters<FooResource>, @bodyRoot body: MyBadPatch) : ArmResponse<FooResource> | ErrorResponse;
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
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
      message:
        "Resource PATCH models must be a subset of the resource type. The following properties: [blah, blahdeeblah] do not exist in resource Model 'FooResource'.",
    });
});

it("Requires PATCH to be a proper subset of resource for model spread", async () => {
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

      model MyBadPatch {
        ...ManagedServiceIdentityProperty;
        ...Foundations.ArmTagsProperty;

        blah?: string;
        blahdeeblah?: string;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(...ResourceInstanceParameters<FooResource>, ...MyBadPatch) : ArmResponse<FooResource> | ErrorResponse;
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
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
      message:
        "Resource PATCH models must be a subset of the resource type. The following properties: [blah, blahdeeblah] do not exist in resource Model 'FooResource'.",
    });
});

it("emit diagnostic when there is no request body", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<FooProperties> {
        @key("foo")
        @segment("foo")
        @path
        name: string;
        ...ManagedServiceIdentityProperty;
        ...ManagedByProperty;
        ...ResourceSkuProperty;
        ...ResourcePlanProperty;
      }

      model MyPatchModel {
        properties: FooUpdateProperties;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>,ResourceCreate<FooResource> ,ResourceDelete<FooResource>{
          @autoRoute
          @armResourceUpdate(FooResource)
          #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
          @patch(#{implicitOptionality: true}) 
          op update(...ResourceInstanceParameters<FooResource>
          ):TrackedResource<FooResource> | ErrorResponse;
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

      model FooUpdateProperties {
        extra?: string ;
      }

    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
      message: "The request body of a PATCH must be a model with a subset of resource properties",
    });
});

it("emits requiredInPatch when a PATCH body property is required", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<FooProperties> {
        @key("foo") @segment("foo") @path
        name: string;
      }

      model MyPatch {
        tags?: Record<string>;
        displayName: string;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         @patch(#{implicitOptionality: true}) myFooUpdate(...ResourceInstanceParameters<FooResource>, @bodyRoot body: MyPatch) : ArmResponse<FooResource> | ErrorResponse;
        }

       enum ResourceState { Succeeded, Canceled, Failed }
       model FooProperties {
         displayName?: string;
         provisioningState: ResourceState;
       }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
      message:
        "Property 'displayName' is required in the PATCH body. PATCH body properties must all be optional so partial updates work.",
    });
});

it("emits missingMergePatch when PATCH operation is not derived from an ARM template and has no implicit optionality", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<FooProperties> {
        @key("foo") @segment("foo") @path
        name: string;
      }

      model MyPatch {
        tags?: Record<string>;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
          @autoRoute
          @armResourceUpdate(FooResource)
          @patch(#{implicitOptionality: false})
          myFooUpdate(...ResourceInstanceParameters<FooResource>, @bodyRoot body: MyPatch) : ArmResponse<FooResource> | ErrorResponse;
        }

       enum ResourceState { Succeeded, Canceled, Failed }
       model FooProperties {
         displayName?: string;
         provisioningState: ResourceState;
       }
    `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
      message:
        "PATCH operation 'myFooUpdate' must use '@patch(#{implicitOptionality: true})' or wrap its body in 'MergePatchUpdate<>' so that the generated wire format is application/merge-patch+json.",
    });
});

it("does not emit missingMergePatch for a PATCH operation derived from ArmResourcePatchAsync", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<FooProperties> {
        @key("foo") @segment("foo") @path
        name: string;
      }

      @armResourceOperations
      interface FooResources {
        update is ArmResourcePatchAsync<FooResource, FooProperties>;
      }

       enum ResourceState { Succeeded, Canceled, Failed }
       model FooProperties {
         displayName?: string;
         provisioningState: ResourceState;
       }
    `,
    )
    .toBeValid();
});
