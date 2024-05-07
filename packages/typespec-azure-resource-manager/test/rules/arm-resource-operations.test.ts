import {
  BasicTestRunner,
  LinterRuleTester,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, describe, it } from "vitest";
import { createAzureResourceManagerTestRunner } from "../test-host.js";

import { armResourceOperationsRule } from "../../src/rules/arm-resource-operation-response.js";

describe("typespec-azure-resource-manager: arm resource operations rule", () => {
  let runner: BasicTestRunner;
  let tester: LinterRuleTester;

  beforeEach(async () => {
    runner = await createAzureResourceManagerTestRunner();
    tester = createLinterRuleTester(
      runner,
      armResourceOperationsRule,
      "@azure-tools/typespec-azure-resource-manager"
    );
  });

  it("emits diagnostics if response type is different from resource type.", async () => {
    await tester
      .expect(
        `
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          @key("foo") @segment("foo") @path
          name: string;
        }

        model BarResource is TrackedResource<{}> {
          @key("bar") @segment("bar") @path
          name: string;
        }

        @armResourceOperations
        interface FooResources {
          @get @armResourceRead(FooResource) get(@key("foo") name: string): ArmResponse<BarResource> | ErrorResponse;
          @put @armResourceCreateOrUpdate(FooResource) create(...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<FooResource> | ErrorResponse;
          @get @armResourceList(FooResource) listBySubscription(...Foundations.SubscriptionScope<FooResource>): ArmResponse<ResourceListResult<FooResource>> | ErrorResponse;
        }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
        message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      });
  });

  it("emits diagnostics if response type of create operation is different from resource type.", async () => {
    await tester
      .expect(
        `
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          @key("foo") @segment("foo") @path
          name: string;
        }

        model BarResource is TrackedResource<{}> {
          @key("bar") @segment("bar") @path
          name: string;
        }

        @armResourceOperations
        interface FooResources {
          @put @armResourceCreateOrUpdate(FooResource) create(...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<BarResource> | ErrorResponse;
        }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
        message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      });
  });

  it("emits diagnostics if response type of list operation is different from resource type.", async () => {
    await tester
      .expect(
        `
        @useDependency(Azure.ResourceManager.Versions.v1_0_Preview_1)
        @armProviderNamespace
        namespace Microsoft.Foo;
        
        model FooResource is TrackedResource<{}> {
          @key("foo") @segment("foo") @path
          name: string;
        }

        model BarResource is TrackedResource<{}> {
          @key("bar") @segment("bar") @path
          name: string;
        }

        @armResourceOperations
        interface FooResources {
          @get @armResourceList(FooResource) listBySubscription(...Foundations.SubscriptionScope<FooResource>): ArmResponse<ResourceListResult<BarResource>> | ErrorResponse;
        }
      `
      )
      .toEmitDiagnostics({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
        message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      });
  });
});
