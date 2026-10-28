import { Tester } from "#test/tester.js";
import {
  type LinterRuleTester,
  type TesterInstance,
  createLinterRuleTester,
} from "@typespec/compiler/testing";
import { beforeEach, it } from "vitest";

import { armResourceOperationsRule } from "../../src/rules/arm-resource-operation-response.js";

let runner: TesterInstance;
let tester: LinterRuleTester;

beforeEach(async () => {
  runner = await Tester.createInstance();
  tester = createLinterRuleTester(
    runner,
    armResourceOperationsRule,
    "@azure-tools/typespec-azure-resource-manager",
  );
});

it("emits diagnostics if response type is different from resource type.", async () => {
  await tester
    .expect(
      `
              @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model BarResource is TrackedResource<{}> {
          ...ResourceNameParameter<BarResource>;
        }

        @armResourceOperations
        interface FooResources {
          @get @armResourceRead(FooResource) get(@key("foo") name: string): ArmResponse<BarResource> | ErrorResponse;
          @put @armResourceCreateOrUpdate(FooResource) create(...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<FooResource> | ErrorResponse;
          @get @armResourceList(FooResource) listBySubscription(...Foundations.SubscriptionScope<FooResource>): ArmResponse<ResourceListResult<FooResource>> | ErrorResponse;
        }
      `,
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
              @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model BarResource is TrackedResource<{}> {
          ...ResourceNameParameter<BarResource>;
        }

        @armResourceOperations
        interface FooResources {
          @put @armResourceCreateOrUpdate(FooResource) create(...ResourceInstanceParameters<FooResource>, @bodyRoot resource: FooResource): ArmResponse<FooResource> | ArmCreatedResponse<BarResource> | ErrorResponse;
        }
      `,
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
              @armProviderNamespace
        namespace Microsoft.Foo;
        
        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model BarResource is TrackedResource<{}> {
          ...ResourceNameParameter<BarResource>;
        }

        @armResourceOperations
        interface FooResources {
          @get @armResourceList(FooResource) listBySubscription(...Foundations.SubscriptionScope<FooResource>): ArmResponse<ResourceListResult<BarResource>> | ErrorResponse;
        }
      `,
    )
    .toEmitDiagnostics({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    });
});

it.each([
  { response: "ArmResponse<FooListResult>", item: "FooSummary" },
  { response: "FooListResult", item: "FooSummary" },
  { response: "ArmResponse<FooListResult>", item: "string" },
])("reports $item list items in $response", async ({ response, item }) => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }

      model FooSummary {
        name: string;
      }

      model FooListResult {
        @pageItems
        value: ${item}[];
        @nextLink
        nextLink?: string;
      }

      @armResourceOperations
      interface FooResources {
        read is ArmResourceRead<FooResource>;
        /*target*/list is ArmListBySubscription<FooResource, Response = ${response}>;
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      pos: result.pos.target.pos,
    }));
});

it("reports mismatched list items inherited from a custom envelope", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }

      model FooSummary {
        name: string;
      }

      model ListBase {
        @pageItems
        value: FooSummary[];
      }

      model FooListResult extends ListBase {
        @nextLink
        nextLink?: string;
      }

      @armResourceOperations
      interface FooResources {
        /*target*/list is ArmListBySubscription<FooResource, Response = ArmResponse<FooListResult>>;
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      pos: result.pos.target.pos,
    }));
});

it.each(["FooResource", "{ ...FooResource }"])(
  "accepts matching %s items in a custom list envelope",
  async (item) => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }

        model ListBase {
          @pageItems
          value: ${item}[];
        }

        model FooListResult extends ListBase {
          @nextLink
          nextLink?: string;
        }

        @armResourceOperations
        interface FooResources {
          list is ArmListBySubscription<FooResource, Response = ArmResponse<FooListResult>>;
        }
        `,
      )
      .toBeValid();
  },
);

it.each([
  "ArmResponse<FooListResult<FooResource> | FooListResult<FooSummary>>",
  "FooListResult<FooResource> | FooListResult<FooSummary>",
])("reports mismatched items in union response %s once", async (response) => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }

      model FooSummary {
        name: string;
      }

      model FooListResult<T> {
        value: T[];
        nextLink?: string;
      }

      @armResourceOperations
      interface FooResources {
        /*target*/@route("/subscriptions/{subscriptionId}/providers/Microsoft.Foo/fooResources")
        @get
        @armResourceList(FooResource)
        list(@path subscriptionId: string): ${response} | ErrorResponse;
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      pos: result.pos.target.pos,
    }));
});
