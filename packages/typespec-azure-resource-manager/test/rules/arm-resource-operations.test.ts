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

it.each(["FooSummary[]", "BarResource[]", "string[]", "string"])(
  "reports an invalid resource list value of %s",
  async (valueType) => {
    await tester
      .expect(
        `
        @armProviderNamespace
        namespace Microsoft.Foo;

        model FooResource is TrackedResource<{}> {
          ...ResourceNameParameter<FooResource>;
        }
        model FooSummary { name: string; }
        model BarResource is TrackedResource<{}> {
          ...ResourceNameParameter<BarResource>;
        }
        model FooListResult { @pageItems items: FooResource[]; value: ${valueType}; }

        @armResourceOperations
        interface FooResources {
          read is ArmResourceRead<FooResource>;
          /*target*/list is ArmListBySubscription<FooResource, Response = ArmResponse<FooListResult>>;
        }
        `,
      )
      .toEmitDiagnostics((result) => ({
        code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
        message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
        pos: result.pos.target.pos,
      }));
  },
);

it("validates list-only resource operations", async () => {
  const code = (itemType: string) => `
    @armProviderNamespace
    namespace Microsoft.Foo;

    model FooResource is TrackedResource<{}> {
      ...ResourceNameParameter<FooResource>;
    }
    model FooSummary { name: string; }
    model FooListResult { @pageItems value: ${itemType}[]; }

    @armResourceOperations
    interface FooResources {
      /*target*/list is ArmListBySubscription<FooResource, Response = ArmResponse<FooListResult>>;
    }
  `;

  await tester.expect(code("FooSummary")).toEmitDiagnostics((result) => ({
    code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
    message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
    pos: result.pos.target.pos,
  }));
  await tester.expect(code("FooResource")).toBeValid();
});

it("checks registered list operations at multiple scopes", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }
      model FooSummary { name: string; }
      model FooListResult { @pageItems value: FooSummary[]; }

      @armResourceOperations
      interface FooResources {
        listByParent is ArmResourceListByParent<FooResource>;
        /*target*/listBySubscription is ArmListBySubscription<FooResource, Response = ArmResponse<FooListResult>>;
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      pos: result.pos.target.pos,
    }));
});

it("accepts a resource list with an inherited value array", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }
      model BaseList { @pageItems value: FooResource[]; }
      model FooListResult extends BaseList {}

      @armResourceOperations
      interface FooResources {
        read is ArmResourceRead<FooResource>;
        list is ArmListBySubscription<FooResource, Response = ArmResponse<FooListResult>>;
      }
      `,
    )
    .toBeValid();
});

it("reports a resource list without a value array", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }
      model FooListResult { @pageItems items: FooResource[]; }

      @armResourceOperations
      interface FooResources {
        read is ArmResourceRead<FooResource>;
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

it("checks a 201 response when there is no 200 response", async () => {
  await tester
    .expect(
      `
      @armProviderNamespace
      namespace Microsoft.Foo;

      model FooResource is TrackedResource<{}> {
        ...ResourceNameParameter<FooResource>;
      }
      model FooSummary { name: string; }
      model FooListResult { @pageItems value: FooSummary[]; }

      @armResourceOperations
      interface FooResources {
        read is ArmResourceRead<FooResource>;
        /*target*/list is ArmListBySubscription<FooResource, Response = ArmCreatedResponse<FooListResult>>;
      }
      `,
    )
    .toEmitDiagnostics((result) => ({
      code: "@azure-tools/typespec-azure-resource-manager/arm-resource-operation-response",
      message: "[RPC 008]: PUT, GET, PATCH & LIST must return the same resource schema.",
      pos: result.pos.target.pos,
    }));
});
