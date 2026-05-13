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
          "Property 'tags' is required in the PATCH request body. PATCH request body properties must all be optional or readOnly.",
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
          "Property 'createOnlyProp' is in the PATCH request body but is not updateable on the resource. Make this property updateable on the resource or remove it from the PATCH request.",
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
          "PATCH operation 'myFooUpdate' specifies a content-type 'application/xml' other than 'application/merge-patch+json'.",
      },
    ]);
});

it("emits nonMergePatchContentType diagnostic with the offending content-type for text/plain", async () => {
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
           @header("content-type") contentType: "text/plain",
           @bodyRoot body: MyPatch,
         ) : ArmResponse<FooResource> | ErrorResponse;
        }
    `,
    )
    .toEmitDiagnostics([
      {
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-patch",
        message:
          "PATCH operation 'myFooUpdate' specifies a content-type 'text/plain' other than 'application/merge-patch+json'.",
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

it("emits notUpdateableInPatch when a PATCH body property has visibility (Lifecycle.Create, Lifecycle.Read) on the resource", async () => {
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
        @visibility(Lifecycle.Create, Lifecycle.Read)
        createReadProp?: string;

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
          "Property 'createReadProp' is in the PATCH request body but is not updateable on the resource. Make this property updateable on the resource or remove it from the PATCH request.",
      },
    ]);
});

it("does not emit requiredInPatch when a required PATCH body property maps back to a resource property with visibility Lifecycle.Read by itself", async () => {
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
        readOnlyRequired: string;

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

it("emits notUpdateableInPatch recursively into nested model properties", async () => {
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

      model NestedProps {
        @visibility(Lifecycle.Create)
        createOnlyNested?: string;

        otherNested?: string;
      }

      model FooProperties {
        nested?: NestedProps;

        displayName?: string;
      }

      model MyPatch {
        nested?: NestedProps;
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
          "Property 'nested' is in the PATCH request body but is not updateable on the resource. Make this property updateable on the resource or remove it from the PATCH request.",
      },
    ]);
});

it("emits notUpdateableInPatch recursively into Record<Model> property value types", async () => {
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

      model NestedProps {
        @visibility(Lifecycle.Create)
        createOnlyNested?: string;

        otherNested?: string;
      }

      model FooProperties {
        items?: Record<NestedProps>;

        displayName?: string;
      }

      model MyPatch {
        items?: Record<NestedProps>;
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
          "Property 'items' is in the PATCH request body but is not updateable on the resource. Make this property updateable on the resource or remove it from the PATCH request.",
      },
    ]);
});

it("does not infinite-loop on cyclic model graphs in the recursive notUpdateableInPatch check", async () => {
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

      model NodeA {
        b?: NodeB;
        value?: string;
      }

      model NodeB {
        a?: NodeA;
        value?: string;
      }

      model FooProperties {
        graph?: NodeA;

        displayName?: string;
      }

      model MyPatch {
        graph?: NodeA;
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

it("does not emit notUpdateableInPatch for default-visibility properties (no @visibility decorator)", async () => {
  // Default lifecycle visibility for a property with no @visibility decorator
  // includes both Lifecycle.Create and Lifecycle.Update (in fact, all members
  // of the Lifecycle enum), so such properties are allowed in PATCH bodies.
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
        defaultVisProp?: string;
        anotherDefault?: int32;
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

it("does not emit notUpdateableInPatch for explicit @visibility(Lifecycle.Create, Lifecycle.Update) properties", async () => {
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
        @visibility(Lifecycle.Create, Lifecycle.Update)
        createUpdateProp?: string;

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

it("applies the make-patch-property-optional codefix to a required PATCH body property", async () => {
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

       model FooProperties {
         displayName?: string;
       }
    `,
    )
    .applyCodeFix("make-patch-property-optional").toEqual(`
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

       model FooProperties {
         displayName?: string;
       }
    `);
});

it("applies the remove-patch-property-default codefix to a PATCH body property with a default value", async () => {
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
        displayName?: string = "default";
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

       model FooProperties {
         displayName?: string;
       }
    `,
    )
    .applyCodeFix("remove-patch-property-default").toEqual(`
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
        displayName?: string;
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

       model FooProperties {
         displayName?: string;
       }
    `);
});

it("applies the remove-patch-property codefix to a non-updateable PATCH body property", async () => {
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
    .applyCodeFix("remove-patch-property").toEqual(`
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<FooProperties> {
        @key("foo")
        @segment("foo")
        @path
        name: string;
      }

      model FooProperties {

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
    `);
});

it("does not emit notUpdateableInPatch for @visibility(Lifecycle.Update)-only properties", async () => {
  // Per the visibility rubric, a property is allowed in the PATCH body if its
  // visibility includes Lifecycle.Update — even when Lifecycle.Update is the
  // only modifier applied.
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
        @visibility(Lifecycle.Update)
        updateOnlyProp?: string;

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

it("does not emit notUpdateableInPatch for @visibility(Lifecycle.Read, Lifecycle.Update) properties (Read+Update without Create)", async () => {
  // Per the visibility rubric, a property whose visibility includes
  // Lifecycle.Read but not Lifecycle.Create is allowed in PATCH bodies. Here
  // Lifecycle.Update is also present, so the property is updateable.
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
        @visibility(Lifecycle.Read, Lifecycle.Update)
        readUpdateProp?: string;

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
