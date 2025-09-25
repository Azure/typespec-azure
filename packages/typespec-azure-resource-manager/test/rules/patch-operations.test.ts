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
