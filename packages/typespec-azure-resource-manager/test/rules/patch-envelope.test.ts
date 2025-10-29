import { Tester } from "#test/tester.js";
import { paramMessage } from "@typespec/compiler";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { patchEnvelopePropertiesRules } from "../../src/rules/patch-envelope-properties.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    patchEnvelopePropertiesRules,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

async function expectUpdateEnvelopePropertiesResult(
  resourceName: string,
  propertyName: string,
  code: string,
) {
  await tester.expect(code).toEmitDiagnostics({
    code: "@azure-tools/typespec-azure-resource-manager/patch-envelope",
    message:
      paramMessage`The Resource PATCH request for resource '${"resourceName"}' is missing envelope properties:  [${"propertyName"}]. Since these properties are supported in the resource, they must also be updatable via PATCH.`(
        { resourceName: resourceName, propertyName: propertyName },
      ),
  });
}

it("emit diagnostic if identity property is missing", async () => {
  await expectUpdateEnvelopePropertiesResult(
    "FooResource",
    "identity, managedBy, plan, sku, tags",
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
          op update(...ResourceInstanceParameters<FooResource>,  
          @bodyRoot 
          properties: MyPatchModel):TrackedResource<FooResource> | ErrorResponse;
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
  );
});

it("emit diagnostic when there is no request body", async () => {
  await expectUpdateEnvelopePropertiesResult(
    "FooResource",
    "identity, managedBy, plan, sku, tags",
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
  );
});
