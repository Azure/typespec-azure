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

it("emits requiredInPatch diagnostic when a PATCH body property is required", async () => {
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

      model MyPatch {
        tags: Record<string>;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(...ResourceInstanceParameters<FooResource>, @bodyRoot body: MyPatch) : ArmResponse<FooResource> | ErrorResponse;
        }

       enum ResourceState {
         Succeeded,
         Canceled,
         Failed
       }

       model FooProperties {
         displayName?: string;
         provisioningState: ResourceState;
       }
    `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "Property 'tags' is required in the PATCH request body. PATCH request body properties must all be optional so partial updates work.",
      },
    ]);
});

it("emits defaultInPatch diagnostic when a PATCH body property has a default value", async () => {
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
      }

      model MyPatch {
        tags?: Record<string> = #{};
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(...ResourceInstanceParameters<FooResource>, @bodyRoot body: MyPatch) : ArmResponse<FooResource> | ErrorResponse;
        }

       enum ResourceState {
         Succeeded,
         Canceled,
         Failed
       }

       model FooProperties {
         provisioningState?: ResourceState;
       }
    `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "Property 'tags' has a default value in the PATCH request body. PATCH request body properties that are not present in the request body leave the value unchanged; they do not result in any default value being assigned.",
      },
    ]);
});

it("does not emit notUpdateableInPatch when a PATCH body property is read-only (Lifecycle.Read only) on the resource", async () => {
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
      }

      model FooProperties {
        @visibility(Lifecycle.Read)
        readOnlyProp?: string;

        displayName?: string;
      }

      model MyPatch {
        ...FooProperties;
        tags?: Record<string>;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(...ResourceInstanceParameters<FooResource>, @bodyRoot body: MyPatch) : ArmResponse<FooResource> | ErrorResponse;
        }
    `,
    )
    .toBeValid();
});

it("emits notUpdateableInPatch diagnostic when a PATCH body property is not updateable (e.g. Lifecycle.Create only) on the resource", async () => {
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
      }

      model FooProperties {
        @visibility(Lifecycle.Create)
        createOnlyProp?: string;

        displayName?: string;
      }

      model MyPatch {
        ...FooProperties;
        tags?: Record<string>;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(...ResourceInstanceParameters<FooResource>, @bodyRoot body: MyPatch) : ArmResponse<FooResource> | ErrorResponse;
        }
    `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "Property 'createOnlyProp' is in the PATCH request body but is not updateable on the resource (e.g. it has '@visibility(Lifecycle.Create)' which excludes 'Lifecycle.Update'); it cannot be updated and must be removed from the PATCH request model.",
      },
    ]);
});

it("emits nonMergePatchContentType diagnostic when content-type is not merge-patch+json", async () => {
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
      }

      model FooProperties {
        displayName?: string;
      }

      model MyPatch {
        tags?: Record<string>;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(
           ...ResourceInstanceParameters<FooResource>,
           @header("content-type") contentType: "application/xml",
           @bodyRoot body: MyPatch,
         ) : ArmResponse<FooResource> | ErrorResponse;
        }
    `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "PATCH operation 'myFooUpdate' specifies a content-type other than 'application/merge-patch+json'.",
      },
    ]);
});

it("does not emit nonMergePatchContentType when content-type is application/merge-patch+json", async () => {
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
      }

      model FooProperties {
        displayName?: string;
      }

      model MyPatch {
        tags?: Record<string>;
      }

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceRead<FooResource>, ResourceCreate<FooResource>, ResourceDelete<FooResource> {
         @armResourceUpdate(FooResource)
         #suppress "@typespec/http/deprecated-implicit-optionality" "For test"
         @patch(#{implicitOptionality: true}) myFooUpdate(
           ...ResourceInstanceParameters<FooResource>,
           @header("content-type") contentType: "application/merge-patch+json",
           @bodyRoot body: MyPatch,
         ) : ArmResponse<FooResource> | ErrorResponse;
        }
    `,
    )
    .toBeValid();
});
