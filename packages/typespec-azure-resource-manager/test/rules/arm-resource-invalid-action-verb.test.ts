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
    @service(#{title: "Microsoft.Foo"})
    @versioned(Versions)
    @armProviderNamespace
    namespace Microsoft.Foo;

      @doc(".")
      enum Versions {
        @doc(".")
              @armCommonTypesVersion(Azure.ResourceManager.CommonTypes.Versions.v3)
        v2021_09_21: "2022-09-21-preview",
        @doc(".")
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

      @armResourceOperations
      #suppress "deprecated" "test"
      interface FooResources
        extends ResourceCreate<FooResource>,ResourceDelete<FooResource> {
          @doc("Gets my Foos")
          @armResourceRead(FooResource)
          @action @delete deleteFooAction(...ResourceInstanceParameters<FooResource>) : ArmResponse<FooResource> | ErrorResponse;
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
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-invalid-action-verb",
      message: "Actions must be HTTP Post or Get operations.",
    });
});

it("Allows get actions for provider actions", async () => {
  await tester
    .expect(
      `
    @armProviderNamespace
    @service(#{title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Foo;
    enum Versions {
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
    @service(#{title: "Microsoft.Foo"})
    @versioned(Versions)
    namespace Microsoft.Foo;
    enum Versions {
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
        @post
        @armResourceList(VmSize)
        getVmsSizes is ArmProviderActionSync<void, VmSize, SubscriptionActionScope>;
      }
    `,
    )
    .toBeValid();
});
