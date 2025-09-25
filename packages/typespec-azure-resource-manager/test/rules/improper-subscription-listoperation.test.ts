import { Tester } from "#test/tester.js";
import {
  LinterRuleTester,
  TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { improperSubscriptionListOperationRule } from "../../src/rules/improper-subscription-list-operation.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    improperSubscriptionListOperationRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("Emits a warning if a tenant or extension resource lists by subscription", async () => {
  await tester
    .expect(
      `
    @service(#{title: "Microsoft.Foo"})
    
    @armProviderNamespace
    namespace Microsoft.Foo;


    interface Operations extends Azure.ResourceManager.Operations {}

    @doc("Foo resource")
    @tenantResource
    model FooResource is ProxyResource<FooProperties> {
      @visibility(Lifecycle.Read)
      @doc("The name of the all properties resource.")
      @key("foo")
      @segment("foo")
      @path
      name: string;
    }

    @armResourceOperations(FooResource)
    interface FooResources extends ResourceRead<FooResource> {
      op listBySubscription is ArmListBySubscription<FooResource>;
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
      code: "@azure-tools/typespec-azure-resource-manager/improper-subscription-list-operation",
      message: "Tenant and Extension resources should not define a list by subscription operation.",
    });
});
