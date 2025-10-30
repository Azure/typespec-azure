import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourceInvalidActionVerbRule } from "../../src/rules/arm-resource-invalid-action-verb.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourceInvalidActionVerbRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Detects non-post/non-get actions", async () => {
  await tester
    .expect(
      `
      @service
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

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceCreate<FooResource>,ResourceDelete<FooResource> {
        @armResourceRead(FooResource)
        @action @delete deleteFooAction(...ResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
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
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-action-verb",
      message: "Actions must be HTTP Post or Get operations.",
    });
});

it("Allows get actions for provider actions", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service
      namespace Microsoft.Foo;

      model VmSize {
        cpus: int32;
      }

      @armResourceOperations
      interface ProviderOperations {
        @get
        @armResourceList(VmSize)
        getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
      }
    `,
    )
    .toBeValid();
});

it("Allows post actions for any provider", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      @service
      namespace Microsoft.Foo;

      model VmSize {
        cpus: int32;
      }

      @armResourceOperations
      interface ProviderOperations {
        @post
        @armResourceList(VmSize)
        getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
      }
    `,
    )
    .toBeValid();
});
